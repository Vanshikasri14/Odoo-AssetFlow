import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, ORG_ADMINS } from "@/lib/rbac";
import { listCategories, listDepartments, listEmployees } from "@/modules/hr/hr.service";
import { DepartmentTab } from "@/modules/hr/components/department-tab";
import { CategoryTab } from "@/modules/hr/components/category-tab";
import { EmployeeTab } from "@/modules/hr/components/employee-tab";

export const metadata: Metadata = { title: "Organization · AssetFlow" };

const TABS = [
  { key: "departments", label: "Departments" },
  { key: "categories", label: "Asset Categories" },
  { key: "employees", label: "Employee Directory" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Admin only. A non-admin who guesses this URL is redirected, not shown a
  // half-rendered page.
  const me = await requireRole(ORG_ADMINS);

  const { tab } = await searchParams;
  const active: Tab = TABS.some((t) => t.key === tab) ? (tab as Tab) : "departments";

  // Tab state lives in the URL rather than in React state: it survives a refresh,
  // it can be linked to, and the back button behaves the way people expect.
  //
  // Departments and employees are both small tables and both tabs need them
  // (the department form needs a people list for the Head selector), so they're
  // fetched unconditionally, in parallel. Categories are only fetched when shown.
  const [departments, employees, categories] = await Promise.all([
    listDepartments(),
    listEmployees(),
    active === "categories" ? listCategories() : Promise.resolve([]),
  ]);

  const activeDepartments = departments.filter((d) => d.active).map((d) => ({ id: d.id, name: d.name }));
  const activePeople = employees.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Organization setup</h1>
        <p className="mt-1 text-sm text-slate-500">
          The master data everything else depends on — departments, categories, and who works here.
        </p>
      </header>

      <nav className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/organization?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {active === "departments" && (
        <DepartmentTab departments={departments} people={activePeople} />
      )}

      {active === "categories" && <CategoryTab categories={categories} />}

      {active === "employees" && (
        <EmployeeTab employees={employees} departments={activeDepartments} meId={me.id} />
      )}
    </main>
  );
}
