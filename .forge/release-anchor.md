GOAL: Push the verified GameHub update and coordinate its database/app release only for Supabase project jnzbncbmcewsvtjjmddn, preserving existing users, rooms and scores.

DONE WHEN:
  1. Changes are committed and pushed to Burnout38x/GameHub with remote commit verification — PASS (`git ls-remote origin refs/heads/codex/gamehub-game-night-upgrade` -> 3c48825ea0162e7414d3f61a3a4fe65c06e2a198 refs/heads/codex/gamehub-game-night-upgrade)
  2. Only the confirmed live database receives the reviewed migrations; schema backup and data-preservation checks are recorded — NOT CHECKED
  3. Matching production app is healthy before privacy rules replace old-client reads, and production smoke/rollback status is recorded — BLOCKED (Vercel production success verified; generated URL requires SSO and repository homepage returns404; awaiting current live URL)

OUT: Other databases, destructive data resets, deleting existing users/rooms/scores, unrelated configuration changes.
RISK: Coordinated app/database release. Apply additive RPCs first, preserve active games, deploy app, then restrict direct reads. Keep previous public schema as rollback evidence. Do not leave privacy restrictions with only an older app deployed.
