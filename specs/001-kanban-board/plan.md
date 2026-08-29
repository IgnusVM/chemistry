# Implementation Plan: Shared Task Board

**Branch**: `feature/kanban-board` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kanban-board/spec.md`

## Summary

One board per department, showing what is in flight, who owns it, and what is stuck. Work orders appear on it automatically; cards can also be created standalone for work that is not a work order.

**The decision that shapes everything else: a work-order-backed card does not store its column.** Its column is *derived* from the work order's status at read time. This turns the spec's stated main design risk — keeping card position and work order status in agreement — from a synchronization problem into a non-problem, because there is only ever one piece of state. Moving such a card is not a card write at all; it is a work order status change, routed through the authorization that already governs work orders.

Everything else follows the codebase's existing grain: server actions with per-record checks at the data layer, zod validation, additive migrations, and a phone-first interface.

## Technical Context

**Language/Version**: TypeScript strict, Node 24

**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19, Prisma 7 + `@prisma/adapter-pg`, Tailwind v4, zod 4. **No new runtime dependencies** — tap-to-move needs no drag library, which is the point.

**Storage**: PostgreSQL 17. Attachments reuse the existing S3 path.

**Testing**: `tsc --noEmit`, `npm run lint`, `npm run build`, plus executed behaviour per Constitution Principle IV — the authorization boundary and the sync semantics both exercised against a real database, not merely typechecked.

**Target Platform**: Installed PWA on a phone as the primary target; desktop browser secondary.

**Project Type**: Web application, existing.

**Performance Goals**: A 200-card board readable and responsive on a phone (SC-009). Board loads in one round trip; no per-card fetching.

**Constraints**:
- Additive migrations only; the hosted instance is in beta with live data.
- Tap-to-move is required; drag is optional and additional (FR-014).
- No offline writes exist in the app — failed actions must revert visibly (FR-034).
- Every added field carries volunteer training cost (Constitution Principle V).

**Scale/Scope**: 11 departments, therefore 11 boards. Hundreds of cards, not tens of thousands.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | How this plan satisfies it | Status |
|---|-----------|---------------------------|--------|
| I | Framework truth from node_modules | Phase 0 includes reading the installed Next docs on server actions, `revalidatePath`, and `useOptimistic` before any is written | ✅ Gated in tasks |
| II | Authorization at the data layer | Every board mutation resolves its department from the record and checks it, mirroring `requireWorkOrderAccess`. Reads stay org-wide. Moving a work-order-backed card routes through work order authorization, not board authorization | ✅ By design |
| III | Additive, non-destructive migrations | All new tables plus two nullable columns. No existing column altered or dropped. Backfill is an upsert in the seed, which already runs on every start | ✅ By design |
| IV | Verify by running | Verification tasks execute the authorization boundary and the sync semantics against a real database. Typecheck alone is explicitly insufficient | ✅ Gated in tasks |
| V | The field user is the constraint | Tap-to-move is a requirement; card creation needs a title only; no kanban vocabulary is exposed to the reader | ✅ By design |
| VI | Beta users are real users | Branch-local. Deployment preconditions stated below and not assumed | ✅ Stated |

**Result (pre-Phase 0): PASS.**

**Re-check after Phase 1 design: PASS.** The design tightened two gates rather than loosening any:

- **Principle II got stronger.** A shared `requireBoardAccess` helper means no action open-codes its check, and the contract states plainly that no action accepts a department id from the client. Moving a work-order-backed card routes through work order authorization rather than duplicating it.
- **Principle III got stronger.** The migration is pure DDL — five `CREATE TABLE` and one nullable `ADD COLUMN`, with zero `UPDATE` against existing rows. Board creation lives in the seed, so there is no data migration to reverse.
- **Principle IV is now specific.** `quickstart.md` names the two things that must be executed rather than reviewed, and says why the sync table must be run even though D1 makes it theoretically impossible to fail.
- **Principle V shaped the schema, not just the UI.** There is deliberately no `Card.status` field, and card creation requires only a title.

Design also *removed* an anticipated complexity: the data model expected to need a hand-written partial unique index, and does not. Postgres permits multiple NULLs in a unique index, so `workOrderId String? @unique` already means "at most one card per work order, unlimited standalone cards". Recorded in `data-model.md` explicitly, because writing an unnecessary partial index because the constitution mentions them would be cargo cult.

One item needs explicit justification rather than silent acceptance:

| Item | Why it is not a violation |
|------|--------------------------|
| Adding `Division.leadUserId` | Principle III permits additive change; this is one nullable column mirroring `Department.leadUserId` exactly. It is flagged in the spec as the assumption most likely to be wrong, and the plan is structured so the roll-up works without it — division-lead is an *enhancement* to entitlement, not a prerequisite. If rejected, delete the column and one branch of the entitlement query. |

## Project Structure

### Documentation (this feature)

```text
specs/001-kanban-board/
├── plan.md              # This file
├── spec.md              # What and why
├── research.md          # Phase 0 — the design decisions, with rejected alternatives
├── data-model.md        # Phase 1 — schema, constraints, state transitions
├── quickstart.md        # Phase 1 — how to verify it actually works
├── contracts/
│   └── server-actions.md   # The mutation surface and its guarantees
├── checklists/
│   └── requirements.md  # Spec quality validation (complete)
└── tasks.md             # Phase 2 — created by /speckit-tasks, not by this command
```

### Source (repository)

```text
prisma/
├── schema.prisma                        # + Board, BoardColumn, Card, Tag, CardTag
├── migrations/<timestamp>_task_board/   # hand-authored, additive
└── seed.ts                              # + board upsert per department (backfills existing)

