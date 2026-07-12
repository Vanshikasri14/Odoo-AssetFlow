import { LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "./actions";

export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <div className="text-right">
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
