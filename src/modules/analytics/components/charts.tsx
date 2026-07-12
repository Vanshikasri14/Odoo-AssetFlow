"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * The two charts from the judges' mockup: utilisation by department (bars) and
 * maintenance frequency (line).
 *
 * Deliberately restrained: no gridlines on the Y axis, no legend where one
 * series makes it redundant, no 3D, no gradients. A chart's job is to let you
 * read a number off it, and every pixel that isn't data is in the way.
 */

const AXIS = { fontSize: 11, fill: "currentColor" } as const;

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
      <p className="text-zinc-500 dark:text-zinc-400">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

export type DeptBar = { department: string; held: number; owned: number };

/**
 * Utilisation by department = what fraction of the assets a department owns are
 * actually out in someone's hands. A department that owns 20 laptops and has 2
 * on desks is not "busy" just because it owns a lot.
 */
export function UtilisationByDepartment({ data }: { data: DeptBar[] }) {
  const rows = data
    .filter((d) => d.owned > 0)
    .map((d) => ({
      department: d.department,
      utilisation: Math.round((d.held / d.owned) * 100),
      held: d.held,
      owned: d.owned,
    }))
    .sort((a, b) => b.utilisation - a.utilisation);

  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-400">No departments own assets yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
        <XAxis
          dataKey="department"
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          className="text-zinc-500"
          interval={0}
          angle={-15}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          className="text-zinc-500"
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip
          cursor={{ fill: "currentColor", opacity: 0.04 }}
          content={<ChartTooltip unit="% of owned assets in use" />}
        />
        <Bar dataKey="utilisation" radius={[3, 3, 0, 0]}>
          {rows.map((r) => (
            // Colour carries meaning, not decoration: red when a department has
            // nearly everything out and nothing spare.
            <Cell
              key={r.department}
              fill={r.utilisation >= 80 ? "#dc2626" : r.utilisation >= 50 ? "#f59e0b" : "#3b82f6"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export type MaintPoint = { month: string; requests: number };

/** Maintenance requests raised per month — is the fleet getting worse? */
export function MaintenanceFrequency({ data }: { data: MaintPoint[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-400">No maintenance history yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} className="text-zinc-500" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} className="text-zinc-500" allowDecimals={false} />
        <Tooltip content={<ChartTooltip unit="requests" />} />
        <Line
          type="monotone"
          dataKey="requests"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#8b5cf6" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
