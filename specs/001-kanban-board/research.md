# Phase 0: Design Decisions

**Feature**: Shared Task Board | **Date**: 2026-08-28

Each decision records what was chosen, why, and what was rejected.

---

## D1. A work-order-backed card does not store its column

**Decision**: `Card.columnId` is nullable. It is set for standalone cards and **NULL for work-order-backed cards**, whose column is derived from `workOrder.status` at read time through the mapping in D2.

Moving a work-order-backed card is therefore not a card write at all. It is a work order status change, performed by the existing work order path and subject to the existing work order authorization.

**Rationale**: The spec names card/work-order agreement as the main design risk. Storing a column on such a card creates two pieces of state that mean the same thing, and every write path to `WorkOrder.status` becomes a place they can diverge — including paths added later by someone who has never read this document. Deriving the column means there is only one piece of state, so divergence is not a bug to prevent but a condition that cannot arise.

It also collapses a whole class of requirements into consequences rather than features:

- FR-019 (column reflects status wherever changed) — automatic; there is nothing to update.
- FR-020 (moving sets status, with work order authorization) — the move *is* a status change, so it inherits that authorization instead of re-implementing it.
- FR-023 (work order changes department, card follows) — the card is found through the work order, so it follows by construction.
- FR-024 (work order deleted, card removed) — a cascade, not a cleanup job.

**Cost, stated honestly**: reading a board is no longer a single `groupBy(columnId)`. It is two queries — standalone cards by column, plus the department's non-archived work orders — merged in application code by the mapping. At 11 departments and hundreds of cards that is comfortably cheap, and `src/lib/board.ts` owns the merge so it exists once.

**Alternatives rejected**:
- *Store `columnId` on work-order-backed cards and sync it.* The obvious design. Requires finding and correctly patching every current and future write to `WorkOrder.status`, and there are already eight such actions. The failure is silent and is discovered as a board that quietly lies.
- *Database trigger keeping the column in step.* Reliable, but puts business logic where nothing else in this codebase lives, and Prisma migrations would carry raw trigger SQL nobody maintains.
- *Do not put work orders on the board at all.* Would remove the risk entirely, and was explicitly rejected by the requester — a board that omits maintenance work is a second place to look, which is the problem the board exists to solve.

---

## D2. Column declares the status a move sets; every status maps to exactly one column

**Decision**: Two fields on `BoardColumn`:

- `woStatusOnMove: WorkOrderStatus?` — moving a work-order-backed card into this column sets that status. `NULL` means the column does not accept work-order-backed cards.
- `woStatusesShown: WorkOrderStatus[]` — which statuses render in this column.

A board-level invariant, enforced in `src/lib/board.ts` and checked on column configuration: **every `WorkOrderStatus` value appears in exactly one column's `woStatusesShown`.** Defaults:

| Column | Shows | Move sets |
|---|---|---|
| Ideas / Backlog | — | *(refuses work-order cards)* |
| Ready / Next Up | `OPEN` | `OPEN` |
| In Progress | `IN_PROGRESS` | `IN_PROGRESS` |
| Blocked | `WAITING_PARTS` | `WAITING_PARTS` |
| Done / Archived | `COMPLETE`, `CLOSED`, `CANCELLED` | `COMPLETE` |

**Rationale**: The two fields are genuinely different questions. "Where does a `CANCELLED` work order appear?" and "what happens when someone drags something to Done?" have different answers, and one field cannot express both — Done must *show* three terminal statuses while a move into it picks one.

Exactly-one-column is what makes FR-022 checkable: a status appearing in no column produces invisible work orders, and a status in two columns produces a card in two places. Both are worse than refusing the configuration.

Refusing a move into an unmapped column (FR-021) rather than allowing it is deliberate: the alternative is a work-order-backed card sitting in Ideas/Backlog while its work order is `IN_PROGRESS`, which is precisely the lie this design exists to prevent.

