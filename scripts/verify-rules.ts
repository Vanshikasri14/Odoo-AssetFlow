/**
 * Proves the two headline business rules are enforced by POSTGRES, not by
 * application code — by attacking the database directly, bypassing every
 * service, guard and validation layer we have.
 *
 * If these pass, no amount of concurrency, double-clicking or hand-crafted
 * cURL can break the rules. Run with: npx tsx scripts/verify-rules.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m: string) => { console.log(`  \x1b[31m✗ ${m}\x1b[0m`); process.exitCode = 1; };

function todayAt(h: number, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}

async function main() {
  console.log("\n\x1b[1mRULE 1 — an asset cannot be held by two people at once\x1b[0m");

  const laptop = await db.assetAsset.findFirstOrThrow({ where: { name: 'MacBook Pro 14"' } });
  const raj = await db.resUsers.findUniqueOrThrow({ where: { login: "raj@assetflow.io" } });
  const neha = await db.resUsers.findUniqueOrThrow({ where: { login: "manager@assetflow.io" } });

  const holder = await db.assetAllocation.findFirst({
    where: { assetId: laptop.id, returnedDate: null },
    include: { holderUser: { select: { name: true } } },
  });
  ok(`${laptop.assetTag} is currently held by ${holder?.holderUser?.name}`);

  try {
    // Straight to the table. No service layer, no validation, no mercy.
    await db.assetAllocation.create({
      data: { assetId: laptop.id, holderUserId: raj.id, allocatedById: neha.id, state: "active" },
    });
    bad("DOUBLE ALLOCATION SUCCEEDED — the partial unique index is missing!");
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { target?: unknown } };
    if (err.code === "P2002") {
      // P2002 = unique constraint violation. `target` names the index that fired.
      ok(`Postgres REJECTED the second allocation (P2002 on ${JSON.stringify(err.meta?.target)})`);
    } else {
      bad(`Rejected, but not by the index we expected: ${String(e).slice(0, 120)}`);
    }
  }

  console.log("\n\x1b[1mRULE 2 — bookings of one resource cannot overlap\x1b[0m");

  const b2 = await db.assetAsset.findFirstOrThrow({ where: { name: "Room B2" } });
  ok(`Room B2 (${b2.assetTag}) is booked 09:00–10:00 today`);

  // The brief's rejection case: 09:30–10:30 overlaps 09:00–10:00.
  try {
    await db.resourceBooking.create({
      data: { assetId: b2.id, userId: raj.id, name: "SHOULD BE REJECTED",
        startDatetime: todayAt(9, 30), endDatetime: todayAt(10, 30) },
    });
    bad("09:30–10:30 was ACCEPTED — the exclusion constraint is missing!");
  } catch (e: unknown) {
    if (String(e).includes("resource_booking_no_overlap")) {
      ok("Postgres REJECTED 09:30–10:30 (resource_booking_no_overlap)");
    } else {
      bad(`Rejected, but not by the constraint we expected: ${String(e).slice(0, 120)}`);
    }
  }

  // The brief's acceptance case: 10:00–11:00 starts exactly when the other ends.
  // Half-open ranges [start, end) make this legal. This is the subtle one.
  try {
    const b = await db.resourceBooking.create({
      data: { assetId: b2.id, userId: raj.id, name: "SHOULD BE ACCEPTED",
        startDatetime: todayAt(10), endDatetime: todayAt(11) },
    });
    ok("Postgres ACCEPTED 10:00–11:00 (touching endpoints do not overlap)");
    await db.resourceBooking.delete({ where: { id: b.id } }); // leave the demo pristine
  } catch (e: unknown) {
    bad(`10:00–11:00 was REJECTED — the range is not half-open! ${String(e).slice(0, 120)}`);
  }

  console.log(
    process.exitCode
      ? "\n\x1b[31m✗ Some rules are NOT enforced.\x1b[0m\n"
      : "\n\x1b[32m✓ Both rules are enforced at the database level.\x1b[0m\n",
  );
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
