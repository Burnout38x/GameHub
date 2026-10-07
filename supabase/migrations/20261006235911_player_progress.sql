-- Private preferences; verified totals remain derived from completed match results.
create table public.player_progress_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  weekly_goal integer not null default 3 check (weekly_goal between 1 and 50)
);
alter table public.player_progress_settings enable row level security;
revoke all on public.player_progress_settings from public, anon, authenticated;
grant select, insert, update, delete on public.player_progress_settings to service_role;

create function public.player_progress_summary(target_profile_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with daily as (
    select (played_at at time zone 'UTC')::date as day, count(*) as games
    from public.match_history where profile_id = target_profile_id
    group by 1
  )
  select jsonb_build_object(
    'gamesPlayed', (select count(*) from public.match_history where profile_id = target_profile_id),
    'gamesWon', (select count(*) from public.match_history where profile_id = target_profile_id and won),
    'totalPoints', (select coalesce(sum(score), 0) from public.match_history where profile_id = target_profile_id),
    'currentWinStreak', coalesce((select current_streak from public.profiles where id = target_profile_id), 0),
    'bestWinStreak', coalesce((select best_streak from public.profiles where id = target_profile_id), 0),
    'weeklyGoal', coalesce((select weekly_goal from public.player_progress_settings where profile_id = target_profile_id), 3),
    'days', coalesce((select jsonb_agg(jsonb_build_object('date', day, 'games', games) order by day) from daily), '[]'::jsonb),
    'asOf', now()
  );
$$;
revoke all on function public.player_progress_summary(uuid) from public, anon, authenticated;
grant execute on function public.player_progress_summary(uuid) to service_role;
