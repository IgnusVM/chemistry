<!--
SYNC IMPACT REPORT
==================
Version change: (initial template) → 1.0.0
Bump rationale: Initial ratification. All template placeholders replaced with principles
drawn from this codebase's observed practice rather than generic engineering advice.

Principles defined (6):
  I.   Framework Truth Comes From node_modules (NON-NEGOTIABLE)
  II.  Authorization Lives at the Data Layer (NON-NEGOTIABLE)
  III. Migrations Are Additive and Never Destructive
  IV.  Verify by Running, Not by Reading (NON-NEGOTIABLE)
  V.   The Field User Is the Constraint
  VI.  Beta Users Are Real Users

Sections added:
  - Technology Constraints (replaces [SECTION_2_NAME])
  - Development Workflow (replaces [SECTION_3_NAME])
  - Governance

Templates requiring updates:
  ✅ .specify/templates/plan-template.md  — Constitution Check gate is generic; principles
                                             apply as written, no edit required
  ✅ .specify/templates/spec-template.md  — no structural change needed
  ✅ .specify/templates/tasks-template.md — verification tasks map onto Principle IV without
                                             structural change
  ✅ AGENTS.md                            — Principle I restates a rule AGENTS.md already
                                             enforces; no conflict introduced

Deferred TODOs: none.
-->

# Chemistry Constitution

Chemistry is an asset-management and maintenance system for Alchemy, a US nonprofit that
runs one weekend-long event per year. It is in **beta**, with organization members actively
using the hosted instance.

These principles are drawn from how this codebase actually works and from defects it has
actually produced. They are not generic engineering advice, and each one exists because
ignoring it has cost something.

## Core Principles

### I. Framework Truth Comes From node_modules (NON-NEGOTIABLE)

The Next.js version in this repository contains breaking changes relative to any model's
training data. Before writing framework code, the relevant guide in
`node_modules/next/dist/docs/` MUST be read. Deprecation notices MUST be heeded rather than
worked around.

This applies to Prisma, Tailwind, and React equally: the installed version is the authority,
not recollection of how the library used to behave.

*Rationale*: Already enforced in `AGENTS.md`. Restated here because it is the single most
common source of confidently wrong code in this project — Tailwind v4 has no
`tailwind.config.*`, Prisma 7 requires a driver adapter, and Next 16 forbids patterns that
were idiomatic one major version ago.

### II. Authorization Lives at the Data Layer (NON-NEGOTIABLE)

Every server action MUST independently establish the current user and verify their access
against the specific record it is about to modify. Bulk actions MUST re-check access per
record they touch, never trusting the query that selected them.

The proxy and middleware layers are defence in depth. They MUST NOT be the authorization
boundary, and no action may rely on having been reached through them.

The read and write models are deliberately asymmetric and MUST stay that way:

- **Reads are org-wide.** Any signed-in user may view any asset or work order.
- **Writes are department-gated.** Mutation requires membership of the owning department at
  the required role, or org-admin.

*Rationale*: An earlier version scoped reads with a query parameter that a caller could
supply, which silently widened access instead of narrowing it. The fix was to make the read
model uniformly open and honest rather than to maintain a boundary that was never enforced
end to end. Write authorization was verified per record before that change shipped, precisely
because select-all feeds the bulk paths.

### III. Migrations Are Additive and Never Destructive

The migration workflow is non-interactive and MUST be followed:

1. `prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script`
2. Hand-create the timestamped folder using `date -u +%Y%m%d%H%M%S`
3. Hand-edit the generated SQL
4. `prisma migrate deploy`, then `prisma generate`

Before any migration that drops or rewrites a column, **both** the local and the production
database MUST be checked for real data. Constructs Prisma cannot express — partial unique
indexes among them — MUST be hand-written into the migration SQL and commented.

Migrations run automatically on container start, so a migration that is unsafe against live
data is a production incident, not a review comment.

*Rationale*: The production database holds real organizational records and the deploy path
applies migrations without a human in the loop. The dev server also caches the generated
Prisma client, so `generate` after every schema change is not optional.

### IV. Verify by Running, Not by Reading (NON-NEGOTIABLE)

Typechecking and linting are necessary and insufficient. Behaviour MUST be confirmed by
executing the code against real or realistic data before it is considered done.

