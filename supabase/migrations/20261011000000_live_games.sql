-- Brain Bowl (sectioned trivia), What Would You Do? (dilemmas) and Whot! (Naija card game).
-- Additive and safe to rerun. Deploy the application code first: the games appear in the
-- library as soon as this runs.

alter table public.games drop constraint if exists games_type_check;
alter table public.games add constraint games_type_check check (type in ('quiz','prompt','memory','guess','predict','code','rule','chain','market','solo','battle','bowl','dilemma','whot'));

insert into public.games(slug,name,description,emoji,type,config,is_active,sort_order) values
('brain-bowl','Brain Bowl','A trivia championship in eight sections, from Science to Naija Know-How. Fastest right answers score most, streaks pay, and the final question counts double.','🏆','bowl','{}',true,1),
('what-would-you-do','What Would You Do?','Love, marriage, money, war, the apocalypse and more. Pick what you would really do, then read the room or guess your friend in the hot seat.','🤔','dilemma','{}',true,2),
('whot','Whot!','The Naija card classic. Hold On, Pick Two, Suspension, General Market and Whot calls. Play friends online or take on the Machine.','🃏','whot','{}',true,3)
on conflict(slug) do nothing;

-- Records a finished live game in one transaction, fenced on the state version the server read.
create or replace function public.finish_live_room(target_room_id uuid, expected_version integer, next_state jsonb, scores jsonb, winners uuid[])
returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.rooms%rowtype; p record; prof public.profiles%rowtype; player_count integer; won boolean; next_streak integer; final_score integer;
begin
  select * into r from public.rooms where id=target_room_id for update;
  if not found or r.status<>'playing' or not exists(select 1 from public.games where id=r.game_id and type in ('bowl','dilemma','whot'))
    or coalesce((r.round_state->>'version')::integer,-1)<>expected_version then return false; end if;
  select count(*) into player_count from public.room_players where room_id=r.id;
  for p in select * from public.room_players where room_id=r.id order by profile_id loop
    if not scores ? p.profile_id::text then raise exception 'Missing score'; end if;
    final_score := greatest(0, least(1000, (scores->>p.profile_id::text)::integer));
    update public.room_players set score=final_score where id=p.id;
    select * into prof from public.profiles where id=p.profile_id for update;
    won := player_count > 1 and p.profile_id = any(winners);
    next_streak := case when won then prof.current_streak + 1 when player_count > 1 then 0 else prof.current_streak end;
    insert into public.match_history(room_id,profile_id,game_id,score,won) values(r.id,p.profile_id,r.game_id,final_score,won);
    update public.profiles set games_played=games_played+1, games_won=games_won+case when won then 1 else 0 end,
      total_points=total_points+final_score, current_streak=next_streak,
      best_streak=greatest(best_streak,next_streak) where id=p.profile_id;
    insert into public.profile_achievements(profile_id,achievement_id)
      select p.profile_id,a.id from public.achievements a where a.slug='first-game'
        or (a.slug='first-win' and won)
        or (a.slug='five-wins' and prof.games_won+case when won then 1 else 0 end>=5)
        or (a.slug='streak-3' and next_streak>=3)
        or (a.slug='night-owl' and prof.games_played+1>=10)
      on conflict do nothing;
  end loop;
  if player_count >= 3 then
    insert into public.profile_achievements(profile_id,achievement_id)
      select r.host_id,id from public.achievements where slug='social' on conflict do nothing;
  end if;
  update public.rooms set status='finished', round_phase='revealed', winner_ids=coalesce(winners,'{}'), round_state=next_state where id=r.id;
  return true;
end $$;
revoke all on function public.finish_live_room(uuid,integer,jsonb,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.finish_live_room(uuid,integer,jsonb,jsonb,uuid[]) to service_role;

-- Whot! seats four: friend invitations must respect the same cap as joins.
do $$
declare def text; patched text;
begin
  for def in select pg_get_functiondef(p.oid) from pg_proc p
    where p.pronamespace='public'::regnamespace and p.proname in ('player_social_action','player_social_dashboard') loop
    if position('''whot''' in def) = 0 then
      patched := replace(replace(def,
        'when type=''market'' then 4', 'when type in (''market'',''whot'') then 4'),
        'when g.type=''market'' then 4', 'when g.type in (''market'',''whot'') then 4');
      if patched = def then raise exception 'Social room caps changed shape; update this migration'; end if;
      execute patched;
    end if;
  end loop;
end $$;

-- Rollback (after reverting the application code):
-- update public.games set is_active=false where slug in ('brain-bowl','what-would-you-do','whot');
-- drop function public.finish_live_room(uuid,integer,jsonb,jsonb,uuid[]);
