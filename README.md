# Chemistry

Asset management system for Alchemy departments — serial-level tracking, build provenance, and failure history for the Lamplighter fleet and beyond.

## Getting started

Start the local Postgres container:

```bash
docker compose up -d postgres
```

Apply migrations and seed initial data (Ops division, departments, the Lamplighter asset type):

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign-in is by magic link — with no `SMTP_HOST` configured in `.env`, links are logged to the console instead of emailed.

## Stack

Next.js 16 (App Router, TypeScript strict), Tailwind v4, Prisma 7 + Postgres, JWT sessions via `jose`.
