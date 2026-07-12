"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
} from "@/lib/auth";
import { logMessage, MODEL } from "@/modules/core/chatter.service";
import { loginSchema, signupSchema, type AuthFormState } from "./auth.schema";

/**
 * Create an account.
 *
 * Note what is NOT here: any read of a `role` field. `role: "employee"` is a
 * literal, written at this one call site. There is no code path — no hidden
 * input, no crafted POST body, no query parameter — by which a signing-up user
 * can arrive with any other role. Promotion happens in exactly one other place:
 * `promoteUser()` in the HR module, behind `assertRole(["admin"])`.
 */
export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    login: String(formData.get("login") ?? ""),
  };

  const parsed = signupSchema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      values,
    };
  }

  const { name, login, password } = parsed.data;

  const existing = await db.resUsers.findUnique({
    where: { login },
    select: { id: true },
  });

  if (existing) {
    return { error: "An account with that email already exists.", values };
  }

  const user = await db.resUsers.create({
    data: {
      name,
      login,
      password: await hashPassword(password),
      role: "employee", // ← the whole security model, in one word.
    },
    select: { id: true, name: true },
  });

  await logMessage(db, {
    model: MODEL.USER,
    resId: user.id,
    action: "signup",
    body: `${user.name} created an account.`,
    authorId: user.id,
  });

  await createSession(user.id);

  // `redirect` works by throwing, so it must sit outside any try/catch.
  redirect("/dashboard");
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { login: String(formData.get("login") ?? "") };

  const parsed = loginSchema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  const user = await db.resUsers.findUnique({
    where: { login: parsed.data.login },
    select: { id: true, password: true, active: true },
  });

  // Deliberately one message for "no such user" and "wrong password". Telling an
  // attacker which of the two they got wrong hands them a way to enumerate who
  // works here.
  const INVALID = "Email or password is incorrect.";

  if (!user) {
    // Hash anyway, so a missing account doesn't return measurably faster than a
    // wrong password and leak existence through timing.
    await hashPassword(parsed.data.password);
    return { error: INVALID, values };
  }

  const okPassword = await verifyPassword(parsed.data.password, user.password);
  if (!okPassword) return { error: INVALID, values };

  if (!user.active) {
    return { error: "This account has been deactivated. Contact your administrator.", values };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** For client components that need the signed-in user (the header, the nav). */
export async function currentUser() {
  return getCurrentUser();
}
