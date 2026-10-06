-- Additive: no existing account, room, or score data is changed.
create table public.player_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('bug', 'player', 'feedback')),
  subject text not null check (char_length(subject) between 5 and 120),
  description text not null check (char_length(description) between 20 and 3000),
  game_name text check (char_length(game_name) <= 100),
  room_code text check (room_code ~ '^[A-Z2-9]{6}$'),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  constraint report_resolution_consistent check (
    (status = 'open' and resolved_at is null and resolved_by is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);
alter table public.player_reports enable row level security;
-- All access goes through authenticated server routes with explicit role checks.
revoke all on public.player_reports from public, anon, authenticated;
grant select, insert, update, delete on public.player_reports to service_role;
create index player_reports_status_created_idx on public.player_reports(status, created_at desc);
create index player_reports_reporter_created_idx on public.player_reports(reporter_id, created_at desc);

create function public.submit_player_report(
  p_reporter uuid, p_kind text, p_subject text, p_description text,
  p_game_name text default null, p_room_code text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare report_id uuid;
begin
  -- Serializes submissions per account across processes, so concurrent requests
  -- cannot bypass the rolling hourly limit. The caller is service_role only.
  perform pg_advisory_xact_lock(hashtextextended(p_reporter::text, 712004));
  if p_reporter is null then raise exception 'reporter_required'; end if;
  if (select count(*) from public.player_reports where reporter_id = p_reporter
      and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'report_rate_limit';
  end if;
  insert into public.player_reports(reporter_id, kind, subject, description, game_name, room_code)
    values (p_reporter, p_kind, btrim(p_subject), btrim(p_description), nullif(btrim(p_game_name), ''), nullif(upper(btrim(p_room_code)), ''))
    returning id into report_id;
  return report_id;
end;
$$;
revoke all on function public.submit_player_report(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_player_report(uuid, text, text, text, text, text) to service_role;
-- Admin-only aggregate reporting. No account emails or individual answers are returned.
create index if not exists rooms_created_at_idx on public.rooms(created_at);
create index if not exists match_history_played_at_idx on public.match_history(played_at);
create index if not exists profiles_created_at_idx on public.profiles(created_at);
create or replace function public.admin_usage_report(since timestamptz)
returns jsonb language sql stable security invoker set search_path = public as $$
with room_window as (
  select game_id,status,created_at from public.rooms where created_at >= since
), result_window as (
  select game_id,profile_id,played_at from public.match_history where played_at >= since
), room_counts as (
  select game_id,count(*) total,count(*) filter(where status='finished') finished from room_window group by game_id
), result_counts as (
  select game_id,count(*) total from result_window group by game_id
), days as (
  select generate_series((since at time zone 'UTC')::date,(now() at time zone 'UTC')::date,interval '1 day')::date as day
), daily_rooms as (
  select (created_at at time zone 'UTC')::date as day,count(*) total from room_window group by 1
), daily_results as (
  select (played_at at time zone 'UTC')::date as day,count(*) total from result_window group by 1
)
select jsonb_build_object(
  'totalProfiles',(select count(*) from public.profiles),
  'newProfiles',(select count(*) from public.profiles where created_at >= since),
  'roomsCreated',(select count(*) from room_window),
  'roomsFinished',(select count(*) from room_window where status='finished'),
  'playerResults',(select count(*) from result_window),
  'activePlayers',(select count(distinct profile_id) from result_window),
  'games',coalesce((select jsonb_agg(row_to_json(g) order by g.rooms desc,g.name) from (
    select games.id,games.name,games.emoji,coalesce(rc.total,0) rooms,coalesce(rc.finished,0) finished,coalesce(mc.total,0) "playerResults"
    from public.games games left join room_counts rc on rc.game_id=games.id left join result_counts mc on mc.game_id=games.id
  ) g),'[]'::jsonb),
  'daily',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'rooms',coalesce(r.total,0),'playerResults',coalesce(m.total,0)) order by d.day)
    from days d left join daily_rooms r on r.day=d.day left join daily_results m on m.day=d.day),'[]'::jsonb)
);
$$;
revoke all on function public.admin_usage_report(timestamptz) from public,anon,authenticated;
grant execute on function public.admin_usage_report(timestamptz) to service_role;