**Alternatives rejected**:
- *One field, `woStatus`, per column.* Simpler until Done needs to hold three terminal statuses, at which point it cannot.
- *Mapping table separate from columns.* More flexible, another concept for an org admin to understand, and the constitution charges complexity against training cost.
- *Hardcode the mapping.* Would work today and break the moment someone renames a column, which the spec explicitly permits.

---

## D3. Tap to move, with honest optimism

**Decision**: Tapping a card opens a bottom sheet showing the card and a list of columns. Tapping a column moves it and closes the sheet — **two taps, no drag, no library** (SC-003).

The move applies optimistically and **reverts visibly with an explanation if the action fails** (FR-034). Drag-and-drop is not implemented in this feature at all.

**Rationale**: Drag-and-drop is the conventional kanban interaction and is close to unusable in the stated primary context — a phone, in dust, wearing gloves, on a small screen where the drop target may be off-viewport. Constitution Principle V makes the field user the constraint, so the conventional interaction is the wrong one here.

Not implementing drag is a choice rather than an omission: adding it later is additive, whereas building drag first and retrofitting taps tends to produce a tap path that is a second-class afterthought.

The revert behaviour matters more than it appears. The app has no offline writes, so on a poor connection a failed move that stays on screen produces exactly the failure the board is meant to eliminate — someone reads it, believes it, and acts on stale information.

**Alternatives rejected**:
- *A drag library with keyboard/tap fallback.* A new dependency, and the fallback path is the one that matters here, so it would be the least-tested path in the most-used context.
- *Long-press to pick up, tap to drop.* One fewer visible control, but long-press is undiscoverable for an untrained user and conflicts with the browser's own text-selection gesture.
- *Move by editing a dropdown in card detail.* Fewest moving parts, but turns the board's core verb into a form field.

---

## D4. Integer positions, tie-broken, with optimistic concurrency

**Decision**: `Card.position: Int`, ordered by `(position, id)` so ties are stable rather than arbitrary. Reordering rewrites the affected column's positions inside a transaction.

Concurrent edits are handled by **optimistic concurrency**: the move action takes the card's expected `updatedAt` and refuses if it has changed, reporting the conflict to the caller (FR-032).

Work-order-backed cards have no stored position; they order within their derived column by `(priority desc, reportedAt asc)`, matching the existing work order list ordering.

**Rationale**: Fractional or lexicographic ranking avoids rewriting siblings and is the right answer at scale. At a few hundred cards per board it is unnecessary complexity, and its failure mode — precision exhaustion after repeated insertions between neighbours — is subtle. Integer rewrite in a transaction is boring and obviously correct.

Refusing rather than merging concurrent moves satisfies "converge on one outcome, tell the loser" without inventing merge semantics for an operation that has none.

Reusing the work order list's ordering for derived cards means a work order occupies the same relative position in both views, which is one less thing to be surprised by.

**Alternatives rejected**:
- *Fractional positions.* Correct at scale, unjustified here.
- *Last-write-wins.* Simplest, and silently discards a move someone made — the exact failure FR-032 names.
- *Row locking on move.* Correct, heavier, and unnecessary when a version check suffices.

---

## D5. Boards exist implicitly

**Decision**: A board is created for every department by `prisma/seed.ts`, which is upsert-based and already runs on every container start. Creating a department in the admin UI also creates its board in the same transaction.

There is **no board creation UI and no board picker within a department** — a department has one board, reached at `/board/<slug>`.

**Rationale**: FR-001 requires boards to exist without setup. Using the seed handles existing departments and new deployments identically, with no separate backfill migration to write, test, and then never run again. Idempotence is already a property the seed must have.

Not exposing board creation means no user ever encounters the concept of "a board" as a thing to manage. They encounter *their department's board*, which needs no explanation — which is Principle V applied to vocabulary rather than to layout.

**Alternatives rejected**:
- *Create on first visit.* No backfill needed, but makes a read path perform a write, and two people visiting simultaneously race to create.
- *A data migration.* Handles existing rows and does nothing for departments created afterwards, so the create path would need it too — two mechanisms where one suffices.

---

