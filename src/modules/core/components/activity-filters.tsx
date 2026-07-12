"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Odoo's dotted model names, made readable. */
const MODEL_LABEL: Record<string, string> = {
  "asset.asset": "Assets",
  "asset.allocation": "Allocations",
  "asset.transfer.request": "Transfers",
  "resource.booking": "Bookings",
  "maintenance.request": "Maintenance",
  "audit.cycle": "Audits",
  "hr.department": "Departments",
  "asset.category": "Categories",
  "res.users": "People",
};

export function ActivityFilters({
  actors,
  models,
  actions,
}: {
  actors: { id: number; name: string }[];
  models: string[];
  actions: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/activity?${next.toString()}`);
  }

  const hasFilters = [...params.keys()].length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form className="relative" action={(fd) => set("q", String(fd.get("q") ?? ""))}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search the log…"
          className="w-56 pl-8"
          aria-label="Search activity"
        />
      </form>

      <Select
        aria-label="Person"
        value={params.get("actor") ?? ""}
        onChange={(e) => set("actor", e.target.value)}
        className="w-44"
      >
        <option value="">Everyone</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Record type"
        value={params.get("model") ?? ""}
        onChange={(e) => set("model", e.target.value)}
        className="w-40"
      >
        <option value="">All records</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {MODEL_LABEL[m] ?? m}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Action"
        value={params.get("action") ?? ""}
        onChange={(e) => set("action", e.target.value)}
        className="w-44"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a.replace(/_/g, " ")}
          </option>
        ))}
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/activity")}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

export { MODEL_LABEL };
