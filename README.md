# Chemistry

Asset and maintenance management for Alchemy — serial-level asset tracking, work orders, parts, and failure history for the Lamplighter fleet and beyond.

## Features

- **Assets** — serial-level tracking with per-asset-type custom fields, QR codes, location history, and acquisition value. Single or bulk creation (sequential tags or a pasted list), asset groups, and bulk edit (status/location) across a filtered selection. Detail pages are tabbed (Details / Notes / Loans / History).
- **Work orders** — auto-numbered tickets (`CM081926001`-style codes) with type/priority/status, assignment (tracked independently of status), attachments, notes, and GEMS-style resolution codes. Closing a ticket switches it to a locked summary view until reopened. Bulk creation (one ticket per selected asset with shared fields) and bulk closing (shared resolution across a selection, with cross-asset-type part-logging safeguards) are both supported.
- **Notes** — rich-text (Tiptap) or Markdown per note, on both assets and work orders, sanitized at write *and* read time.
- **Code files** — version-controlled source stored on an **asset type** (firmware, control logic), since one program runs on every unit of a class. Per-save history, side-by-side diffs, and rollback-as-a-new-version. Org-admin only, and editable from a linked work order, which stamps the resulting version with the ticket it came from. Which firmware a given unit is actually flashed with is deliberately *not* modelled here — that's an ordinary custom field on the asset.
- **Loans** — opt-in per asset type: check tools in and out with a full loan log. Access is granted per department by that department's lead (or an org admin); a partial unique index guarantees an asset can only be on loan once at a time.
- **Parts** — per-asset-type parts list with two distinct lists: reference **links** (URL + price, no order implied) and **order history** (price/quantity/date). Logging a part used on a work order auto-creates it under the asset's type on first use.
- **Mobile / PWA** — installable to a phone home screen, with a bottom tab bar and an in-app QR scanner (native `BarcodeDetector` where available, self-hosted zxing-wasm fallback on iOS). Scanning an asset with open tickets surfaces them before navigating. Static assets are cached offline; **application data is not** — see the Help article for the honest limits.
- **Selection UI** — a shared paginated/searchable list component (checkboxes, shift-click ranges, select-all-on-page, select-all-matching-filter) used across the Assets list, Work Orders list, and Asset Group member lists to drive every bulk action. Page size is selectable (10/25/50/100/250, default 10).
- **Auth** — invite-only signup, magic-link sign-in (Resend), optional PIN for trusted devices. Per-user identity badges (uploaded avatar, or icon + colour) shown wherever attribution appears.
- **Admin** — divisions/departments/roles, asset types with custom field schemas and documents, resolution codes, locations, users. Master data is editable in place rather than delete-and-recreate; user email is deliberately immutable.
- **Export** — Assets and Work Orders lists export to `.xlsx` or CSV. The export re-runs the *same* where-builder the list page used, so a filtered export can never disagree with what was on screen, and it covers every match rather than the current page. Columns are user-selected (remembered per list); asset custom fields are offered as columns when the list is narrowed to a single asset type. `.xlsx` cells are genuinely typed — dates as dates, numbers as numbers.
- **Printing** — a single work order prints as a one-page service record with signature lines, on its own route (the detail page is tabbed, so printing it directly would only capture the open tab).
- **Theming** — light / dark / follow-system, set per device, with an inline pre-paint script so there's no flash of the wrong theme. Implemented by remapping Tailwind v4's palette variables under `.dark` rather than adding `dark:` variants to ~840 utilities, which means new components theme automatically. Print always forces light.
- **Help** — an in-app wiki with search, seeded from `prisma/seed-help.ts` (32 articles).

## Getting started

Start the local Postgres container:

```bash
docker compose up -d postgres
```

Apply migrations and seed initial data (Ops division, departments, the Lamplighter asset type, help articles):

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
npx tsx prisma/seed-help.ts
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign-in is by magic link — with no `RESEND_API_KEY` configured in `.env`, links are logged to the console instead of emailed.

## Stack

Next.js 16 (App Router, TypeScript strict, Turbopack), Tailwind v4, Prisma 7 + Postgres (via `@prisma/adapter-pg`), JWT sessions via `jose`, S3-compatible storage for attachments/documents/avatars, Resend for transactional email. Tiptap for rich text, CodeMirror + `react-diff-viewer-continued` for code files, `barcode-detector` (zxing-wasm) for QR scanning, `write-excel-file` for xlsx export (chosen over SheetJS's `xlsx`, whose npm package has been abandoned since 2022, and over `exceljs`, ~3 years stale).

The PWA is hand-rolled — `app/manifest.ts` plus a service worker at `public/sw.js` — rather than `next-pwa`, which is webpack-based and unusable under Turbopack. The service worker is served from the origin root so its scope is `/` without needing a `Service-Worker-Allowed` header, and PWA assets are exempted from auth in `src/proxy.ts`'s matcher (a browser fetches the manifest and registers the worker outside a normal authenticated navigation).

`npm run prebuild` copies the zxing reader wasm out of `node_modules` into `public/` so scanning is served from our own origin rather than a CDN; the copied file is gitignored and regenerated each build.

## Backups

Nightly `pg_dump` to S3-compatible object storage, with a tested restore path.
Scripts in `scripts/backup/`, runbook and handover checklist in
[docs/BACKUP.md](docs/BACKUP.md). Nothing account-specific lives in the scripts —
all of it is in `/etc/chemistry-backup.env`, so transferring ownership of the
system is a config change rather than a code change.

## Deploying

Full start-to-finish setup instructions — server, Docker, object storage, email,
DNS, TLS, and backups — are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). It
assumes nothing pre-existing and creates every account and credential from
scratch.

Once an installation exists, deploying an update is:

```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Migrations and both seed scripts run automatically on container start.

The first administrator of a new deployment comes from `BOOTSTRAP_ADMIN_EMAIL`;
sign-up is invite-only, so without it a fresh instance has nobody who can invite
anyone.
