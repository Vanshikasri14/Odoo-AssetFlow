/**
 * ⚠️  DEV B — THIS FILE IS YOURS. REPLACE IT ENTIRELY.
 *
 * This is a placeholder so that login/signup have somewhere to land. It proves
 * the session works and shows the signed-in user's role. Build the real KPI
 * dashboard here (Screen 2) — see docs/DEV-B-TASKS.md.
 */
import { logout } from "@/modules/auth/auth.actions";
import { requireUser } from "@/lib/rbac";
import { ROLE_LABEL } from "@/lib/rbac";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-slate-500">Signed in as</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{user.name}</h1>

      <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
        {[
          ["Email", user.login],
          ["Role", ROLE_LABEL[user.role]],
          ["Department", user.departmentId ? `#${user.departmentId}` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Placeholder. Dev B replaces this with the KPI dashboard (Screen 2).
      </p>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
