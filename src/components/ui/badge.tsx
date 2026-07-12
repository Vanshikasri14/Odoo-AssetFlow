import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-zinc-50 ring-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:ring-zinc-50",
        secondary: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20",
        outline: "bg-transparent text-zinc-700 ring-zinc-300 dark:text-zinc-300 dark:ring-zinc-700",
        destructive: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

/**
 * Generic badge. For asset lifecycle state pills, pass `BADGE[state]` from
 * `@/modules/asset/lifecycle` as `className` so every screen renders the
 * same state the same colour, e.g. <Badge className={BADGE[asset.state]}>.
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
