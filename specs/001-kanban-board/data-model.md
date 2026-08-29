# Phase 1: Data Model

**Feature**: Shared Task Board | **Date**: 2026-08-28

Five new models, two added nullable columns, nothing existing altered. Conventions and rationale are in [research.md](./research.md).

---

## New models

### `Board`

One per department, created implicitly (D5).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `departmentId` | `String @unique` | **Unique enforces one board per department** |
| `createdAt` / `updatedAt` | `DateTime` | |

Relations: `department Department @relation(fields:[departmentId], references:[id], onDelete: Cascade)`, `columns BoardColumn[]`, `cards Card[]`.

A deactivated department keeps its board; the read path renders it read-only (FR-031).

### `BoardColumn`

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `boardId` | `String` | |
| `name` | `String` | |
| `position` | `Int` | Explicit ordering (FR-009) |
| `color` | `String?` | Design-token name, not a raw hex — must resolve in both themes |
| `woStatusOnMove` | `WorkOrderStatus?` | `NULL` = refuses work-order cards (D2) |
| `woStatusesShown` | `WorkOrderStatus[]` | Which statuses render here (D2) |
| `createdAt` / `updatedAt` | `DateTime` | |

Relations: `board Board @relation(..., onDelete: Cascade)`, `cards Card[]`.

`@@index([boardId, position])`.

**Board-level invariant, enforced in `src/lib/board.ts`, not by the database**: every `WorkOrderStatus` value appears in exactly one column's `woStatusesShown` for a given board (FR-022). A set-partition constraint across rows is not expressible as a Postgres constraint without a trigger, and D1's rejected alternatives explain why triggers are unwelcome here. It is validated on every column-configuration write and asserted by the board reader.

### `Card`

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `boardId` | `String` | |
| `columnId` | `String?` | **NULL for work-order-backed cards** (D1) |
| `title` | `String` | Only required field (FR-010) |
| `ownerUserId` | `String?` | |
| `nextAction` | `String?` | |
| `dueDate` | `DateTime?` | |
| `statusNotes` | `String?` | |
| `position` | `Int @default(0)` | Standalone cards only (D4) |
| `workOrderId` | `String? @unique` | One card per work order |
| `archivedAt` | `DateTime?` | Standalone completion timestamp (D7) |
| `createdByUserId` | `String?` | |
| `createdAt` / `updatedAt` | `DateTime` | `updatedAt` drives the concurrency check (D4) |

Relations: `board`, `column BoardColumn? @relation(onDelete: Restrict)`, `owner User?`, `createdBy User?`, `workOrder WorkOrder? @relation(onDelete: Cascade)`, `tags CardTag[]`.

`@@index([boardId, columnId, position])`, `@@index([ownerUserId])`.

**Constraint notes, stated precisely because the constitution invites hand-written SQL and this feature mostly does not need it:**

- `workOrderId String? @unique` — Postgres unique indexes permit multiple NULLs, so this correctly means "at most one card per work order, unlimited standalone cards". **No partial index required.** (The loans feature needed a genuine partial unique index; this one does not, and inventing one would be cargo cult.)
- `column` uses `onDelete: Restrict`, which is what makes FR-008 enforceable: deleting a column with cards fails at the database unless the action has already moved them.
- `workOrder` uses `onDelete: Cascade` to satisfy FR-024 structurally rather than by cleanup code.
- Card `position` is deliberately **not** uniquely indexed per column. Unique positions make every reorder a constraint-dodging dance; ordering is `(position, id)` so ties are stable (D4).

### `Tag`

Organization-wide, so a team tag means the same thing on every board.

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `name` | `String @unique` | |
| `color` | `String?` | Token name |
| `createdAt` | `DateTime` | |

### `CardTag`

Join. `cardId`, `tagId`, `@@id([cardId, tagId])`, both cascading.

---

## Added columns on existing models

Both nullable, neither rewriting existing data (Constitution Principle III).

| Model | Column | Purpose |
|---|---|---|
| `Division` | `leadUserId String?` | Division-lead entitlement (D6). **The flagged assumption** — mirrors `Department.leadUserId` exactly. Deletable with one query clause if rejected. |
| `WorkOrder` | *(none)* | The `card Card?` back-relation adds no column. |

`Department`, `DepartmentMembership`, `User`, and `WorkOrder` gain back-relations only — no schema columns, no data migration.

---

## Card state

A card is in exactly one of three states, and which one is determined by data, not a status field:

| State | Determined by | Column comes from |
|---|---|---|
| **Standalone, active** | `workOrderId IS NULL AND archivedAt IS NULL` | Stored `columnId` |
| **Standalone, archived** | `workOrderId IS NULL AND archivedAt IS NOT NULL` | Stored `columnId`, filtered from active view by D7's window |
| **Work-order-backed** | `workOrderId IS NOT NULL` | **Derived** from `workOrder.status` via `woStatusesShown` |

There is deliberately no `Card.status` field. Adding one would recreate exactly the duplicate-state problem D1 exists to eliminate.

### Transitions

| Transition | Mechanism | Authorization |
|---|---|---|
| Standalone card moves column | Update `columnId` + `position` | Department write access on the card's board |
| Work-order card "moves" | Update `workOrder.status` — **the card is not written** | Work order access, via the existing work order path |
| Work-order card into unmapped column | **Refused** (FR-021) | n/a |
| Work order changes department | Card follows automatically — it is found through the work order | n/a |
| Work order deleted | Card cascade-deleted | n/a |
| Standalone card archived | Set `archivedAt` | Department write access |

---

## Validation rules

| Rule | Source | Enforced |
|---|---|---|
| Title required, non-empty | FR-010 | zod, server action |
| Title length capped | Principle V (cards must be scannable) | zod |
| Only one card per work order | D1 | Database unique |
| One board per department | FR-001 | Database unique |
| Every status in exactly one column | FR-022 | `src/lib/board.ts`, on column write |
| Move into unmapped column refused for WO cards | FR-021 | Server action |
| Column deletion requires a destination | FR-008 | Server action + `onDelete: Restrict` |
| Concurrent move refused on stale version | FR-032 | `updatedAt` check in the action |
| Board mutations require department write access | FR-003 | Per record, at the data layer |
| Board reads open to any signed-in user | FR-002 | No department filter on read |

---

## Migration

Single additive migration, hand-authored per Constitution Principle III:

1. `CREATE TABLE` × 5 (`Board`, `BoardColumn`, `Card`, `Tag`, `CardTag`)
2. `ALTER TABLE "Division" ADD COLUMN "leadUserId" TEXT` — nullable, no default, no rewrite
3. Foreign keys, unique indexes, and the supporting indexes above

**No existing column is altered or dropped, and no `UPDATE` runs against existing rows.** Board and default-column creation happen in the seed (D5), not in the migration, so the migration is pure DDL and trivially reversible.

**Before applying**: check both local and production for data per Principle III. This migration creates rather than modifies, so the check is expected to be a formality — but "expected to be a formality" is exactly when it gets skipped and is exactly when that matters.
