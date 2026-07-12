import type { Tx } from "@/lib/db";

/**
 * Odoo's `ir.sequence`, faithfully.
 *
 * Why not `COUNT(*) + 1`? Two reasons, both of which bite in production:
 *   1. Two concurrent registrations read the same count and mint AF-0007 twice.
 *   2. Archive a record and the next count collides with a tag already issued.
 *
 * The ERP answer is a dedicated counter row, incremented under a row-level lock.
 * `FOR UPDATE` serialises concurrent callers: the second one blocks until the
 * first commits, then reads the already-incremented value.
 */
export async function nextByCode(tx: Tx, code: string): Promise<string> {
  const rows = await tx.$queryRaw<
    { prefix: string; padding: number; number_next: number; number_increment: number }[]
  >`
    SELECT prefix, padding, number_next, number_increment
    FROM ir_sequence
    WHERE code = ${code}
    FOR UPDATE
  `;

  const seq = rows[0];
  if (!seq) {
    throw new Error(
      `ir_sequence "${code}" is not defined. Add it to prisma/seed.ts.`,
    );
  }

  const current = seq.number_next;

  await tx.$executeRaw`
    UPDATE ir_sequence
    SET number_next = number_next + number_increment,
        write_date  = NOW()
    WHERE code = ${code}
  `;

  return `${seq.prefix}${String(current).padStart(seq.padding, "0")}`;
}

/** Sequence codes, mirroring Odoo's dotted model names. */
export const SEQ = {
  ASSET: "asset.asset",
  MAINTENANCE: "maintenance.request",
  AUDIT_CYCLE: "audit.cycle",
  TRANSFER: "asset.transfer.request",
} as const;