## D6. Entitlement reuses the existing role model

**Decision**: The roll-up shows boards for departments returned by the existing `getAccessibleDepartmentIds()` in `src/lib/dal.ts`, which already returns all departments for an org admin and membership departments otherwise.

Division-lead visibility is layered as an **additional union term**, not a replacement: if `Division.leadUserId` matches the current user, that division's departments are included.

**Rationale**: FR-005 forbids inventing a permission concept. The DAL helper is already the app's answer to "which departments does this user touch", already handles org-admin, and is already used by the loans page and work order creation.

Layering division-lead as a union term rather than a new branch means the roll-up is correct with or without `Division.leadUserId` existing. If the assumption is rejected, one clause is deleted and nothing else changes.

**Resolved 2026-08-28**: division lead is being added. `Division.leadUserId` mirrors `Department.leadUserId`.

**The larger half of that decision**: no administration screen currently sets *any* lead. `Department.leadUserId` is populated only by the seed. A column nobody can populate makes the roll-up branch dead code, so the control to assign a division lead is part of this feature (FR-005c), not a follow-up. The equivalent control for department lead is a separate decision and is deliberately not bundled here.

**Alternatives rejected**:
- *A new `BoardPermission` model.* Directly contradicts FR-005 and adds an authorization surface to reason about separately from every other one.
- *Org-admin-only roll-up.* Removes the assumption entirely, and removes the feature for the exact person who asked for it.

---

## D7. Done is time-bounded in the active view

**Decision**: The Done/Archived column shows cards completed within a rolling window (default 30 days). Older ones remain reachable through a "show everything" toggle on that column. Nothing is deleted.

For work-order-backed cards the window is measured from the work order's `closedAt`/`completedAt`; for standalone cards from `archivedAt`.

**Rationale**: FR-030 requires completed work not to accumulate in the active view while remaining findable. A rolling window keeps recent completions visible — which is the useful part, since "what did we finish this week" is a real question — without unbounded growth.

Scoping it to the column rather than the board means the rest of the board is untouched by the setting, so nobody has to understand it to read the board.

**Alternatives rejected**:
- *Auto-archive after N days as a background job.* No scheduler exists in this app, and adding one for this is disproportionate.
- *Manual archiving only.* Depends on volunteer diligence for board hygiene, which is precisely the assumption the board exists because it failed.
- *Cap by count rather than time.* "Last 50" is arbitrary in a way "last 30 days" is not, and produces different behaviour on busy and quiet boards.

---

## D8. Framework specifics to confirm before writing code

Per Constitution Principle I, these must be read in `node_modules/next/dist/docs/` rather than recalled, and the answers recorded here before implementation:

- **Server action revalidation** — current guidance on `revalidatePath` versus `revalidateTag` for a route whose data changes frequently, and whether the existing actions' pattern is still current.
- **Optimistic updates in React 19** — whether `useOptimistic` is the right vehicle for D3's revert-on-failure, and what the installed version's guidance says about pairing it with server actions.
- **Route handlers versus server actions** for the board read, given it merges two queries.

> Recorded as an open item, not an assumption. This codebase's Next version has breaking changes relative to training data, and D3's honesty guarantee depends on getting the optimistic-update mechanics right.

---

## Decision summary

| # | Decision | Consequence |
|---|----------|-------------|
| D1 | Derived column for work-order cards | The main design risk stops existing rather than being managed |
| D2 | Column declares status; every status maps once | Configuration cannot produce invisible or duplicated cards |
| D3 | Tap to move, revert honestly | Usable in gloves; never displays a change that did not persist |
| D4 | Integer positions + version check | Boring and correct at this scale; no silent lost moves |
| D5 | Boards created by seed | No setup, no board vocabulary, no separate backfill |
| D6 | Reuse `getAccessibleDepartmentIds` | No new permission concept; works with or without division-lead |
| D7 | Time-bounded Done | Active board stays readable; nothing is destroyed |
| D8 | Confirm framework specifics first | Principle I; D3 depends on the answer |
