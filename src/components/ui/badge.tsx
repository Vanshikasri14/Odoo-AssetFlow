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
 * Generic badge. For a lifecycle/workflow STATE, pass the matching entry from
 * that module's badge map — `BADGE[state]`, `STATE_BADGE[state]`, and so on —
 * so every screen renders the same state identically:
 *
 *   <Badge className={BADGE[asset.state]}>{LABEL[asset.state]}</Badge>
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/**
 * Status pill styling, shared by every workflow badge map in the app.
 *
 * The trick is the DARK side. A solid dark fill (`bg-blue-950`) plus a visible
 * ring turns a status tag into what looks like a chunky navy button, and mid-tone
 * text on it is genuinely hard to read. So dark mode uses a TRANSLUCENT tint of
 * the accent itself — `bg-blue-400/10` — which sits softly on whatever surface is
 * behind it (card, table row, kanban column) instead of punching a hole in it.
 * The ring drops to a hairline at /15–/20 so it defines the edge without drawing
 * attention to it.
 *
 * Light mode keeps the familiar 50-weight tint, which already works.
 *
 *   statusPill("blue")  →  soft blue in both themes
 */
const PILL_BASE = "px-2 py-0.5 font-medium ring-1 ring-inset";

export type Tone = "emerald" | "blue" | "violet" | "amber" | "red" | "cyan" | "zinc";

/**
 * Written out literally rather than interpolated (`bg-${tone}-50`) — Tailwind
 * scans source as plain text and cannot see a class name that only exists after
 * a template string is evaluated. Interpolated variants get silently stripped
 * from the stylesheet and you get an unstyled pill in production but not in dev.
 */
const TONES: Record<Tone, string> = {
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  red: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/15 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/20",
  // The "terminal / no state" tone — deliberately flatter, so a Disposed asset
  // doesn't compete for attention with an Overdue one.
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-400/10 dark:text-zinc-400 dark:ring-zinc-400/20",
};

export const statusPill = (tone: Tone): string => `${PILL_BASE} ${TONES[tone]}`;
