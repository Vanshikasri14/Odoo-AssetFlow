import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Every service function accepts a `Tx` rather than importing `db` directly, so
 * it can be composed into a larger transaction by its caller. This is what lets
 * "approve maintenance" atomically write the request, flip the asset state, log
 * the message and fan out the notification — all or nothing.
 */
export type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * ⚠️ COLD STARTS — read before the demo.
 *
 * Neon's free tier suspends the compute after a few minutes of inactivity. The
 * first request afterwards can land on a connection the pool still believes is
 * alive, and Prisma throws before the database finishes waking. It recovers on
 * the very next request.
 *
 * We deliberately do NOT retry inside the client: a Prisma extension that wraps
 * $allOperations breaks the `Tx` type every service depends on, and the trade is
 * not worth it. The mitigation is operational, not architectural:
 *
 *   → Load the app once, a minute before demoing it. That's it.
 *
 * (If this were production, the fix would be a health-check ping keeping the
 * compute warm, or a paid tier that doesn't suspend.)
 */
