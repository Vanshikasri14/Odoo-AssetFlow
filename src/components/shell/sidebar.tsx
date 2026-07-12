import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardCheck,
  BarChart3,
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
    href: "/audits",
    label: "Audits",
    icon: <ClipboardCheck className="h-4 w-4" />,
    show: (user) => can.approve(user),
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <BarChart3 className="h-4 w-4" />,
    show: (user) => can.viewAllAnalytics(user),
  },
  {
    href: "/directory",
    label: "Directory",
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
