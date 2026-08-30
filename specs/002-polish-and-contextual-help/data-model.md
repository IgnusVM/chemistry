# Data model: the help map

This feature adds no schema. Its "data model" is the mapping from a subject in the interface
to the article that explains it, plus the rule for what happens to the subtitle that currently
sits there.

Three artifacts:

1. **Subtitle disposition** — every `text-sm text-neutral-500` line under a page title, and
   whether it goes.
2. **Help map** — subject → article slug. This is what the implementation consumes.
3. **New content** — the six board articles, which do not exist yet.

---

## 1. Subtitle disposition

The rule from research D7, applied. A subtitle is removed only when its text is **identical
for every user on every visit** *and* explains what the feature is.

### Remove — explanatory (23)

| Page | Current subtitle |
|---|---|
| `/admin` | "Reference data and org setup — edited rarely, not day-to-day." |
| `/admin/asset-types` | "Templates that define what a class of asset is and what custom fields it tracks." |
| `/admin/board-columns` | "Each board ships with working defaults…" (4 lines) |
| `/admin/departments` | "Owning organizations within Alchemy." |
| `/admin/divisions` | "Groupings above departments, e.g. Ops…" (3 lines) |
| `/admin/resolution-codes` | "CMMS-style outcome codes — what happened, not what was wrong…" |
| `/admin/tags` | "Labels for board cards — usually a team…" (3 lines) |
| `/admin/users` | "New accounts can only be created with an invite link…" (3 lines) |
| `/asset-groups` | "Batches created together — for bulk updates and QR sheets." |
| `/assets/new` | "Register a new tracked asset." |
| `/assets/bulk-new` | "Register many near-identical assets at once — up to 500 per batch…" |
| `/assets/bulk-edit` (loaded state) | selection-count prose |
| `/board` | "One per department, plus divisions you lead." |
| `/board/[department]` | "What's happening, who's got it, and what's stuck." |
| `/board/division/[division]` | equivalent line |
| `/help` | "Everything you need to know about using Chemistry." |
| `/locations` | "Storage facilities off-season, camps and placements during events." |
| `/scan` | "Scan an asset's QR sticker to jump straight to it." |
| `/work-orders/new` | "Report a failure, request maintenance, or log other work." |
| `/work-orders/bulk-new` (loaded state) | selection prose |
| `/work-orders/bulk-close` (loaded state) | selection prose |
| `/assets/qr-sheet` | "…Use your browser's print dialog." — *split: keep the label count, drop the instruction* |
| `/offline` | reviewed and **kept** — see below |

### Keep — data-bearing (6)

Removing these loses information people use constantly.

| Page | Line | Why |
|---|---|---|
| `/assets` | `{total} total` | Derived from a query |
| `/work-orders` | `{total} total` | Derived from a query |
| `/account` | `{user.email}` | Identifies the signed-in account |
| `/admin/asset-types/[id]` | `{n} assets use this type` | Derived; also a deletion safety signal |
| `/help/admin` | `{n} articles` | Derived |
| `/assets/qr-sheet` | `{n} labels` | Derived — the instruction half is removed, this half stays |

### Keep — state and error (4)

**These are the most important sentences on their pages.** A pass that keyed on the shared
styling would have deleted all four.

| Page | Line |
|---|---|
| `/assets/bulk-edit` (empty state) | "Your selection has expired or wasn't found. Go back to Assets." |
| `/work-orders/bulk-close` (empty state) | same shape |
| `/work-orders/bulk-new` (empty state) | same shape |
| `/loans` | "Nothing is out right now." / `{n} items out · {n} yours` |

`/offline` ("No signal…") is a state message by the same test and is kept.

---

## 2. Help map

### Page titles

