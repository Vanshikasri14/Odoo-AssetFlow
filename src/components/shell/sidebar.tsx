import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardCheck,
  BarChart3,
  History,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { SidebarNav, type NavLink } from "./sidebar-nav";

type RawNavItem = NavLink & { show?: (user: SessionUser) => boolean };

/**
 * The full nav — both devs' screens — filtered per-user below. `show` reads
 * `can.*` from `@/lib/rbac`, which is server-only, so this filtering must
 * happen here (a Server Component), not in the client-side `SidebarNav`.
 */
const ALL_ITEMS: RawNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/assets", label: "Assets", icon: <Boxes className="h-4 w-4" /> },
  { href: "/allocations", label: "Allocations", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { href: "/bookings", label: "Bookings", icon: <CalendarClock className="h-4 w-4" /> },
  { href: "/maintenance", label: "Maintenance", icon: <Wrench className="h-4 w-4" /> },
  {
    // Shown to EVERYONE, deliberately. The brief lets an Admin assign any
    // employee as an auditor — and the seed does exactly that (Karthik and Divya
    // are Employees). Gating this nav item on can.approve() left assigned
    // auditors with no way to reach the checklist they'd been given.
    // The page itself decides what each role may do once inside.
    href: "/audits",
    label: "Audits",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <BarChart3 className="h-4 w-4" />,
    show: (user) => can.viewAllAnalytics(user),
  },
  {
    // Everyone can see the activity log — but it SCOPES itself: an Employee sees
    // only their own actions, a manager sees the organisation. See listActivity().
    href: "/activity",
    label: "Activity",
    icon: <History className="h-4 w-4" />,
  },
  {
    // The Admin-only master-data screen: departments, categories, and the
    // employee directory (the one place roles are granted).
    href: "/organization",
    label: "Organization",
    icon: <Users className="h-4 w-4" />,
    show: (user) => can.manageOrg(user),
  },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const items: NavLink[] = ALL_ITEMS.filter((item) => !item.show || item.show(user)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        AssetFlow
      </div>
      <SidebarNav items={items} />
    </aside>
  );
}
