-- Apply with the secure room snapshot release, never while old clients are active.
-- No player/room/content rows are modified. Service-role server endpoints remain authorized.
begin;
drop policy if exists "prompts readable" on public.prompts;
drop policy if exists "rooms readable" on public.rooms;
drop policy if exists "room_players readable" on public.room_players;
drop policy if exists "round_answers readable" on public.round_answers;
-- Admin prompt editor remains authorized through existing "prompts admin write".
-- All room reads are now server snapshots that authenticate membership and redact secrets.
-- Prevent self-service score/stat edits while preserving username changes.
revoke update on public.profiles from authenticated, anon;
grant update(username) on public.profiles to authenticated;
commit;

-- Rollback only with the previous app release (reopens historical answer visibility):
-- create policy "prompts readable" on public.prompts for select using (auth.uid() is not null);
-- create policy "rooms readable" on public.rooms for select using (auth.uid() is not null);
-- create policy "room_players readable" on public.room_players for select using (auth.uid() is not null);
-- create policy "round_answers readable" on public.round_answers for select using (auth.uid() is not null);
-- grant update on public.profiles to authenticated;
