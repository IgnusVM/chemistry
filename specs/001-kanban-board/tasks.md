---
description: "Task list for the Shared Task Board feature"
---

# Tasks: Shared Task Board

**Input**: Design documents from `specs/001-kanban-board/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No unit-test tasks — this codebase has no test suite and the constitution does not ask for one. What it *does* require is Principle IV: behaviour executed, not merely typechecked. Every story phase therefore closes with a verification task that runs the thing, and those are gates rather than formalities. `quickstart.md` holds the procedures.

**Organization**: Grouped by user story so each is independently completable. Stopping after any phase leaves the app working, since every phase is additive to a beta instance that must not break.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different files, no dependency on incomplete work
- **[Story]**: US1–US6, mapping to spec.md user stories
- Every task names its exact file path

## Path Conventions

Existing Next.js app at repository root: `src/app/(app)/`, `src/lib/`, `prisma/`.

> **Only one existing file is modified by this feature**: `src/app/(app)/work-orders/actions.ts` (T030), plus `src/app/(app)/layout.tsx` for a nav link (T016) and the divisions admin for the lead control (T043–T044). Everything else is new. That is deliberate — the hosted instance is in beta, and a small blast radius is what makes this reviewable.

---

## Phase 1: Setup — schema and migration

**Purpose**: Get the data model in place, additively, before anything reads or writes it.

- [X] T001 Add `Board`, `BoardColumn`, `Card`, `Tag`, and `CardTag` models to `prisma/schema.prisma` per data-model.md, including all indexes and the `onDelete` behaviours (`Restrict` on `Card.column`, `Cascade` on `Card.workOrder`)
- [X] T002 Add `leadUserId String?` plus the named `DivisionLead` relation to the `Division` model in `prisma/schema.prisma`, mirroring `Department.leadUserId` exactly, and add the matching back-relation on `User`
- [X] T003 Generate the migration SQL: `npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script`, writing it to a hand-created folder under `prisma/migrations/` named with `date -u +%Y%m%d%H%M%S`_task_board
- [X] T004 Read the generated SQL in `prisma/migrations/<timestamp>_task_board/migration.sql` and confirm it is purely additive — `CREATE TABLE` and one `ADD COLUMN`, with no `ALTER ... DROP`, no `ALTER ... TYPE`, and no `UPDATE` against an existing table (Constitution Principle III)
- [X] T005 Apply `prisma/migrations/<timestamp>_task_board/migration.sql` with `npx prisma migrate deploy`, run `npx prisma generate`, and **restart the dev server** — it caches the generated client
- [X] T006 Extend `prisma/seed.ts` to upsert one `Board` per department with the five default columns and their `woStatusOnMove` / `woStatusesShown` values from research.md D2
- [X] T007 Run `npx tsx prisma/seed.ts` twice and confirm exactly one board per department with no duplicated columns — idempotence is a requirement, not a nicety (D5)

---

## Phase 2: Foundational — blocking prerequisites

**⚠️ CRITICAL**: T008 blocks everything. Principle I is not advisory, and D3's honesty guarantee depends on getting the optimistic-update mechanics right for *this* React version rather than a remembered one.

- [X] T008 Read `node_modules/next/dist/docs/` on server actions, `revalidatePath` vs `revalidateTag`, and React 19 `useOptimistic`, then record the findings in the D8 section of `specs/001-kanban-board/research.md` before any code is written
- [X] T009 Create `src/lib/board.ts` with the status-to-column mapping helpers and the board invariant validator (every `WorkOrderStatus` in exactly one column's `woStatusesShown`, FR-022) — this is the single home for the mapping, and duplicating it elsewhere is how the two copies drift apart
- [X] T010 Add `requireBoardAccess` / `requireCardAccess` to `src/lib/board-auth.ts`, resolving the department **from the stored record**. *Deviation from plan, deliberate*: originally scoped to `src/app/(app)/board/actions.ts`, but every export from a `"use server"` file is a callable endpoint, so an exported auth helper there would be publicly invokable. Placed in `lib/` instead, matching how `src/lib/dal.ts` already exports its guards

**Checkpoint**: Schema, seed, mapping, and the authorization helper exist. Story work can begin.

---

## Phase 3: User Story 1 — Look once and know what's happening (Priority: P1) 🎯 MVP

**Goal**: A member opens their department's board on a phone and can state what is in progress, who owns it, and what is blocked — without tapping anything.

**Independent Test**: Seed cards across all columns, open at 390px, and confirm a reader can answer those three questions without opening a card.

- [X] T011 [US1] Implement `getBoardView(departmentSlug, filters)` in `src/lib/board.ts` returning columns with their standalone cards, ordered `(position, id)`, with no department filter on read (FR-002)
- [X] T012 [US1] Create `src/app/(app)/board/[departmentSlug]/page.tsx` as a server component calling `getBoardView`, resolving the department by slug and 404ing when absent
- [X] T013 [P] [US1] Create `src/app/(app)/board/[departmentSlug]/board-view.tsx` rendering columns with horizontal scroll at phone width, keeping column identity visible while scrolling (SC-001)
- [X] T014 [P] [US1] Create `src/app/(app)/board/card.tsx` displaying title, owner, and next action without opening the card, and making an **unowned** card visually distinct rather than blank (FR-012, FR-013)
- [X] T015 [P] [US1] Handle the no-department case in `src/app/(app)/board/[departmentSlug]/page.tsx` with an explanation rather than an empty board that looks broken (FR-035, US1 scenario 4)
- [X] T016 [US1] Add a Board entry to the primary navigation in `src/app/(app)/layout.tsx`, alongside Assets and Work Orders
- [X] T017 [US1] Render a deactivated department's board read-only rather than hiding it, in `src/app/(app)/board/[departmentSlug]/board-view.tsx` (FR-031)
- [X] T018 [US1] Verify per quickstart.md: board readable at 360px and 390px, column identity clear while scrolling, unowned cards obvious, and an owner who no longer exists renders without breaking (FR-016)

**Checkpoint**: The board answers its central question. Useful on its own even with no other story built.

---

## Phase 4: User Story 2 — Capture it and move it (Priority: P2)

**Goal**: Add a card in seconds and move it by tapping. No drag anywhere.

**Independent Test**: At 390px, create a card with a title only and move it two columns using taps alone.

- [X] T019 [P] [US2] Define zod schemas for card create, update, and move in `src/app/(app)/board/schemas.ts`, with title required, trimmed, non-empty, and length-capped (FR-010, Principle V)
- [X] T020 [US2] Implement `createCard` in `src/app/(app)/board/actions.ts` using `requireBoardAccess`, defaulting to the first column, recording an audit entry and revalidating
- [X] T021 [US2] Implement `moveCard` in `src/app/(app)/board/actions.ts` — standalone path only at this stage: update `columnId` and `position` in a transaction, refusing when `expectedUpdatedAt` is stale and reporting the conflict (FR-032, D4)
- [X] T022 [P] [US2] Implement `updateCard` in `src/app/(app)/board/actions.ts` for title, owner, next action, due date, and status notes — deliberately **not** column, so the two authorization paths never blur (contracts/server-actions.md)
- [X] T023 [P] [US2] Implement `archiveCard` and `deleteCard` in `src/app/(app)/board/actions.ts`, both refusing on work-order-backed cards
- [X] T024 [P] [US2] Create `src/app/(app)/board/new-card-form.tsx` — inline, title-only, submitting without leaving the board (SC-002)
- [X] T025 [US2] Create `src/app/(app)/board/card-sheet.tsx` — a bottom sheet opened by tapping a card, listing columns so a move takes exactly two taps, with **no drag gesture implemented** (D3, SC-003)
- [X] T026 [US2] Apply the move optimistically in `src/app/(app)/board/card-sheet.tsx` using the mechanism confirmed in T008, and **revert visibly with an explanation on failure** (FR-034, D3)
- [X] T027 [US2] Hide create and move affordances from users without department write access in `src/app/(app)/board/[departmentSlug]/board-view.tsx` — the interface must not offer actions that will be refused (FR-004)
- [X] T028 [US2] **Execute the authorization boundary** per quickstart.md: as a member of department A only, call `createCard` and `moveCard` directly against department B's board with a forged board id and confirm the *action* refuses — not merely that the button was hidden (FR-003, Principle IV)
- [X] T029 [US2] Verify concurrency and failure honesty per quickstart.md: a stale `expectedUpdatedAt` is refused and reported, and a move made with the network offline reverts visibly

**Checkpoint**: The board is writable, on a phone, with the authorization boundary proven by execution.

---

## Phase 5: User Story 3 — Work orders show up by themselves (Priority: P3)

**Goal**: Work orders appear on the right board and their card position can never disagree with their status.

**Independent Test**: Run the full sync table in quickstart.md, in both directions, including the refusal path.

- [X] T030 [US3] Modify `createWorkOrder` in `src/app/(app)/work-orders/actions.ts` to create a `Card` with `workOrderId` set and `columnId` NULL **inside the existing transaction**, so a work order is never created without its card
- [X] T031 [US3] Add a backfill to `prisma/seed.ts` creating cards for pre-existing work orders that lack one, idempotently, and confirm the card count equals the work order count
- [X] T032 [US3] Extend `getBoardView` in `src/lib/board.ts` to merge derived work-order cards — placed by `woStatusesShown`, ordered `(priority desc, reportedAt asc)`, never reading a stored `columnId` (D1)
- [X] T033 [US3] Extend `moveCard` in `src/app/(app)/board/actions.ts` with the work-order path: set `workOrder.status` from the target column's `woStatusOnMove` under **work order authorization**, and **refuse with an explanation** when the target column has no mapping (FR-020, FR-021)
- [X] T034 [P] [US3] Mark work-order-backed cards visibly and link them to the work order in `src/app/(app)/board/card.tsx` (FR-018)
- [X] T035 [US3] Apply the Done-column rolling window in `src/lib/board.ts` with a show-everything toggle in `src/app/(app)/board/[departmentSlug]/board-view.tsx` (FR-030, D7)
- [X] T036 [US3] **Execute the full sync table** from quickstart.md in both directions, including the unmapped-column refusal and confirming no stored `columnId` has crept onto a work-order-backed card — the test that would catch D1 being quietly undone

**Checkpoint**: Maintenance work is on the board at zero extra effort, and the stated design risk is closed by construction and confirmed by execution.

---

## Phase 6: User Story 4 — Tags and filtering (Priority: P4)

**Goal**: Tell whose card it is at a glance; filter to one team.

**Independent Test**: Tag cards across two teams, confirm legibility at phone width, and confirm filtering hides the rest.

- [X] T037 [P] [US4] Implement `createTag`, `updateTag`, and `deleteTag` in `src/app/(app)/admin/tags/actions.ts`, org-admin only, with `deleteTag` removing assignments while leaving cards intact
- [X] T038 [P] [US4] Implement `setCardTags` in `src/app/(app)/board/actions.ts` under department write access
- [X] T039 [P] [US4] Create `src/app/(app)/admin/tags/page.tsx` for org admins to manage the tag vocabulary and colours
- [X] T040 [US4] Display tags on the card in `src/app/(app)/board/card.tsx`, **distinguishable without relying on colour** so they work for colour-blind readers and in bright sun (FR-027)
- [X] T041 [US4] Add tag filtering to `src/app/(app)/board/[departmentSlug]/board-view.tsx` with an obvious active-filter indicator, and ensure the filter does **not** persist invisibly across sessions (FR-028, FR-029)
- [X] T042 [US4] Verify per quickstart.md: tags legible at 360px, filter state obvious, and a returning user is not silently still filtered

---

## Phase 7: User Story 5 — See across departments (Priority: P5)

> **T043 and T044 were pulled forward on 2026-08-29**, out of phase order. They were scoped here when division-lead only affected roll-up entitlement; division *boards* then made them the difference between a working feature and one with no way to configure it.

**Goal**: Anyone whose role spans departments sees their boards in one place — including the Ops lead.

**Independent Test**: Run the entitlement matrix — org admin sees all; division lead sees their division; single-department member sees one.

- [X] T043 [US5] Extend `updateDivision` in `src/app/(app)/admin/divisions/actions.ts` to accept and set `leadUserId`, org-admin only (FR-005c)
- [X] T044 [US5] Add a division-lead picker to `src/app/(app)/admin/divisions/division-form.tsx` — **without this the column cannot be populated and the roll-up branch is dead code**, which is why it is in this feature rather than deferred
- [X] T045 [US5] Implement `getRollupView()` in `src/lib/board.ts` as the union of `getAccessibleDepartmentIds()` and the departments of divisions where `leadUserId` is the current user (D6, FR-005b)
- [X] T046 [US5] Create `src/app/(app)/board/page.tsx` rendering the roll-up, and make it the destination of the nav entry added in T016
- [X] T047 [US5] Make each card's source department identifiable in the roll-up in `src/app/(app)/board/page.tsx` — an aggregated card with no source is not actionable (FR-005, US5 scenario 3)
- [X] T048 [US5] Verify the entitlement matrix per quickstart.md, including that a member of one department sees exactly one board and is not led to believe others are hidden by error

**Checkpoint**: Jaysen can be set as Ops lead and see every Ops department's board.

---

## Phase 8: User Story 6 — Make it fit how we actually work (Priority: P6)

**Goal**: Org admins adjust columns and colours. Defaults were already working without them.

**Independent Test**: Confirm a fresh board needs no configuration, then rename, add, and reorder columns and confirm no card is lost.

- [X] T049 [US6] Implement `createColumn`, `updateColumn`, and `reorderColumns` in `src/app/(app)/admin/board-columns/actions.ts`, org-admin only, each re-validating the board invariant from T009 and refusing configurations that leave a `WorkOrderStatus` in zero or multiple columns (FR-022)
- [X] T050 [US6] Implement `deleteColumn` in `src/app/(app)/admin/board-columns/actions.ts` requiring `moveCardsToColumnId`, moving cards in the same transaction before deletion so `onDelete: Restrict` catches any mistake loudly (FR-008)
- [X] T051 [US6] Create `src/app/(app)/admin/board-columns/page.tsx` for column naming, ordering, colour, and status mapping, per board
- [X] T052 [P] [US6] Ensure column colours resolve as design tokens in both light and dark themes in `src/app/globals.css`, rather than raw hex values that break in one of them
- [X] T053 [US6] Verify per quickstart.md: a new department board works untouched, and no card is lost through renaming, reordering, adding, or deleting columns (SC-004, SC-011)

---

## Phase 8b: Division boards (added 2026-08-29)

**Goal**: Each division gets a board, visible to its lead and org admins only.

- [X] T060 Make `Board` owned by either a department or a division in `prisma/schema.prisma`, with a hand-written `Board_owner_exactly_one` CHECK constraint in the migration since Prisma cannot express it
- [X] T061 Seed one board per division in `prisma/seed.ts`, idempotently, alongside the department boards
- [X] T062 Add `canViewDivisionBoard` and `visibleDivisionIds` to `src/lib/board-auth.ts` — the single named home for the app's first restricted read
- [X] T063 Split `getBoardView` into `getDepartmentBoard` and `getDivisionBoard` in `src/lib/board.ts`, sharing one loader, with `BoardView.owner` carrying the kind
- [X] T064 Create `src/app/(app)/board/division/[divisionSlug]/page.tsx`, returning 404 rather than 403 for an unentitled request so the board's existence is not confirmed
- [X] T065 List visible division boards in `src/app/(app)/board/page.tsx`, filtered at the query rather than hidden in the interface
- [X] T066 Verify the restricted read by execution: org admin sees it, ordinary member gets 404, division lead sees it, and a department LEAD who is not the division lead still gets 404

### Still to do — manual ticket attachment (FR-005g)

- [ ] T067 Add a `CardWorkOrderRef` join in `prisma/schema.prisma` so a card can reference work orders as context, distinct from `Card.workOrderId` which means the card *is* that work order
- [ ] T068 Add `attachWorkOrder` and `detachWorkOrder` to `src/app/(app)/board/actions.ts`, guarded by `requireCardAccess`
- [ ] T069 Show attached tickets on the card in `src/app/(app)/board/card.tsx`, visually distinct from a work-order-backed card so the two relationships are not confused
- [ ] T070 Verify a division board never auto-creates a work order card, and that an attached ticket does not move when the work order's status changes — it is a reference, not a backing

---

## Phase 9: Polish and release readiness

- [ ] T054 [P] Seed 200 cards onto one board via a throwaway script, and confirm `src/app/(app)/board/[departmentSlug]/board-view.tsx` stays readable and responsive at phone width (SC-009)
- [ ] T055 [P] Re-check every screen under `src/app/(app)/board/` at 360px and 390px — the widths that actually get used, not just 390px (a lesson from a previous mobile pass)
- [ ] T056 Run the non-technical gate in `specs/001-kanban-board/quickstart.md`: someone who has not seen the board states what it shows and takes one action, untrained. **This is a real gate** — if it fails the feature is not done, whatever the other checks say (SC-007)
- [ ] T057 Run `npx tsc --noEmit`, `npm run lint`, and `npm run build` clean across the repository, resolving anything raised in `src/app/(app)/board/` or `src/lib/board.ts`
- [ ] T058 Bump the version in `package.json` and commit on `feature/kanban-board`
- [ ] T059 Walk the seven deployment preconditions in `specs/001-kanban-board/plan.md` and record the result — **do not deploy**; the hosted instance is in beta and deployment is an explicit decision, not the end of a task list (Constitution Principle VI)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs Setup. **T008 blocks all story work**
- **US1 (Phase 3)**: needs Foundational. Nothing depends on it, but it is the MVP
- **US2 (Phase 4)**: needs US1 — there must be a board to write to
- **US3 (Phase 5)**: needs US2, specifically `moveCard` from T021, which T033 extends
- **US4, US6 (Phases 6, 8)**: need US1; independent of each other and of US3
- **US5 (Phase 7)**: needs US1. Independent of US2–US4 — it is a read view
- **Polish (Phase 9)**: needs whichever stories are being shipped

### Critical path

`T008 → T009 → T011 → T012 → T021 → T033 → T036`

That path ends at the sync verification because it is the one place a silent, spreading defect could originate.

### Parallel opportunities

- T013, T014, T015 — different files within US1
- T019, T022, T023, T024 — different files within US2
- T037, T038, T039 — different files within US4
- T054, T055 — independent polish checks

**Not parallel, despite appearances**: T020, T021, T022, and T023 all write `src/app/(app)/board/actions.ts`. Only T022 and T023 are marked `[P]` because they touch disjoint functions and should be written after T020 establishes the file's shape. Anything writing `src/lib/board.ts` (T009, T011, T032, T035, T045) is strictly sequential.

---

## Implementation Strategy

### MVP (Phases 1–3, 18 tasks)

Setup, Foundational, and US1. Ends with a readable department board on a phone. **Stop and validate**: can someone say what is in progress, who owns it, and what is blocked, without tapping anything? If not, no amount of Phase 4 helps.

### Incremental delivery

Each phase leaves the app coherent and the beta instance untouched:

1. Setup + Foundational → schema and mapping exist, nothing user-visible
2. + US1 → the board answers its question (**MVP**)
3. + US2 → it is writable, on a phone, authorization proven
4. + US3 → maintenance work appears for free
5. + US4 → whose card is whose
6. + US5 → Jaysen sees all of Ops
7. + US6 → it fits how the org actually works

### Notes

- `[P]` = different files, no dependency
- Commit per task or logical group, on `feature/kanban-board`
- **Nothing deploys.** The hosted instance is in beta with members actively using it; T059 records readiness and stops there
- Verification tasks are gates, not formalities. A phase whose verification fails is not complete
