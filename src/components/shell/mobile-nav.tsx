"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/components/ui/utils";
import type { NavLink } from "./sidebar-nav";

/**
 * The navigation below `lg`, where the 240px sidebar would eat two thirds of a
 * phone screen.
 *
 * The links are computed on the SERVER (navItemsFor) and passed in already
 * filtered — this component never sees a link the user isn't allowed to have, so
 * the role logic doesn't leak into the client bundle.
 */
export function MobileNav({ items }: { items: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The drawer closes on the link's own onClick, not in an effect watching
  // `pathname`. Setting state from an effect in response to a route change means
  // React renders the open drawer over the new page, then immediately re-renders
  // it closed — a cascading render the compiler (rightly) rejects.

  // Close on Escape, and stop the page behind from scrolling while it's open.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop. Rendered rather than toggled with a class so it isn't in the
          DOM at all on desktop. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white",
          "transition-transform duration-200 ease-out lg:hidden",
          "dark:border-zinc-800 dark:bg-zinc-950",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
