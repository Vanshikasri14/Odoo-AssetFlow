/**
 * Applies prisma/constraints.sql — the business rules Prisma's schema language
 * cannot express (partial unique index, GiST exclusion constraint, CHECKs).
 *
 * Idempotent: every statement is DROP-IF-EXISTS / CREATE-IF-NOT-EXISTS, so it
 * is safe to re-run after every `prisma db push`. Wired into `npm run db:setup`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const sql = readFileSync(join(process.cwd(), "prisma", "constraints.sql"), "utf8");

  // Split on semicolons that terminate a statement, but keep `DO $$ … $$;`
  // blocks whole — they legally contain semicolons inside the body.
  const statements: string[] = [];
  let buffer = "";
  let inDollarBlock = false;

  for (const line of sql.split("\n")) {
    if (line.includes("$$")) {
      // A line with an odd number of $$ toggles us in or out of the block.
      const count = (line.match(/\$\$/g) ?? []).length;
      if (count % 2 === 1) inDollarBlock = !inDollarBlock;
    }
    buffer += line + "\n";
    if (!inDollarBlock && line.trimEnd().endsWith(";")) {
      const stmt = buffer.trim();
      // Skip chunks that are nothing but comments.
      if (stmt.split("\n").some((l) => l.trim() && !l.trim().startsWith("--"))) {
        statements.push(stmt);
      }
      buffer = "";
    }
  }

  for (const stmt of statements) {
    const label = stmt.split("\n").find((l) => l.trim() && !l.trim().startsWith("--"))?.slice(0, 68);
    try {
      await db.$executeRawUnsafe(stmt);
      console.log(`  ✓ ${label}…`);
    } catch (err) {
      console.error(`  ✗ ${label}…`);
      throw err;
    }
  }

  console.log(`\n✅ Applied ${statements.length} constraint statements.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
