import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
p.user.findFirst({ where: { email: { contains: "steven" } }, select: { isOrgAdmin: true, isDirector: true } })
 .then(u => { console.log("flags:", JSON.stringify(u)); return p.$disconnect(); });
