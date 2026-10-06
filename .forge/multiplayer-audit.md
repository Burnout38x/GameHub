# Multiplayer audit — 2026-10-06

Scope: static read of every room API and all room rendering engines, schema, room creation/join and helpers. No live database writes or credentials inspected. This is audit evidence, not proof of executed gameplay. Anchor: `.forge/anchor.md`.

## Coverage and implemented rules

| Games | Engine / supported players | Current rule and end condition |
|---|---|---|
| Doctor Dash, Riddle Rush, Emoji Movie Guess, Movie Trivia, Mystery Card, Reverse Definition, Mental Math | quiz / 1–10 | Everyone answers, +1 correct; optional spotlight turns and deadline; reveal then advance through prompts. All seven use same engine. |
| Never Have I Ever | prompt / 1–10 | Everyone reacts, +1 “I Have”; optional spotlight. |
| Would You Rather | prompt / 1–10 | Everyone picks content choice; +1 each if 2+ all match. |
| Truth or Dare | prompt / 1–10 | One player per round; completed +1, skipped 0. |
| 2-Minute Challenge | prompt / 1–10 | One player per round; completed +1; client-local start/reset timer, not server-enforced. |
| Memory Match | memory / 1–10 | Flip two; matching pair +1 and keep turn, miss passes; all pairs ends game. |
| Number Guess Battle | guess / 1–10 | Secret integer, higher/lower; correct scores max(1,11−total round guesses); next secret until round limit. |
| Know Your Partner | predict / exactly 2 | Subject privately picks option, partner predicts for +1; roles alternate. |
| Who Remembers It Better | predict / exactly 2 | Both provide free text; exact/84%-similar normalized text +1 both; otherwise subject adjudicates. |
| Code Crackers | code / 1–10 | Unique 4/5/6-digit secret, exact/misplaced feedback, solve scores up to 10, 18 turns; 1–5 codes. |
| Rule Discoverer | rule / 2–10 | Test example or choose rule; correct +5, incorrect −1 floored at zero; 1–5 rules. |
| Word Association Chain | chain / 2–10 | Unique words +1; 3+ can challenge previous link and uninvolved players vote; timeout −1; fixed turn count ends. |

All 18 online game rows covered. Shared lifecycle: create authenticated room + host; lobby join by code/public listing; host starts; gameplay engine; final winner ties and lifetime stats; host creates rematch and others follow link. Reload rejoins existing membership. Explicit leave deletes membership, so rejoining after explicit leave while playing is intentionally rejected. No presence/disconnection recovery is implemented (`is_connected` never updated).

## Prioritized defects

