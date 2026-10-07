# Independently derived acceptance cases v1
Each execution is logged with actual outcomes. Existing harnesses are useful adapters, not evidence until run.

TC-P01 (AC-01a/b,02a/b): Guest completes 20 standard placements; change offered tile, preview and cancel, occupied plot rejection, request/scoring explanation.
TC-P02 (AC-03a/b): Reload midgame and after completion, download postcard, standard signed-in save once, guest sign-in retry, practice does not persist progress, malformed local save recovers; daily same-date seed and offers deterministic, completed daily restores; signed daily progress idempotent; failed500/429 and aborted save recover via retry; stale completion response cannot replace a new practice run.
TC-P03 (AC-04a/b,NFR-01/02/03): New Pocket UI themes, widths, keyboard, flat/dimensional and reduced motion, accessibility and 200% zoom.
TC-M01 (AC-05a/b,NFR-04): Actual create/join lobby controls, tutorial, minimum/maximum players, non-host start, outsider and unauthenticated access.
TC-M02 (AC-06a/b,07a/b): Complete ten rounds using movement and business controls; purchase, upgrade, supplies, commissions, bank, rest. Reject wrong phase, wrong owner and insufficient funds.
TC-M03 (AC-08a/b,NFR-04): UI trade accept/refuse/expire; empty, negative, over-resourced and unauthorized offers; simultaneous accepts and duplicate keys.
TC-M04 (AC-09a/b,NFR-05): Observe independent client state convergence, non-active denial, reload and offline reconnect, lost response, simultaneous different and duplicate commands.
TC-M05 (AC-10a/b): Final results score/history, repeat completion safety, rematch ready state and start.
TC-M06 (NFR-01/02/03): Market UI themes and mobile/tablet/desktop screenshots inspected, flat/dimensional, keyboard, reduced motion, zoom, axe, console/network.
TC-R01 (AC-11a/b,NFR-06): Shared diff mapped to existing game catalog/navigation/search, social/invites and progress; meaningful existing game flows; unit/lint/type checks.

COMPOSITIONAL: Guest Pocket completion followed by authentication and progress retry; Market command followed by peer refresh/offline/reconnect; trade acceptance advances turn, final turn records progress, rematch restores room; navigation preserves theme across old/new games.

Branch inventory was completed after the independent case derivation. Concrete Market partitions appear below; Pocket and regression partitions appear in their scoped run ledgers. Unexercised environmental cases remain explicit limitations.

## Market branch map after independent case design

