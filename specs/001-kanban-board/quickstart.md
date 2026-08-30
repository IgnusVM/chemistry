# Verification Guide

**Feature**: Shared Task Board | **Date**: 2026-08-28

Constitution Principle IV: typechecking and lint are necessary and insufficient. This lists what must be *executed*, with emphasis on the two things static analysis cannot catch — the authorization boundary and the card/work-order sync semantics.

## Baseline (necessary, not sufficient)

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Schema and migration

```bash
# Generate, then hand-edit -- never trust the generated SQL unread
npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script
```

Confirm the SQL is additive: expect `CREATE TABLE` statements and one `ADD COLUMN`, and **no** `ALTER ... DROP`, `ALTER ... TYPE`, or `UPDATE` against an existing table.

Apply, regenerate, and **restart the dev server** — it caches the generated client.

## Boards exist without setup

```bash
npx tsx prisma/seed.ts
npx tsx prisma/seed.ts   # twice: idempotence is the requirement, not a nicety
```

Expect exactly one board per department after both runs, and default columns on each.

## The authorization boundary (execute it)

The check that must not be done by reading. For a user who is a member of department A only:

1. Create a card on department **B**'s board → refused
2. Move a card on department **B**'s board → refused
3. Read department B's board → **allowed** (reads are org-wide, FR-002)
4. Repeat as org admin → all allowed

Refusal must come from the server action itself, not from the interface declining to render a button. Call the action directly with a forged board id to confirm.

## Sync semantics (the design risk)

Every row must hold, in both directions:

| Start | Do | Expect |
|---|---|---|
| Work order `OPEN` | Open the board | Card in Ready/Next Up |
| Work order `OPEN` | Move card to In Progress | Work order becomes `IN_PROGRESS` |
| Work order `IN_PROGRESS` | Change status to `WAITING_PARTS` in the work order UI | Card appears in Blocked |
| Work order, any status | Move card to Ideas/Backlog | **Refused with an explanation**; work order unchanged |
| Work order `CLOSED` | Open the board | Card in Done, within the window |
| Work order deleted | Open the board | Card gone |
| Card and work order | Compare after every step above | **Never disagree** |

The last row is the whole point. If the column is genuinely derived (D1) it cannot fail — which is exactly why it must be checked, since a stored `columnId` sneaking in would pass every other test here.

## Concurrency

Two sessions, same card: move in A, then move in B with a stale `expectedUpdatedAt`. B must be **refused and told**, not silently overwritten (FR-032).

## Failure honesty

With the network throttled to offline, move a card. The move must **revert visibly** and say it failed (FR-034). A move left on screen that did not persist is the failure the board exists to prevent.

## Phone

At 360px and 390px width:

- Board readable; column identity clear while scrolling (SC-001)
- Card creation, title only, under 15 seconds (SC-002)
- Move in two taps, **no drag gesture anywhere** (SC-003)
- Tags legible, and distinguishable without relying on colour (FR-027)

## Scale

Seed 200 cards on one board. It must stay readable and responsive on a phone viewport (SC-009).

## The gate that is not technical

Show it to someone who has not seen it. They should be able to say what it shows and take one action without being told how (SC-007). The users are volunteers who did not choose this software; if this gate fails, the feature is not done regardless of the checks above.
