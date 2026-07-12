import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

/**
 * A styled native <select>. Deliberately not a Radix/headless combobox — this
 * ships four features in a hackathon, not a design system. `<option>` children
 * are passed in as usual.
 */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-zinc-200 bg-white px-3 pr-8 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-100",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
  ),
);
Select.displayName = "Select";