Security-relevant changes MUST be exercised against adversarial input, not merely inspected.
Data changes MUST be verified against actual rows.

*Rationale*: This has repeatedly caught defects that passed `tsc` cleanly. A sanitizer using
`instanceof Element` typechecked perfectly and threw under jsdom, which would have broken
every note and help page in production; it was caught by running it, not by reading it.
A redirect validator that looked obviously correct accepted `//evil.com`.

### V. The Field User Is the Constraint

Many users are phone-only, non-technical volunteers working in dust and sun with poor or
absent connectivity. Every feature MUST be designed for:

- **A phone first.** Desktop is the secondary target, not the primary one.
- **Someone untrained.** A volunteer who has never seen the feature must be able to complete
  the task without instruction.
- **Degraded networks.** A feature that fails without connectivity MUST say so clearly rather
  than appearing to work.

Interaction SHOULD favour scanning and tapping over typing. Every added field and concept
carries a real training cost across a volunteer body with turnover, and that cost MUST be
weighed against the field's value rather than assumed away.

*Rationale*: The organization deploys once a year, in a place with limited connectivity, using
people who did not choose the software. A feature that is excellent on a laptop and unusable
in a dust storm has failed at the moment it was needed.

### VI. Beta Users Are Real Users

The hosted instance is in active use by the organization. Therefore:

- Feature work happens on a **branch, in local development**.
- Nothing reaches production without an explicit decision to deploy.
- Any migration must be safe to apply to live data, and the path back must be verified before
  it is applied — not designed afterwards.

*Rationale*: Beta is not a rehearsal. The records in the hosted database are the
organization's actual inventory, and a member using the system today is doing real work with
it.

## Technology Constraints

**Stack**: Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4
(CSS-based config), Prisma 7 with `@prisma/adapter-pg` against PostgreSQL 17, `jose` for JWT
sessions, S3-compatible object storage, Resend HTTP API for mail.

**Deployment**: Two containers behind host nginx with certbot TLS. Migrations and both seed
scripts run on container start.

**Constraints that have bitten before, and MUST be respected:**

- `reactStrictMode` stays disabled where noted; re-enabling it has broken WebGL contexts.
- The PWA is hand-rolled (`app/manifest.ts` + `public/sw.js`) because `next-pwa` is
  webpack-based and unusable under Turbopack. PWA assets are exempted in the proxy **matcher**,
  not via a public-routes list — a public route also triggers the signed-in redirect, which
  breaks `/sw.js` for installed-app users.
- Uploads proxy through the server; downloads use presigned URLs. The bucket blocks all public
  access and needs no CORS configuration.
- Server-only modules (`import "server-only"`) cannot be imported by test scripts run under
  `tsx`. Test the underlying helper directly, or strip the guard in a temporary copy.

## Development Workflow

**Before writing framework code**: read the installed docs (Principle I).

**Before committing**: `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean, plus
actual execution of the changed behaviour (Principle IV).

**Schema changes**: follow the migration workflow in Principle III exactly, and restart the
dev server afterwards — it caches the generated client.

**Version and commit**: bump the version in `package.json`, then commit and push. Commit
messages state what changed and why, not which files moved.

**Deployment** is a separate, explicit act: `git pull` on the server followed by
`docker compose -f docker-compose.prod.yml up -d --build`. During beta it requires a decision,
not a habit (Principle VI).

## Governance

This constitution governs work in this repository. Where any other practice conflicts with it,
this document wins — except where `AGENTS.md` is more specific, in which case both apply and
the stricter reading governs.

**Amendment procedure**: amendments are made by editing this file, incrementing the version and
recording a Sync Impact Report at the top. Dependent templates and documents affected MUST be
updated in the same change or explicitly listed as pending.

**Versioning policy**:

- **MAJOR** — a principle is removed or redefined in a way that invalidates existing practice.
- **MINOR** — a principle or section is added, or guidance is materially expanded.
- **PATCH** — clarification and wording.

**Compliance review**: every change is checked against Principles II, III, and IV before it is
committed — authorization verified at the data layer, migrations confirmed non-destructive
against real data, and behaviour actually executed. A change failing any of the three is
corrected rather than merged with a note to fix later.

**Complexity justification**: added fields, concepts, and screens MUST be justified against
Principle V. Complexity that a volunteer has to learn is a cost paid by every user, every year,
against a body that turns over.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
