import type { Metadata } from "next";
import { AuthForm } from "@/modules/auth/components/auth-form";
import { signup } from "@/modules/auth/auth.actions";

export const metadata: Metadata = { title: "Create account · AssetFlow" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />;
}
