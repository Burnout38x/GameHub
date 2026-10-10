-- Fortress Feud (real-time lane battles) and one combined Truth or Dare.
-- Additive and safe to rerun. Deploy application code before activating Fortress Feud.

alter table public.games drop constraint if exists games_type_check;
alter table public.games add constraint games_type_check check (type in ('quiz','prompt','memory','guess','predict','code','rule','chain','market','solo','battle'));
alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms add constraint rooms_mode_check check (mode in ('classic','spotlight','duel','coop'));

insert into public.games(slug,name,description,emoji,type,config,is_active,sort_order) values
('fortress-feud','Fortress Feud','Fortify your keep with gold, pour elixir into troops and storm three lanes. Duel a friend, team up against the Machine, or conquer twelve solo missions.','🏰','battle','{}',false,5)
on conflict(slug) do nothing;

-- Best campaign result per player and mission. Written only by the verified-replay API.
create table if not exists public.fortress_campaign (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission integer not null check (mission between 1 and 12),
  stars integer not null check (stars between 1 and 3),
  best_seconds integer not null check (best_seconds between 0 and 600),
  wins integer not null default 1 check (wins >= 1),
  updated_at timestamptz not null default now(),
  primary key (profile_id, mission)
);
alter table public.fortress_campaign enable row level security;
revoke all on public.fortress_campaign from public, anon, authenticated;
grant all on public.fortress_campaign to service_role;

