"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/utils";

export type NavLink = { href: string; label: string; icon: React.ReactNode };

/**
 * The active-link highlighting needs `usePathname`, which forces this piece
 * client-side — everything else about the sidebar (auth check, role filter)
 * stays server-side in `sidebar.tsx`.
 */
export function SidebarNav({ items }: { items: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
