import { LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { getUnreadCount, listNotifications } from "@/modules/core/notification.service";
import { NotificationBell } from "@/modules/core/components/notification-bell";
import { MobileNav } from "./mobile-nav";
import { navItemsFor } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "./actions";

export async function Header({ user }: { user: SessionUser }) {
  // The header renders on EVERY page, so every query here is a tax on every
  // navigation — on a database ~80ms away. It used to pull 30 notification rows
  // to populate a dropdown most people never open; six is plenty for a preview.
  const [notifications, unread] = await Promise.all([
    listNotifications(user.id, 6),
    getUnreadCount(user.id),
  ]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:px-6 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Below `lg` the sidebar is gone, so the nav lives behind this hamburger.
          At `lg` and up it renders nothing at all. */}
      <MobileNav items={navItemsFor(user)} />

      {/*
        `ml-auto` — NOT `justify-between` on the header.

        With justify-between, the layout depended on the hamburger existing as a
        sibling to push against. At `lg` the hamburger is `hidden`, leaving a
        single flow child, and justify-between parks a lone item at the START —
        so the user's name and sign-out button jumped to the left of the header.

        ml-auto pushes this block right on its own, whether or not anything is
        sitting to its left.
      */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <NotificationBell notifications={notifications} unread={unread} />

        {/* The name and role are the first thing to go on a narrow screen: they
            are context, not controls. The bell and sign-out are controls. */}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{user.name}</p>
          <Badge variant="secondary" className="text-[10px]">
            {ROLE_LABEL[user.role]}
          </Badge>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
