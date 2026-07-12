"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { AssetState } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LABEL } from "@/modules/asset/lifecycle";

type Options = {
  categories: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  locations: string[];
};

/**
 * Filters write to the URL, not to component state — so a filtered registry is a
 * link you can paste to a colleague, and refreshing doesn't wipe your view.
 * The server does the querying; this component only steers it.
 */
export function AssetFilters({ options }: { options: Options }) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/assets?${next.toString()}`);
  }

  const hasFilters = [...params.keys()].length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative"
        action={(fd) => setParam("q", String(fd.get("q") ?? ""))}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Tag, serial, or name…"
          className="w-64 pl-8"
          aria-label="Search assets"
        />
      </form>

      <Select
        aria-label="Category"
        value={params.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className="w-40"
      >
        <option value="">All categories</option>
        {options.categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Select
        aria-label="Status"
        value={params.get("state") ?? ""}
        onChange={(e) => setParam("state", e.target.value)}
        className="w-44"
      >
        <option value="">All statuses</option>
        {Object.values(AssetState).map((s) => (
          <option key={s} value={s}>{LABEL[s]}</option>
        ))}
      </Select>

      <Select
        aria-label="Department"
        value={params.get("department") ?? ""}
        onChange={(e) => setParam("department", e.target.value)}
        className="w-44"
      >
        <option value="">All departments</option>
        {options.departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </Select>

      <Select
        aria-label="Location"
        value={params.get("location") ?? ""}
        onChange={(e) => setParam("location", e.target.value)}
        className="w-52"
      >
        <option value="">All locations</option>
        {options.locations.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </Select>

      <Select
        aria-label="Bookable"
        value={params.get("bookable") ?? ""}
        onChange={(e) => setParam("bookable", e.target.value)}
        className="w-40"
      >
        <option value="">Any type</option>
        <option value="1">Bookable only</option>
        <option value="0">Not bookable</option>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/assets")}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
