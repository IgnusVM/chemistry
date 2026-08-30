/**
 * Bring the org structure on the server in line with the actual organisation.
 *
 * Run with:
 *   NODE_OPTIONS=--conditions=react-server npx tsx --env-file=.env scripts/seed-org-structure.ts
 * Add `--apply` to write. Dry run otherwise, because this touches a live org and
 * two of the changes are permission grants.
 *
 * Idempotent throughout: every step checks for what it is about to create and
 * reports "already correct" rather than doing it twice.
 *
 * Boards for anything created here are made by prisma/seed.ts on the next
 * container start. It enumerates every department and division from the
 * database rather than a fixed list, so a restart is all that is needed.
 */
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const changes: string[] = [];
const noop: string[] = [];

async function userByEmail(email: string) {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new Error(`No account for ${email}. Nothing was changed.`);
  return u;
}

async function main() {
  const mamaCat = await userByEmail("0cancer0@gmail.com");
  const jaysen = await userByEmail("oberones@gmail.com");
  const crystal = await userByEmail("crystal@flashpointart.org");
  const jane = await userByEmail("jane@flashpointart.org");

  // --- Art division ---
  let art = await prisma.division.findUnique({ where: { slug: "art" } });
  if (art) {
    noop.push(`division "Art" already exists`);
  } else {
    changes.push(`create division "Art"`);
    if (APPLY) art = await prisma.division.create({ data: { name: "Art", slug: "art" } });
  }

  // --- Art Curators, under Art, co-led by Mama Cat ---
  const curators = await prisma.department.findUnique({ where: { slug: "art-curators" } });
  if (curators) {
    noop.push(`department "Art Curators" already exists`);
  } else {
    changes.push(`create department "Art Curators" under Art, lead ${mamaCat.displayName}`);
    if (APPLY) {
      if (!art) throw new Error("Art division missing after create step");
      await prisma.department.create({
        data: {
          name: "Art Curators",
          slug: "art-curators",
          divisionId: art.id,
          // A single named point of contact is all the schema holds. The other
          // co-lead gets the same LEAD membership when they have an account,
          // which is where the permissions actually come from.
          leadUserId: mamaCat.id,
        },
      });
    }
  }

  // --- Mama Cat's LEAD membership: this is what grants her access ---
  const dept = await prisma.department.findUnique({ where: { slug: "art-curators" } });
  if (dept) {
    const existing = await prisma.departmentMembership.findUnique({
      where: { userId_departmentId: { userId: mamaCat.id, departmentId: dept.id } },
    });
    if (existing?.role === "LEAD") {
      noop.push(`${mamaCat.displayName} is already LEAD of Art Curators`);
    } else {
      changes.push(`${existing ? "promote" : "add"} ${mamaCat.displayName} as LEAD of Art Curators`);
      if (APPLY) {
        await prisma.departmentMembership.upsert({
          where: { userId_departmentId: { userId: mamaCat.id, departmentId: dept.id } },
          update: { role: "LEAD" },
          create: { userId: mamaCat.id, departmentId: dept.id, role: "LEAD" },
        });
      }
    }
  } else if (APPLY) {
    throw new Error("Art Curators missing after create step");
  } else {
    changes.push(`add ${mamaCat.displayName} as LEAD of Art Curators (once it exists)`);
  }

  // --- Jaysen leads the Ops division ---
  const ops = await prisma.division.findUnique({ where: { slug: "ops" } });
  if (!ops) {
    noop.push(`no "ops" division found, skipping division lead`);
  } else if (ops.leadUserId === jaysen.id) {
    noop.push(`${jaysen.displayName} already leads Ops`);
  } else {
    changes.push(`set ${jaysen.displayName} as lead of the Ops division`);
    if (APPLY) await prisma.division.update({ where: { id: ops.id }, data: { leadUserId: jaysen.id } });
  }

  // --- Crystal and Jane are Directors ---
  // Their existing isOrgAdmin flag is left alone. getCurrentUser ORs the two, so
  // holding both is harmless, and dropping a permission nobody asked to drop is
  // the kind of change that goes unnoticed until it bites.
  for (const u of [crystal, jane]) {
    if (u.isDirector) {
      noop.push(`${u.displayName} is already a Director`);
    } else {
      changes.push(`grant Director to ${u.displayName} <${u.email}>`);
      if (APPLY) await prisma.user.update({ where: { id: u.id }, data: { isDirector: true } });
    }
  }

  if (noop.length) {
    console.log("already correct:");
    for (const n of noop) console.log(`  ${n}`);
    console.log("");
  }
  console.log(APPLY ? "applied:" : "would change:");
  for (const c of changes) console.log(`  ${c}`);
  if (!changes.length) console.log("  nothing");
  if (!APPLY) console.log("\nDry run. Pass --apply to write.");
  else console.log("\nRestart the app container so the seed creates boards for anything new.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
