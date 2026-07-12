"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "./utils";

type TabsContextValue = { value: string; setValue: (value: string) => void };
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component} /> must be used inside <Tabs>`);
  return ctx;
}

export type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const active = value ?? internal;

  const setValue = (next: string) => {
    onValueChange?.(next);
    if (value === undefined) setInternal(next);
  };

  return (
    <TabsContext.Provider value={{ value: active, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900",
        className,
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string };

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const ctx = useTabsContext("TabsTrigger");
  const active = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = { value: string; className?: string; children: React.ReactNode };

export function TabsContent({ value, className, children }: TabsContentProps) {
  const ctx = useTabsContext("TabsContent");
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