-- Points reward progress (new stars), not repeat farming of easy missions.
create or replace function public.record_fortress_victory(actor_id uuid, mission_id integer, earned_stars integer, seconds integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare prof public.profiles%rowtype; game uuid; previous integer; points integer;
begin
  if earned_stars not between 1 and 3 or mission_id not between 1 and 12 or seconds not between 0 and 600 then raise exception 'Invalid result'; end if;
  select * into prof from public.profiles where id=actor_id for update;
  if not found then raise exception 'Player not found'; end if;
  select id into game from public.games where slug='fortress-feud' and is_active;
  if game is null then raise exception 'Fortress Feud is not available'; end if;
  if (select count(*) from public.match_history where profile_id=actor_id and game_id=game and played_at>now()-interval '1 hour')>=30 then
    raise exception 'Progress save limit reached. Try again in an hour';
  end if;
  select stars into previous from public.fortress_campaign where profile_id=actor_id and mission=mission_id;
  -- Replaying an old victory only bumps the win count: no points, games or achievements.
  if previous is not null and earned_stars <= previous then
    update public.fortress_campaign set wins=wins+1, best_seconds=least(best_seconds,seconds), updated_at=now()
      where profile_id=actor_id and mission=mission_id;
    return jsonb_build_object('stars',previous,'points',0,'improved',false);
  end if;
  points := (earned_stars - coalesce(previous, 0)) * 10 + 2;
  insert into public.fortress_campaign(profile_id,mission,stars,best_seconds) values(actor_id,mission_id,earned_stars,seconds)
  on conflict (profile_id,mission) do update set stars=greatest(public.fortress_campaign.stars,excluded.stars),
    best_seconds=least(public.fortress_campaign.best_seconds,excluded.best_seconds), wins=public.fortress_campaign.wins+1, updated_at=now();
  insert into public.match_history(room_id,profile_id,game_id,score,won) values(gen_random_uuid(),actor_id,game,points,false);
  update public.profiles set games_played=games_played+1,total_points=total_points+points where id=actor_id;
  insert into public.profile_achievements(profile_id,achievement_id)
    select actor_id,id from public.achievements where slug='first-game' or (slug='night-owl' and prof.games_played+1>=10)
    on conflict do nothing;
  return jsonb_build_object('stars',greatest(coalesce(previous,0),earned_stars),'points',points,'improved',earned_stars>coalesce(previous,0));
end $$;
revoke all on function public.record_fortress_victory(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.record_fortress_victory(uuid,integer,integer,integer) to service_role;

-- Commits a replay-verified battle result atomically. Winners are explicit because a
-- co-op loss has no winner even though both teammates share the same score.
create or replace function public.finish_battle_room(target_room_id uuid, expected_version integer, next_state jsonb, scores jsonb, winners uuid[])
returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.rooms%rowtype; p record; prof public.profiles%rowtype; player_count integer; won boolean; next_streak integer;
begin
  select * into r from public.rooms where id=target_room_id for update;
  if not found or r.status<>'playing' or not exists(select 1 from public.games where id=r.game_id and type='battle')
    or coalesce((r.round_state->>'version')::integer,-1)<>expected_version then return false; end if;
  select count(*) into player_count from public.room_players where room_id=r.id;
  for p in select * from public.room_players where room_id=r.id order by profile_id loop
    if not scores ? p.profile_id::text then raise exception 'Missing score'; end if;
    update public.room_players set score=(scores->>p.profile_id::text)::integer where id=p.id;
    select * into prof from public.profiles where id=p.profile_id for update;
    won := player_count > 1 and p.profile_id = any(winners);
    next_streak := case when won then prof.current_streak + 1 else 0 end;
    insert into public.match_history(room_id,profile_id,game_id,score,won) values(r.id,p.profile_id,r.game_id,(scores->>p.profile_id::text)::integer,won);
    update public.profiles set games_played=games_played+1, games_won=games_won+case when won then 1 else 0 end,
      total_points=total_points+(scores->>p.profile_id::text)::integer, current_streak=next_streak,
      best_streak=greatest(best_streak,next_streak) where id=p.profile_id;
    insert into public.profile_achievements(profile_id,achievement_id)
      select p.profile_id,a.id from public.achievements a where a.slug='first-game'
        or (a.slug='first-win' and won)
        or (a.slug='five-wins' and prof.games_won+case when won then 1 else 0 end>=5)
        or (a.slug='streak-3' and next_streak>=3)
        or (a.slug='night-owl' and prof.games_played+1>=10)
      on conflict do nothing;
  end loop;
  update public.rooms set status='finished', round_phase='revealed', winner_ids=coalesce(winners,'{}'), round_state=next_state where id=r.id;
  return true;
end $$;
revoke all on function public.finish_battle_room(uuid,integer,jsonb,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.finish_battle_room(uuid,integer,jsonb,jsonb,uuid[]) to service_role;

-- Battles are strictly two-player: friend invitations must respect the same cap as joins.
do $$
declare def text; patched text;
begin
  for def in select pg_get_functiondef(p.oid) from pg_proc p
    where p.pronamespace='public'::regnamespace and p.proname in ('player_social_action','player_social_dashboard') loop
    if position('''battle''' in def) = 0 then
      patched := replace(replace(def,
        'when type=''predict'' then 2', 'when type in (''predict'',''battle'') then 2'),
        'when g.type=''predict'' then 2', 'when g.type in (''predict'',''battle'') then 2');
      if patched = def then raise exception 'Social room caps changed shape; update this migration'; end if;
      execute patched;
    end if;
  end loop;
end $$;

-- Truth or Dare: one game, three vibes. Room difficulty picks the deck:
-- easy = Classic (everyone), hard = After Dark (18+), mixed = both decks.
do $$
declare classic uuid; dark uuid;
begin
  select id into classic from public.games where slug='truth-or-dare';
  if classic is null then raise exception 'Truth or Dare must exist before merging decks'; end if;
  select id into dark from public.games where slug='truth-or-dare-after-dark';
  if dark is not null and exists(select 1 from public.rooms where game_id=dark and status<>'finished') then
    raise exception 'Finish open After Dark rooms before merging';
  end if;
  -- Hard/Mixed now mean the adult deck: never change what an open classic room agreed to.
  if exists(select 1 from public.rooms where game_id=classic and status<>'finished') then
    raise exception 'Finish open Truth or Dare rooms before merging';
  end if;
  update public.prompts set difficulty='easy', content=content || jsonb_build_object(
      'kind', case when content->>'category' ilike 'dare%' then 'dare' else 'truth' end,
      'deck','classic', 'heat', case when difficulty='hard' then 'Deep' else 'Chill' end)
    where game_id=classic and not content ? 'deck';
  if dark is not null then
    update public.prompts set game_id=classic, difficulty='hard', content=content || jsonb_build_object(
        'kind', case when content->>'category' ilike 'dare%' then 'dare' else 'truth' end,
        'deck','after-dark', 'heat', case when difficulty='hard' then 'Bold' else 'Flirty' end)
      where game_id=dark;
    update public.games set is_active=false where id=dark;
  end if;
  update public.games set name='Truth or Dare', emoji='😈',
    description='Pick truth or dare on your turn. Choose a vibe: Classic for everyone, After Dark for adults, or mix both decks. Dares score double.',
    config='{"choices":["Completed","Skipped"],"scoreChoice":"Completed","pickTruthOrDare":true}'::jsonb
    where id=classic;
end $$;
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: What is a small thing someone did for you this year that you still think about?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: What is a small thing someone did for you this year that you still think about?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: Which app would be most embarrassing for everyone to see your screen time on?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: Which app would be most embarrassing for everyone to see your screen time on?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: What is the most childish thing you still do?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: What is the most childish thing you still do?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: If you could swap lives with another player for a day, who would it be and why?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: If you could swap lives with another player for a day, who would it be and why?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: What is a skill you pretend to have but really do not?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: What is a skill you pretend to have but really do not?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: What was your most awkward moment on a video call?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: What was your most awkward moment on a video call?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: What is the weirdest food combination you secretly enjoy?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: What is the weirdest food combination you secretly enjoy?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Truth: Which recent message made you laugh out loud?", "category": "Truth", "kind": "truth", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Truth: Which recent message made you laugh out loud?');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Speak only in questions until your next turn.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Speak only in questions until your next turn.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Show the most recent emoji you used and act it out.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Show the most recent emoji you used and act it out.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Do your best runway walk across the room, with your own commentary.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Do your best runway walk across the room, with your own commentary.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Let the group choose a word you must sneak into your next three sentences.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Let the group choose a word you must sneak into your next three sentences.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Hold a plank for 30 seconds while everyone cheers you on.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Hold a plank for 30 seconds while everyone cheers you on.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Read your last sent text out loud in a movie-trailer voice.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Read your last sent text out loud in a movie-trailer voice.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Draw a portrait of another player in 30 seconds and show it.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Draw a portrait of another player in 30 seconds and show it.');
insert into public.prompts(game_id,difficulty,content) select g.id,'easy','{"text": "Dare: Tell a joke. If nobody laughs, tell another one.", "category": "Dare", "kind": "dare", "deck": "classic", "heat": "Chill"}'::jsonb from public.games g where g.slug='truth-or-dare' and not exists(select 1 from public.prompts p where p.game_id=g.id and p.content->>'text'='Dare: Tell a joke. If nobody laughs, tell another one.');

-- Rollback: deactivate fortress-feud; move deck='after-dark' prompts back to the After Dark
-- game and reactivate it. Campaign results and functions may remain.
