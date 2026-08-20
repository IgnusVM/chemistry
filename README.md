# Chemistry

Asset and maintenance management for Alchemy — serial-level asset tracking, work orders, parts, and failure history for the Lamplighter fleet and beyond. Live at [chemistry.distributed-authoring-nexus.com](https://chemistry.distributed-authoring-nexus.com).

## Features

- **Assets** — serial-level tracking with per-asset-type custom fields, QR codes, location history, and acquisition value. Single or bulk creation (sequential tags or a pasted list), asset groups, and bulk edit (status/location) across a filtered selection.
- **Work orders** — auto-numbered tickets (`CM081926001`-style codes) with type/priority/status, assignment (tracked independently of status), photos, notes, and GEMS-style resolution codes. Closing a ticket switches it to a locked summary view until reopened. Bulk creation (one ticket per selected asset with shared fields) and bulk closing (shared resolution across a selection, with cross-asset-type part-logging safeguards) are both supported.
- **Parts** — per-asset-type parts list with order history (price/link/date); logging a part used on a work order auto-creates it under the asset's type on first use.
- **Selection UI** — a shared paginated/searchable list component (checkboxes, shift-click ranges, select-all-on-page, select-all-matching-filter) used across the Assets list, Work Orders list, and Asset Group member lists to drive every bulk action.
- **Auth** — invite-only signup, magic-link sign-in (Resend), optional PIN for trusted devices.
- **Admin** — divisions/departments/roles, asset types with custom field schemas and documents, resolution codes, locations, users.
- **Help** — an in-app wiki with search, seeded from `prisma/seed-help.ts`.

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

Next.js 16 (App Router, TypeScript strict), Tailwind v4, Prisma 7 + Postgres (via `@prisma/adapter-pg`), JWT sessions via `jose`, S3-compatible storage for photos/documents, Resend for transactional email.

## Deploying

`git push`, then on the server: `cd /opt/chemistry && git pull && docker compose -f docker-compose.prod.yml up -d --build`. Migrations and both seed scripts run automatically on container start.
