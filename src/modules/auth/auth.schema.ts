import { z } from "zod";

/**
 * ⚠️  READ THIS BEFORE ADDING A FIELD.
 *
 * There is no `role` here, and there must never be one.
 *
 * The brief: "Signup creates an Employee account only — no role selection at
 * signup. Admin promotes from the Employee Directory — this is the only place
 * roles are assigned."
 *
 * A `role` field that is merely *optional*, or defaulted, or hidden in the form,
 * still lets an attacker POST `role=admin` and self-elevate. The only safe design
 * is for the signup path to be structurally incapable of expressing a role: the
 * schema has no such key, so `formData.get("role")` is never read, and the value
 * is hardcoded at the call site.
 */
export const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  login: z.email("Enter a valid email address.").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const loginSchema = z.object({
  login: z.email("Enter a valid email address.").toLowerCase().trim(),
  password: z.string().min(1, "Enter your password."),
});

export const forgotSchema = z.object({
  login: z.email("Enter a valid email address.").toLowerCase().trim(),
});

/**
 * The shape `useActionState` carries back to the form. `fieldErrors` maps a field
 * name to its messages; `error` is for failures that belong to the form as a
 * whole ("email already registered", "incorrect password").
 */
export type AuthFormState =
  | {
      ok?: string;
      error?: string;
      fieldErrors?: Partial<Record<"name" | "login" | "password", string[]>>;
      values?: { name?: string; login?: string };
    }
  | undefined;