| Page | Article | Category |
|---|---|---|
| `/` | `quick-guide` | getting-started |
| `/assets` | `creating-an-asset` | assets |
| `/assets/new` | `creating-an-asset` | assets |
| `/assets/bulk-new` | `bulk-creating-assets` | assets |
| `/assets/bulk-edit` | `bulk-editing-assets` | assets |
| `/assets/qr-sheet` | `qr-codes-and-scanning` | qr-codes |
| `/asset-groups` | `asset-groups` | assets |
| `/scan` | `qr-codes-and-scanning` | qr-codes |
| `/locations` | `understanding-locations` | locations |
| `/loans` | `checking-tools-in-and-out` | assets |
| `/work-orders` | `creating-a-work-order` | work-orders |
| `/work-orders/new` | `creating-a-work-order` | work-orders |
| `/work-orders/[code]` | `working-a-ticket-end-to-end` | work-orders |
| `/work-orders/bulk-new` | `bulk-creating-work-orders` | work-orders |
| `/work-orders/bulk-close` | `bulk-closing-work-orders` | work-orders |
| `/board` | **`what-the-board-is`** | board (new) |
| `/board/[department]` | **`what-the-board-is`** | board (new) |
| `/board/division/[division]` | **`division-boards`** | board (new) |
| `/account` | `your-contact-profile` | accounts |
| `/admin` | `what-lives-under-admin` | admin-setup |
| `/admin/asset-types` | `asset-types-and-custom-fields` | admin-setup |
| `/admin/departments` | `departments-and-roles` | admin-setup |
| `/admin/divisions` | `departments-and-roles` | admin-setup |
| `/admin/users` | `departments-and-roles` | admin-setup |
| `/admin/resolution-codes` | `resolution-codes-explained` | work-orders |
| `/admin/tags` | **`board-tags`** | board (new) |
| `/admin/board-columns` | **`board-columns-admin`** | board (new) |

### Sections and features

Placed where the label alone does not carry the meaning. Sections whose names are
self-evident — Name, Contact info, Profile picture, Appearance, Badge, Assigned to you,
Browse by topic — get **no control**. Adding one everywhere would rebuild the noise the
subtitles were removed for.

| Where | Subject | Article |
|---|---|---|
| Work order detail | Resolution | `resolution-codes-explained` |
| Work order detail | Parts used | `logging-parts-used` |
| Work order detail | Attachments | `photos-on-work-orders` |
| Work order detail | Closing / reopening | `closing-and-reopening-a-work-order` |
| Asset detail | Status vs. condition | `asset-status-and-condition` |
| Asset detail | Move / location | `understanding-locations` |
| Asset detail | Code | `code-files-on-asset-types` |
| Asset / work order | Notes | `notes-and-rich-text` |
| Asset type detail | Documents | `asset-type-documents` |
| Account | Trusted devices | `signing-in` |
| Account | During the burn | `your-contact-profile` |
| Admin → Users | Invite links | `departments-and-roles` |
| Any list | Export | `exporting-lists` |
| Any list | Selecting multiple | `selecting-multiple-items` |
| Location field | The "Other" option | `custom-locations` |
| Board | Moving a card | **`moving-a-card`** |
| Board | A card that is a work order | **`cards-and-work-orders`** |

---

## 3. New content — six board articles

Category `board`, label "Task Board", added as a tenth entry to `HELP_CATEGORIES` in
`src/lib/help.ts`. Rationale in research D5: the board is a peer of Assets and Work Orders,
not a sub-topic of either.

| Slug | Title | Must explain |
|---|---|---|
| `what-the-board-is` | What the board is for | Columns, what a card is, that there is one board per department. That it is a shared view, not an assignment system. |
| `moving-a-card` | Moving a card | Two taps, not drag. **Why** drag is absent — unusable in dust and gloves — so its absence reads as a decision rather than a missing feature. |
| `cards-and-work-orders` | Cards and work orders | The three relationships. Why a ticket's card refuses a column with no matching status. Why moving that card changes the ticket. |
| `board-tags` | Tagging cards | Shared org-wide, so a tag means the same thing on every board. Deleting a tag leaves its cards alone. |
| `division-boards` | Division boards | Visible only to the division's lead and org admins — the app's only restricted read. Say so plainly, since it contradicts the org-wide default everywhere else. |
| `board-columns-admin` | Changing board columns | Admin-only. Every work order status must appear in exactly one column, and why a configuration that breaks that is refused. **Also notes that edits to seeded articles are reverted on deploy** (research D6). |

### Seed behaviour, inherited

`prisma/seed-help.ts` upserts on slug and its update branch overwrites `title`, `category`,
`summary`, `order`, and `body`. The seed runs on container start. Adding these six to
`ARTICLES` makes them seed-owned: **an admin's edits to them are reverted on the next
deploy.** Hand-authored articles whose slugs are absent from `ARTICLES` are unaffected, which
is what `RETIRED_SLUGS` exists to manage.

This is pre-existing behaviour, not introduced here. It is recorded because these six now
inherit it.