{
  "checks": [
    {
      "name": "one player",
      "result": "rejected"
    },
    {
      "name": "five players",
      "result": "rejected"
    },
    {
      "name": "duplicate identity",
      "result": "rejected"
    },
    {
      "name": "blank identity",
      "result": "rejected"
    },
    {
      "name": "long identity",
      "result": "rejected"
    },
    {
      "name": "fractional seed",
      "result": "rejected"
    },
    {
      "name": "seed deterministic three distinct options",
      "result": "pass"
    },
    {
      "name": "malformed/stale expected version",
      "result": "reject; input unchanged"
    },
    {
      "name": "malformed/stale expected version",
      "result": "reject; input unchanged"
    },
    {
      "name": "malformed/stale expected version",
      "result": "reject; input unchanged"
    },
    {
      "name": "malformed/stale expected version",
      "result": "reject; input unchanged"
    },
    {
      "name": "malformed/stale expected version",
      "result": "reject; input unchanged"
    },
    {
      "name": "finished command",
      "result": "reject; input unchanged"
    },
    {
      "name": "outsider",
      "result": "reject; input unchanged"
    },
    {
      "name": "wrong turn",
      "result": "reject; input unchanged"
    },
    {
      "name": "movement invalid choice/type",
      "result": "reject; input unchanged"
    },
    {
      "name": "movement invalid choice/type",
      "result": "reject; input unchanged"
    },
    {
      "name": "movement invalid choice/type",
      "result": "reject; input unchanged"
    },
    {
      "name": "movement invalid choice/type",
      "result": "reject; input unchanged"
    },
    {
      "name": "move allowed no fee and immutable original",
      "result": "pass"
    },
    {
      "name": "visit fee capped by empty wallet owner capped at99",
      "result": "pass"
    },
    {
      "name": "buy occupied a",
      "result": "reject; input unchanged"
    },
    {
      "name": "buy occupied b",
      "result": "reject; input unchanged"
    },
    {
      "name": "buy insufficient cash",
      "result": "reject; input unchanged"
    },
    {
      "name": "upgrade insufficient cash",
      "result": "reject; input unchanged"
    },
    {
      "name": "supplies insufficient cash",
      "result": "reject; input unchanged"
    },
    {
      "name": "buy exact cost",
      "result": "pass"
    },
    {
      "name": "upgrade non-owner null",
      "result": "reject; input unchanged"
    },
    {
      "name": "upgrade non-owner b",
      "result": "reject; input unchanged"
    },
    {
      "name": "upgrade maximum",
      "result": "reject; input unchanged"
    },
    {
      "name": "upgrade reaches level3 at exact cash",
      "result": "pass"
    },
    {
      "name": "supply capacity",
      "result": "reject; input unchanged"
    },
    {
      "name": "supply exact12 limit",
      "result": "pass"
    },
    {
      "name": "commission supply shortage",
      "result": "reject; input unchanged"
    },
    {
      "name": "commission scoring cashcap",
      "result": "pass"
    },
    {
      "name": "bank invalid capacity/supplies",
      "result": "reject; input unchanged"
    },
    {
      "name": "bank invalid capacity/supplies",
      "result": "reject; input unchanged"
    },
    {
      "name": "bank exact99 wallet",
      "result": "pass"
    },
    {
      "name": "pass keeps assets",
      "result": "pass"
    },
    {
      "name": "business invalid action",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer self",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer outsider",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer empty side",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer negative",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer 21 coins",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer 7 supplies",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer fraction",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer badstall",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer unownedstall",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer unavailablecash",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer unavailablesupplies",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer cash overflow",
      "result": "reject; input unchanged"
    },
    {
      "name": "offer supplies overflow",
      "result": "reject; input unchanged"
    },
    {
      "name": "duplicate offer",
      "result": "reject; input unchanged"
    },
    {
      "name": "accept sender",
      "result": "reject; input unchanged"
    },
    {
      "name": "accept nooffer",
      "result": "reject; input unchanged"
    },
    {
      "name": "accept wrong phase",
      "result": "reject; input unchanged"
    },
    {
      "name": "trade invalid action",
      "result": "reject; input unchanged"
    },
    {
      "name": "accept exact two-sided transfer with ownership",
      "result": "pass"
    },
    {
      "name": "accept asset unavailable recheck",
      "result": "reject; input unchanged"
    },
    {
      "name": "accept capacity recheck",
      "result": "reject; input unchanged"
    },
    {
      "name": "decline drops offer no transfer",
      "result": "pass"
    },
    {
      "name": "end drops offer no transfer",
      "result": "pass"
    },
    {
      "name": "round event 0 income caps and supply caps",
      "result": "pass"
    },
    {
      "name": "round event 1 income caps and supply caps",
      "result": "pass"
    },
    {
      "name": "round event 2 income caps and supply caps",
      "result": "pass"
    },
    {
      "name": "round event 3 income caps and supply caps",
      "result": "pass"
    },
    {
      "name": "final ten round state score and log bounded",
      "result": "pass"
    }
  ],
  "count": 68,
  "fixture": "in-memory isolated engine states; no database mutations"
}

Route partitions: anonymous401, member/outsider403, origin403, JSON400, body413, invalid phase/version409, completegame409, transactionalcommit false409 and databaseerror rollback. Security adapter validates directRPC42501, privateledger42501, queued invitationcapacity409, stale finalcommit false and partial-score transaction rollback. Real storage outage causing HTTP500 was not injected into the database itself; UI500/503 response recovery is planned. This internal fault path is a stated limitation, not a pass.
