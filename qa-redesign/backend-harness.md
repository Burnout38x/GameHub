# Real backend acceptance harness

**Executed successfully against the real isolated backend.** `backend-summary.json` has `completed: true`, no failures and verified cleanup. Simulation evidence was not used to fulfill this gate.

Run only after the root confirms the isolated backend and preview are ready:

```sh
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx qa-redesign/backend-integration.mjs
```

The harness requires the existing private local environment file, an active isolated catalog for both games, app port 3199 and Supabase-compatible gateway port 58321. Both URLs are fixed loopback targets; no production override exists. Local auth health is checked before creating anything. Browser launch needs the same local permission as the previous headless tests.

Creates five disposable accounts and two full matches (2 and 4 players), plus their rematch lobbies. All action histories go through authenticated room HTTP routes. A first-round wholesale contest proves real stock denial, later legal policy play must fulfill contracts and create district set states. Every committed score is checked by an independent formula. A concurrent final command must produce one result per player, matching persisted winner IDs.

Two actual browser clients wait for polling responses and rendered scores; reload and final result/rematch controls are exercised. Pocket tests use the regenerated v2 winning history, forged client score, simultaneous retries, legacy same-seed completion, version rejection and private-RPC denial.

Outputs only a small `backend-summary.json` containing check names, fixture IDs and cleanup outcomes. It never writes emails, passwords, cookies, tokens or private environment values. Cleanup deletes only recorded room IDs and created auth users. Fixture registry is saved as each is created so unfinished cleanup is traceable.

Any local stack deviations (gateway implementation, database image, auth/PostgREST versions) must be recorded by the root alongside the execution result. Passing a reduced local stack does not itself prove production deployment; it provides actual DB/API evidence within its documented limits.
