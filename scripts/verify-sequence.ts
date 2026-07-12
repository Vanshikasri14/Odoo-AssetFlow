/**
 * Proves asset tags are issued safely — the reason `ir_sequence` exists instead
 * of `COUNT(*) + 1`.
 *
 * Hits the exact code path registerAsset() uses: a transaction wrapping
 * nextByCode(), which takes a row-level lock (SELECT … FOR UPDATE).
 *
 * Test 2 is the one that matters. Five registrations fired at the same instant.
 * With a count-based scheme all five read the same count and mint the SAME tag.
 * With a locked sequence, each blocks on the last and gets a distinct number.
 *
 *   npx tsx --env-file=.env scripts/verify-sequence.ts
 *
 * (The service layer itself can't be imported here — it's marked `server-only`,
 * which refuses to load outside a Server Component. That guard is working as
 * intended, so we exercise the mechanism it wraps.)
 */
import { PrismaClient } from "@prisma/client";
import { nextByCode, SEQ } from "../src/modules/core/sequence.service";

const db = new PrismaClient();
const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m: string) => {
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`);
  process.exitCode = 1;
};

/** One tag, issued exactly as registerAsset() issues it. */
const issueTag = () => db.$transaction((tx) => nextByCode(tx, SEQ.ASSET));

async function main() {
  const before = await db.irSequence.findUniqueOrThrow({ where: { code: SEQ.ASSET } });
  console.log(`\n  ir_sequence('${SEQ.ASSET}') is at number_next = ${before.numberNext}`);

  console.log("\n\x1b[1mTEST 1 — sequential issues are sequential\x1b[0m");
  const a = await issueTag();
  const b = await issueTag();
  ok(`${a} then ${b}`);

  const na = Number(a.split("-")[1]);
  const nb = Number(b.split("-")[1]);
  if (nb === na + 1) ok("second tag is exactly one greater");
  else bad(`expected ${na + 1}, got ${nb}`);

  console.log("\n\x1b[1mTEST 2 — five CONCURRENT issues get five DISTINCT tags\x1b[0m");
  console.log("  \x1b[2m(this is precisely the case COUNT(*) + 1 gets wrong)\x1b[0m");

  const tags = await Promise.all(Array.from({ length: 5 }, issueTag));
  const unique = new Set(tags);

  console.log(`  issued: ${[...tags].sort().join(", ")}`);
  if (unique.size === 5) ok("all five distinct — the row lock held under concurrency");
  else bad(`only ${unique.size} distinct tags out of 5 — COLLISION`);

  // Hand the consumed numbers back, so the demo data stays tidy.
  await db.irSequence.update({
    where: { code: SEQ.ASSET },
    data: { numberNext: before.numberNext },
  });
  console.log(`\n  sequence rewound to ${before.numberNext} — no demo tags consumed`);

  console.log(
    process.exitCode
      ? "\n\x1b[31m✗ Tag issuance is NOT race-safe.\x1b[0m\n"
      : "\n\x1b[32m✓ Tag issuance is race-safe.\x1b[0m\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
