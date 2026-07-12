"use client";

import { useEffect, useRef } from "react";
import { cn } from "./utils";

/**
 * Built on the native <dialog> element — free focus trap, ESC-to-close and
 * backdrop, no headless-UI dependency to pull in for a hackathon.
 */
export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => onOpenChange(false)}
      onCancel={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      className={cn(
        "m-auto w-full max-w-md rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-lg backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
        "scale-95 opacity-0 open:scale-100 open:opacity-100 starting:open:scale-95 starting:open:opacity-0",
        "[transition:opacity_0.2s_ease-out,transform_0.2s_ease-out,overlay_0.2s_ease-out_allow-discrete,display_0.2s_ease-out_allow-discrete]",
        "backdrop:opacity-0 open:backdrop:opacity-100 starting:open:backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-200",
        className,
      )}
    >
      {open && <div className="p-6">{children}</div>}
    </dialog>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold text-zinc-900 dark:text-zinc-50", className)} {...props} />
  );
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
