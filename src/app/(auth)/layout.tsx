import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in? The login screen isn't useful to you.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="flex items-center justify-center bg-white px-6 py-12">{children}</main>

      {/* Marketing side. Hidden on small screens — nobody signs in on a phone to
          read a value proposition. */}
      <aside className="relative hidden overflow-hidden bg-zinc-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(148,163,184,0.15),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            Know who holds what, where it is, and what condition it&apos;s in.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            AssetFlow replaces the spreadsheet: structured asset lifecycles, conflict-free
            allocation, overlap-free booking, and approval-gated maintenance — for every
            department, in one place.
          </p>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
            {[
              ["7", "lifecycle states"],
              ["0", "double bookings"],
              ["100%", "audit trail"],
            ].map(([stat, label]) => (
              <div key={label}>
                <dt className="text-2xl font-semibold text-white">{stat}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-zinc-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
