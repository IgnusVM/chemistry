# Contract: Board Server Actions

**Feature**: Shared Task Board | **Date**: 2026-08-28

In a Next.js App Router application the server actions *are* the mutation contract. Each entry below states its input, the authorization it performs, what it revalidates, and how it fails.

Written before implementation so the authorization story is reviewable on its own, rather than inferred afterwards by reading thirteen function bodies.

## Shared guarantees

Every action in `src/app/(app)/board/actions.ts`:

1. Resolves the current user via `requireCurrentUser()`.
2. Resolves the **department from the record it is about to touch**, never from the request.
3. Checks `hasDepartmentAccess(departmentId, "MEMBER")` or org-admin, per record.
4. Validates input with zod before touching the database.
5. Records an audit entry via `recordAudit(...)`, matching existing actions.
6. Calls `revalidatePath` for the affected board and the roll-up.

Guarantee 2 is the one that matters. A board id in a form field is caller-supplied and proves nothing; the department must be derived from the stored row. This mirrors `requireWorkOrderAccess` in `src/app/(app)/work-orders/actions.ts`.

A shared `requireBoardAccess(boardId | cardId, minRole)` helper performs 1–3, so no action open-codes the check and no future action can forget it.

## Actions

### `createCard(formData)`

- **In**: `boardId`, `title` (required, trimmed, non-empty, capped), `columnId?`
- **Auth**: department write access on the board's department
- **Effect**: creates a standalone card; defaults to the first column when `columnId` is absent
- **Fails**: empty title; no access; board not found
- **Note**: title-only creation is the requirement (FR-010) — every other field is added later

### `moveCard(formData)`

The action carrying the design risk. Two distinct paths.

- **In**: `cardId`, `toColumnId`, `expectedUpdatedAt`
- **Auth**:
  - standalone card → department write access on the card's board
  - **work-order-backed card → work order access**, via the work order path, not board access
- **Effect**:
  - standalone → update `columnId` and `position` in a transaction
  - work-order-backed → update `workOrder.status` to the target column's `woStatusOnMove`. **The card row is not written** (D1)
- **Fails**:
  - target column has no `woStatusOnMove` and the card is work-order-backed → **refused with an explanation** (FR-021); the card must not become decoupled
  - `expectedUpdatedAt` does not match → refused as a conflict, reported to the caller (FR-032)
  - no access on either path

### `updateCard(formData)`

- **In**: `cardId`, and any of `title`, `ownerUserId`, `nextAction`, `dueDate`, `statusNotes`
- **Auth**: department write access on the card's board
- **Effect**: updates the supplied fields only
- **Note**: does **not** change `columnId` — moving is `moveCard`, so the two authorization paths never blur into one function

### `archiveCard(cardId)` / `deleteCard(cardId)`

- **Auth**: department write access
- **Fails**: refuses on a work-order-backed card — its lifecycle belongs to the work order (D1)

### `setCardTags(formData)`

- **In**: `cardId`, `tagIds[]`
- **Auth**: department write access on the card's board

### `createTag(formData)` / `updateTag` / `deleteTag`

- **Auth**: **org admin** — tags are organization-wide, so their vocabulary is not per-department
- **Effect**: `deleteTag` removes assignments; cards survive

### Column configuration — `src/app/(app)/admin/board-columns/actions.ts`

`createColumn`, `updateColumn`, `reorderColumns`, `deleteColumn`

- **Auth**: **org admin** (FR-007)
- **Invariant**: every write revalidates that each `WorkOrderStatus` appears in exactly one column's `woStatusesShown` for that board, and refuses otherwise (FR-022)
- **`deleteColumn`** requires `moveCardsToColumnId`. Cards are moved in the same transaction before deletion; `onDelete: Restrict` on the foreign key means a mistake fails loudly rather than destroying cards (FR-008)

### Modified: `createWorkOrder` in `src/app/(app)/work-orders/actions.ts`

The only change to an existing file.

- **Effect**: additionally creates a `Card` with `workOrderId` set and `columnId` NULL, inside the existing transaction
- **Auth**: unchanged — already department-gated
- **Failure**: card creation participates in the transaction, so a work order is never created without its card

## Read path

`src/lib/board.ts` — not an action, no mutation, org-wide per FR-002.

`getBoardView(departmentSlug, filters)` returns columns with their cards, merging:

1. standalone cards, by `columnId`, ordered `(position, id)`
2. the department's work orders, placed by `woStatusesShown`, ordered `(priority desc, reportedAt asc)`

Done-column contents are limited to D7's rolling window unless `showAll` is set.

`getRollupView()` returns boards for the departments from `getAccessibleDepartmentIds()`, unioned with departments of divisions the user leads (D6).

## What no action does

- No action accepts a department id from the client to decide authorization.
- No action writes `Card.columnId` for a work-order-backed card.
- No action deletes cards implicitly.
- No board action can change a work order's status other than through the mapped-column path.