src/
├── app/(app)/
│   ├── board/
│   │   ├── page.tsx                     # roll-up: boards this user may see
│   │   ├── [departmentSlug]/
│   │   │   ├── page.tsx                 # one department board
│   │   │   └── board-view.tsx           # client: columns, cards, filters
│   │   ├── card-sheet.tsx               # client: tap-to-move + card detail
│   │   ├── new-card-form.tsx            # client: title-only inline create
│   │   └── actions.ts                   # server actions, all guarded
│   ├── admin/board-columns/             # org-admin column + colour config
│   └── work-orders/actions.ts           # MODIFIED: create card alongside work order
└── lib/
    ├── board.ts                         # entitlement, status<->column mapping, ordering
    └── dal.ts                           # unchanged; reuses getAccessibleDepartmentIds
```

**Structure Decision**: A new `board/` route group alongside `assets/` and `work-orders/`, matching how the app already separates its main functions. Board logic that is not a server action lives in `src/lib/board.ts` so the status-to-column mapping has exactly one home — that mapping is consulted by the board reader, the move action, and the work order path, and duplicating it is how the two would drift apart.

Only one existing file is modified: `work-orders/actions.ts`, to create a card when a work order is created. Nothing else in the existing app changes, which keeps the blast radius against a live beta small and reviewable.

## Phase 0: Research and Design Decisions

**Output**: [research.md](./research.md)

Resolves, with rationale and rejected alternatives:

- **D1 — Derived column for work-order-backed cards.** The central decision. Why storing a column on such a card creates a synchronization problem, and why deriving it removes the problem rather than managing it.
- **D2 — Status-to-column mapping.** Where it lives, how a column declares the status a move sets, and why every work order status must map to exactly one column.
- **D3 — Tap-to-move interaction.** Two taps, no drag dependency, and what optimistic update must do when the network fails (FR-034).
- **D4 — Card ordering.** Integer positions with tie-breaking versus fractional ranking, and concurrency handling for FR-032.
- **D5 — Implicit board creation.** Seed upsert for existing departments and creation on new ones, so no user meets the concept of "making a board".
- **D6 — Entitlement for the roll-up.** Reusing `getAccessibleDepartmentIds`, and how division-lead layers on without being required.
- **D7 — Archiving Done.** Keeping the active board readable without losing completed work.
- **D8 — Framework specifics to confirm in `node_modules/next/dist/docs/`** before writing: server action revalidation, and the current guidance on optimistic updates in React 19.

## Phase 1: Design and Contracts

**Prerequisites**: Phase 0 complete.

**Outputs**: [data-model.md](./data-model.md), [contracts/server-actions.md](./contracts/server-actions.md), [quickstart.md](./quickstart.md)

1. **`data-model.md`** — the five new models with field-level definitions, the two added nullable columns, validation rules traced to functional requirements, and the state transitions for a card. Notes explicitly where a Postgres nullable-unique suffices and where a hand-written index would be needed, rather than assuming one is required because the constitution mentions them.

2. **`contracts/server-actions.md`** — the mutation surface. For a Next.js app the server actions *are* the contract: each one's input schema, the authorization it performs, what it revalidates, and its failure modes. Written before implementation so the authorization story is reviewable on its own.

3. **`quickstart.md`** — how to verify the feature actually works, including the two things typechecking cannot catch: that a user without department write access is refused at the data layer, and that a work order's status and its card's column cannot disagree.

4. **Agent context** — `CLAUDE.md` currently contains only `@AGENTS.md`. A SPECKIT block pointing at this plan is appended, leaving the existing content and the `next dev`-managed AGENTS.md block untouched.

## Phase 2: Task Generation

Not performed by this command. `/speckit-tasks` will decompose the spec's six user stories.

Intended shape, one group per story:

| Group | Story | Delivers |
|-------|-------|----------|
| Setup | — | Schema, migration, seed backfill, `src/lib/board.ts` |
| A | US1 (P1) | Read a department board on a phone — **MVP** |
| B | US2 (P2) | Create a card; tap to move |
| C | US3 (P3) | Work orders appear and stay consistent |
| D | US4 (P4) | Tags and filtering |
| E | US5 (P5) | Cross-department roll-up |
| F | US6 (P6) | Column and colour configuration |

Group C carries the design risk and therefore gets its own verification task exercising every transition in both directions, rather than folding that into a general test pass.

## Deployment Preconditions

Per Constitution Principle VI this stays branch-local. Before it could reach the beta instance, all of these must be true — recorded now so the decision is a checklist rather than a judgement call under pressure:

1. **The migration is verified additive** against a copy of production data — new tables and two nullable columns, no rewrite of any existing column.
2. **The seed backfill is idempotent**, having run twice against a populated database with no duplicate boards.
3. **Existing work orders are backfilled** with cards, and the count of cards created equals the count of work orders.
4. **The authorization boundary is executed**, not reviewed: a user without department write access is refused by the action itself.
5. **Sync semantics are exercised** in both directions, including the refusal path for an unmapped column.
6. **Rollback is understood**: the feature adds tables and nullable columns, so reverting the deploy leaves data intact and orphaned rather than corrupt. The one-way door is the seed creating boards — harmless if the feature is withdrawn.
7. **Someone who has not seen it can use it** (SC-007). This is a real gate, not a nicety: the users are volunteers who did not choose this software.

## Complexity Tracking

No constitution violations requiring justification beyond the `Division.leadUserId` note in the Constitution Check, which is additive and reversible.
