-- Reversible, additive multiplayer action serialization and atomic result recording.
-- Apply before deploying code which invokes these RPCs. No existing rows deleted.
create table if not exists public.room_action_locks (
  room_code text primary key,
  token uuid not null,
  expires_at timestamptz not null
);
alter table public.room_action_locks enable row level security;
revoke all on public.room_action_locks from anon, authenticated;

create or replace function public.claim_room_action(room_code text, action_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare claimed boolean;
begin
  insert into public.room_action_locks as locks (room_code, token, expires_at)
  values (upper(claim_room_action.room_code), action_token, clock_timestamp() + interval '120 seconds')
  on conflict on constraint room_action_locks_pkey do update set token = excluded.token, expires_at = excluded.expires_at
  where locks.expires_at < clock_timestamp()
  returning true into claimed;
  return coalesce(claimed, false);
end $$;

create or replace function public.release_room_action(room_code text, action_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.room_action_locks where room_action_locks.room_code = upper(release_room_action.room_code)
  and token = action_token;
$$;

create or replace function public.finish_room_game(target_room_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  r public.rooms%rowtype;
  p record;
  prof public.profiles%rowtype;
  game_type text;
  winners uuid[];
  player_count integer;
  won boolean;
  next_streak integer;
begin
  select * into r from public.rooms where id = target_room_id for update;
  if not found or r.status <> 'playing' then return false; end if;
  select count(*) into player_count from public.room_players where room_id = r.id;
  if player_count = 0 then raise exception 'No players in room'; end if;
  select array_agg(profile_id) into winners from public.room_players
    where room_id = r.id and score = (select max(score) from public.room_players where room_id = r.id);
  select type into game_type from public.games where id = r.game_id;
  -- Stable lock order prevents deadlocks when the same players finish different rooms together.
  for p in select * from public.room_players where room_id = r.id order by profile_id loop
    select * into prof from public.profiles where id = p.profile_id for update;
    won := player_count > 1 and p.profile_id = any(winners);
    next_streak := case when won then prof.current_streak + 1 when player_count > 1 then 0 else prof.current_streak end;
    insert into public.match_history(room_id, profile_id, game_id, score, won)
      values(r.id, p.profile_id, r.game_id, p.score, won);
    update public.profiles set games_played = games_played + 1,
      games_won = games_won + case when won then 1 else 0 end,
      total_points = total_points + p.score, current_streak = next_streak,
      best_streak = greatest(best_streak, next_streak) where id = p.profile_id;
    insert into public.profile_achievements(profile_id, achievement_id)
      select p.profile_id, a.id from public.achievements a where
        a.slug = 'first-game'
        or (a.slug = 'first-win' and won)
        or (a.slug = 'five-wins' and prof.games_won + case when won then 1 else 0 end >= 5)
        or (a.slug = 'streak-3' and next_streak >= 3)
        or (a.slug = 'night-owl' and prof.games_played + 1 >= 10)
        or (a.slug = 'perfect-game' and game_type = 'quiz' and p.score >= r.total_rounds and r.total_rounds >= 5)
      on conflict do nothing;
  end loop;
  if player_count >= 3 then
    insert into public.profile_achievements(profile_id, achievement_id)
      select r.host_id, id from public.achievements where slug = 'social' on conflict do nothing;
  end if;
  update public.rooms set status = 'finished', winner_ids = winners, round_phase = 'revealed' where id = r.id;
  return true;
end $$;

revoke all on function public.claim_room_action(text, uuid) from public, anon, authenticated;
revoke all on function public.release_room_action(text, uuid) from public, anon, authenticated;
revoke all on function public.finish_room_game(uuid) from public, anon, authenticated;
grant execute on function public.claim_room_action(text, uuid) to service_role;
grant execute on function public.release_room_action(text, uuid) to service_role;
grant execute on function public.finish_room_game(uuid) to service_role;

-- Rollback after reverting application code:
-- drop function public.finish_room_game(uuid);
-- drop function public.release_room_action(text, uuid);
-- drop function public.claim_room_action(text, uuid);
-- drop table public.room_action_locks;
-- Boundary: lease is longer than every route's 30s deployment execution limit.
-- Self-hosted runtimes must enforce the same hard request limit; a process paused
-- beyond 120s must be terminated before it can resume writes. Otherwise use fully
-- transactional RPC game transitions with fencing rather than expiring leases.
