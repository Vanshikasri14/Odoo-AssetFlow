import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800",
        className,
      )}
    >
      {Icon && <Icon className="mb-2 h-10 w-10 text-zinc-400" />}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
