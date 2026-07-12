import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

const COOKIE = "assetflow_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.");
  return new TextEncoder().encode(s);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: number;
  name: string;
  login: string;
  role: UserRole;
  departmentId: number | null;
};

/**
 * The current user, or null. Wrapped in React `cache()` so that the ten
 * components that need it in a single render share ONE database round-trip.
 *
 * Note we re-read the user from the database rather than trusting claims baked
 * into the JWT: an Admin who demotes someone mid-session must have that take
 * effect immediately, not in seven days when the token expires.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;

    const user = await db.resUsers.findFirst({
      where: { id, active: true },
      select: { id: true, name: true, login: true, role: true, departmentId: true },
    });

    return user;
  } catch {
    return null; // expired, tampered, or signed with an old secret
  }
});
