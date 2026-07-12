import type { Metadata } from "next";
import { AuthForm } from "@/modules/auth/components/auth-form";
import { login } from "@/modules/auth/auth.actions";

export const metadata: Metadata = { title: "Sign in · AssetFlow" };

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />;
}