1. **P1 hidden answers exposed.** `src/lib/server/rule-round.ts:20` puts the current rule ID last in public `usedRuleIds`; `start/route.ts:82` stores that state in rooms. `RoomClient.tsx:64` loads full quiz prompts including answer; memory faces are all in public state (`start/route.ts:49–58`). `schema.sql:192–200` permits every signed-in user to read prompts, rooms, players and round_answers, including private couple answers before partner submission and private rooms not joined. Concealing UI does not protect these values. Move secrets to protected storage, serve a sanitized member-aware snapshot, and supply safe RLS migration; test direct authenticated access, not only rendered text.
2. **P1 all multi-step mutations race.** Guess/memory/code/rule routes read state then write room solely by ID; duplicate concurrent requests can replace newer turns/rounds or double-apply points. Start (`start/route.ts:100`) can reset game after another request starts it. Answer's final reveal (`answer/route.ts:86`) lacks current-round guard, so delayed submit can reveal next round. Predict awards score before guarded reveal; free-text initial `answeredBy` write can overwrite a newer `decide`/`done` state (`predict/route.ts:143–150`). Chain scores before its optimistic write; simultaneous voters overwrite the same JSON votes (`chain/route.ts:87–97`). Use database transaction/room lock or versioned atomic operation including score and secrets; process-local locks alone do not protect multiple deployments. Test duplicate submissions and concurrent last answers/votes.
3. **P1 Word Chain challenge can be repeated to farm scores.** `chain/route.ts:132–163` allows the same unchanged word to be challenged after unsuccessful vote; resolution keeps word/turn and gives submitter +1 (`112–114`). Repeated failure can inflate points indefinitely. Successful challenges can also walk backward through old words in same turn. Track challenged turn/word; one challenge per turn. `ChainPlay.tsx:49` must mirror restriction.
4. **P1 leaving can strand a challenge.** `leave/route.ts:49–72` changes turn only; it never cancels/resolves active chain vote when its sole voter or either involved player leaves. With remaining >=2 the game stays playing, all submissions/timeouts reject active challenge, and no eligible voter may exist. Cancel challenge/reset deadline or resolve explicitly. Test 3-player vote then sole voter leaves.
5. **P1 departed answers can reveal too early.** `leave/route.ts:59–64` and `answer/route.ts:73` count all answers including departed users. In A/B/C, A+B answered, C not: A leaves; 2 answers >=2 remaining reveals and denies C. Filter by active player IDs and recalculate matching-choice bonus only for active participants.
6. **P1 profile scores user-editable.** `schema.sql:183–184` lets users update own whole profile; role trigger protects role only. A user can change games_won/points/streak directly, invalidating leaderboard. Restrict column grants or trigger protections; preserve permitted username change.
7. **P2 room capacity/start not atomic.** `join/route.ts:10–14,22` checks snapshot count then inserts: simultaneous join can exceed 2/10; join may insert after start snapshots players. Room creation ignores host insert error (`rooms/route.ts:72`), returning orphaned room. Validate whole creation/join under transaction or reviewed RPC, propagate failure/cleanup.
8. **P2 host leaves active room but host ownership persists.** `leave/route.ts:49–72` does not transfer host for remaining 2+; EndScreen only host can rematch (`EndScreen.tsx:87`). Transfer to oldest remaining participant; test leave→finish→rematch.
9. **P2 wrong advance endpoint corrupts chain.** `advance/route.ts:19–29` accepts expired chain deadline and marks revealed; next advance moves current_round but leaves chain turnIndex inconsistent. Restrict advance to quiz/prompt/predict (chain owns timeout endpoint).
10. **P2 malformed answer choices accepted.** `answer/route.ts:29–32` only validates string length; arbitrary quiz/prompt values accepted. WYR identical fabricated strings can earn shared bonus. Check against actual prompt/config options.
11. **P2 misleading unsupported solo start.** `Lobby.tsx:81–82` always enables “Start solo game”; rule/chain need 2 and predict exactly 2 on server. Show game-specific minimum, disable until met and explain need. Create form rounds stays `10` when switching code/rule/chain with no matching selected option; server silently caps code/rule to 5; normalize selection when game changes.
12. **P2 polling refresh races and sticky errors.** `RoomClient.tsx:48–68` allows overlapping snapshots and no generation guard, so older load can overwrite later. It ignores game/player/answer errors, sets room-disappeared on network error, and never clears error on recovery; losing game response leaves indefinite loader. Handle errors with retry, prevent stale commit, filter subscriptions to current room, use stable keys for per-round input/hint state.
13. **P2 memory missed cards reappear on each poll.** `MemoryPlay.tsx:22–28` depends on lastPair object identity, newly allocated each room load. Missed cards re-show every 5 seconds until next action. Depend on move count/stable pair values; disable next flip during shared reveal interval to ensure everyone sees pair.
14. **P2 finalization can lose statistics.** `room-actions.ts:62–70` first sets room finished, then inserts match and read-modify-writes profile stats sequentially; failures ignored and retries skipped because finished. Concurrent games overwrite profile totals. Atomic finalize transaction, unique room/profile history and atomic increments are needed.
15. **P2 timer expectations differ.** `PromptPlay.tsx:25–48,100–111` makes 2-minute challenge timer local and resettable, so host/partner disagree and refresh restarts. Clarify timer is self-managed or implement shared server deadline; local mode alone insufficient for synchronized online games.
16. **P3 input/config resilience.** rooms route numbers accept decimals for integer DB fields; start accepts empty memory theme/starter list or unsupported type without explicit validation. Turn rounds cannot guarantee equal turns when fewer prompts than players (`spotlightRoundCount` fallback). Error clearly for insufficient fair prompt set, invalid config and malformed payloads.

## Regression recommendations

- Mocked route-level state-store tests for all 8 engines and each of 18 game configurations: start, valid/invalid/duplicate/out-of-turn input, scoring, complete, rematch.
- Concurrent tests: join at limit, duplicate start, two cards submitted at once, same guess/solve twice, simultaneous answers and chain votes, late answer concurrent advance, leave concurrent submission.
- Three-user lifecycle tests: host/non-host leave lobby; host leave midgame; sole chain voter leave; departed answer excluded; disconnect refresh and explicit leave distinction.
- Privacy integration tests with ordinary authenticated DB roles: no current quiz answer, rule ID, unmatched memory face, partner free text before reveal, or unrelated private room content; self profile stat edit rejected.
- Browser: two independent users through each game, 3+ chain challenge, mobile widths, keyboard/labeled inputs, errors/retry; false copied state if clipboard denied.
- Lifetime stats transaction rollback and concurrent finalization tests; fixture setup/teardown isolated from production.

## Verification limitation

No backend instance was mutated or integration gameplay run during this audit. Findings are based on concrete code paths. Existing unit test presence does not establish route/browser behavior. Any required SQL change must ship as safe migration and be applied to an explicitly authorized nonproduction environment before claiming backend integration PASS.

## Implementation checkpoint

Implemented in this branch: active answer quorum, valid answer options, no repeated chain challenges per turn, challenge cancellation/turn timer reset on leave, host transfer, advance engine restriction, host insertion failure cleanup, integer create settings, server snapshot redaction, memory deck and rule history secret storage. Distributed database action lease serializes all room POSTs; atomic SQL finalization commits results/stats/achievements together. SQL migration is additive, contains rollback notes, and has NOT been applied to any database.

Focused evidence: `node --import tsx --test tests/multiplayer-rules.test.ts` → 8 passed; `npx tsc --noEmit --target ES2017` → exit 0. Direct `npm test` failed before tests because sandbox denied tsx IPC pipe; Node import invocation is equivalent runner without that pipe.

Remaining validation: real Postgres migration tests and concurrent API/browser exercise. Lease correctness depends on enforcing a hard request lifetime below 120 seconds; routes declare Next maxDuration=30. This is not a substitute for fencing in self-hosted runtimes with unbounded pauses. Per-action multistep writes remain nontransactional under database/network failure; lease prevents overlap but does not roll back partial remote writes. Read snapshots may observe transient intermediate state before mutation finishes. Do not claim end-to-end transactional gameplay based on the focused tests.
