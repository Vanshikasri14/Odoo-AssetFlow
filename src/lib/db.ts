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
