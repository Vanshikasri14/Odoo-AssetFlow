import "server-only";
import { db } from "@/lib/db";

/**
 * Reports — read-only aggregation over data the rest of the app already writes.
 *
 * No new tables, no rollup jobs, no cached summaries. Everything here is a
 * GROUP BY at read time. At this scale that is simply correct; at a scale where
 * it isn't, the answer would be a materialised view, not an application-level
 * cache that silently goes stale.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  UTILISATION — most-used vs. idle
// ─────────────────────────────────────────────────────────────────────────────

export type UtilisationRow = {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  state: string;
  times_allocated: number;
  days_held: number;
  /** Days since it was last given to anyone. NULL = never allocated. */
  days_idle: number | null;
};

/**
 * "Asset utilization trends; most-used vs. idle assets."
 *
 * Utilisation is not just a count of allocations — an asset lent 20 times for an
 * hour each is not busier than one lent once for a year. So we measure both:
 * how OFTEN it goes out, and how many DAYS it has actually been in someone's
 * hands. `days_idle` is what surfaces the dead stock nobody has touched.
 */
export async function getUtilisation(): Promise<UtilisationRow[]> {
  return db.$queryRaw<UtilisationRow[]>`
    SELECT
      a.id,
      a.asset_tag,
      a.name,
      c.name AS category,
      a.state::text AS state,
      COUNT(al.id)::int AS times_allocated,
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(al.returned_date, NOW()) - al.allocated_date)) / 86400
      ), 0)::int AS days_held,
      CASE
        WHEN MAX(al.allocated_date) IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (NOW() - MAX(COALESCE(al.returned_date, NOW()))))::int
      END AS days_idle
    FROM asset_asset a
    JOIN asset_category c ON c.id = a.category_id
    LEFT JOIN asset_allocation al ON al.asset_id = a.id
    WHERE a.active = true
    GROUP BY a.id, a.asset_tag, a.name, c.name, a.state
    ORDER BY times_allocated DESC, days_held DESC
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAINTENANCE FREQUENCY
// ─────────────────────────────────────────────────────────────────────────────

export type MaintenanceByCategory = {
  category: string;
  requests: number;
  assets_affected: number;
  total_cost: number;
  avg_days_to_resolve: number | null;
};

/** "Maintenance frequency by asset/category." */
export async function getMaintenanceByCategory(): Promise<MaintenanceByCategory[]> {
  return db.$queryRaw<MaintenanceByCategory[]>`
    SELECT
      c.name AS category,
      COUNT(m.id)::int AS requests,
      COUNT(DISTINCT m.asset_id)::int AS assets_affected,
      COALESCE(SUM(m.repair_cost), 0)::float AS total_cost,
      AVG(
        CASE WHEN m.resolved_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (m.resolved_date - m.create_date)) / 86400 END
      )::float AS avg_days_to_resolve
    FROM asset_category c
    LEFT JOIN asset_asset a ON a.category_id = c.id
    LEFT JOIN maintenance_request m ON m.asset_id = a.id
    WHERE c.active = true
    GROUP BY c.name
    HAVING COUNT(m.id) > 0
    ORDER BY requests DESC
  `;
}

export type ProblemAsset = {
  id: number;
  asset_tag: string;
  name: string;
  requests: number;
  total_cost: number;
};

/** The assets that keep breaking — the ones worth replacing rather than fixing. */
export async function getProblemAssets(): Promise<ProblemAsset[]> {
  return db.$queryRaw<ProblemAsset[]>`
    SELECT
      a.id, a.asset_tag, a.name,
      COUNT(m.id)::int AS requests,
      COALESCE(SUM(m.repair_cost), 0)::float AS total_cost
    FROM asset_asset a
    JOIN maintenance_request m ON m.asset_id = a.id
    WHERE a.active = true
    GROUP BY a.id, a.asset_tag, a.name
    ORDER BY requests DESC, total_cost DESC
    LIMIT 10
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  END OF LIFE
// ─────────────────────────────────────────────────────────────────────────────

export type AgeingAsset = {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  state: string;
  age_years: number;
  warranty_months: number | null;
  /** True once past the category's warranty window. */
  out_of_warranty: boolean;
};

/**
 * "Assets due for maintenance or nearing retirement."
 *
 * We have no explicit "useful life" field, so the proxy is: an asset is nearing
 * retirement once it is past its category's warranty period, weighted by age.
 * That's a heuristic, and it is labelled as one in the UI — a made-up number
 * presented as fact is worse than no number.
 */
export async function getAgeingAssets(): Promise<AgeingAsset[]> {
  return db.$queryRaw<AgeingAsset[]>`
    SELECT
      a.id, a.asset_tag, a.name,
      c.name AS category,
      a.state::text AS state,
      ROUND(EXTRACT(EPOCH FROM (NOW() - a.acquisition_date)) / 31557600, 1)::float AS age_years,
      c.warranty_months,
      CASE
        WHEN c.warranty_months IS NULL THEN false
        ELSE a.acquisition_date < NOW() - (c.warranty_months || ' months')::interval
      END AS out_of_warranty
    FROM asset_asset a
    JOIN asset_category c ON c.id = a.category_id
    WHERE a.active = true
      AND a.acquisition_date IS NOT NULL
      AND a.state NOT IN ('retired', 'disposed')
    ORDER BY age_years DESC
    LIMIT 15
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DEPARTMENT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export type DepartmentRow = {
  id: number;
  department: string;
  owned: number;
  currently_held: number;
  total_value: number;
  overdue: number;
};

/** "Department-wise allocation summary." */
export async function getDepartmentSummary(): Promise<DepartmentRow[]> {
  return db.$queryRaw<DepartmentRow[]>`
    SELECT
      d.id,
      d.name AS department,
      COUNT(DISTINCT a.id)::int AS owned,
      COUNT(DISTINCT CASE WHEN al.returned_date IS NULL THEN al.id END)::int AS currently_held,
      COALESCE(SUM(DISTINCT a.acquisition_cost), 0)::float AS total_value,
      COUNT(DISTINCT CASE
        WHEN al.returned_date IS NULL AND al.expected_return_date < NOW()
        THEN al.id END)::int AS overdue
    FROM hr_department d
    LEFT JOIN asset_asset a ON a.department_id = d.id AND a.active = true
    LEFT JOIN asset_allocation al ON al.asset_id = a.id
    WHERE d.active = true
    GROUP BY d.id, d.name
    ORDER BY owned DESC
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAINTENANCE FREQUENCY OVER TIME  (the line chart)
// ─────────────────────────────────────────────────────────────────────────────

export type MaintenancePoint = { month: string; requests: number };

/**
 * Requests raised per month, over the last year. `generate_series` produces the
 * months, so a month with NO maintenance still appears as a zero — otherwise the
 * line would silently skip quiet months and imply a smooth trend that isn't there.
 */
export async function getMaintenanceTrend(): Promise<MaintenancePoint[]> {
  return db.$queryRaw<MaintenancePoint[]>`
    SELECT
      TO_CHAR(m.month, 'Mon') AS month,
      COALESCE(COUNT(r.id), 0)::int AS requests
    FROM generate_series(
      date_trunc('month', NOW()) - interval '11 months',
      date_trunc('month', NOW()),
      interval '1 month'
    ) AS m(month)
    LEFT JOIN maintenance_request r
      ON date_trunc('month', r.create_date) = m.month
    GROUP BY m.month
    ORDER BY m.month
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOOKING HEATMAP
// ─────────────────────────────────────────────────────────────────────────────

export type HeatCell = { dow: number; hour: number; bookings: number };

/**
 * "Resource booking heatmap (peak usage windows)."
 *
 * One row per (day-of-week, hour) with a booking count. A booking spanning
 * 09:00–12:00 must light up three cells, not one — so we explode each booking
 * across the hours it covers using generate_series, rather than counting only
 * its start hour. Counting start hours would make long meetings look short.
 */
export async function getBookingHeatmap(): Promise<HeatCell[]> {
  return db.$queryRaw<HeatCell[]>`
    SELECT
      EXTRACT(DOW FROM slot)::int AS dow,
      EXTRACT(HOUR FROM slot)::int AS hour,
      COUNT(*)::int AS bookings
    FROM resource_booking b
    CROSS JOIN LATERAL generate_series(
      date_trunc('hour', b.start_datetime),
      b.end_datetime - interval '1 second',
      interval '1 hour'
    ) AS slot
    WHERE b.state = 'confirmed'
    GROUP BY dow, hour
    ORDER BY dow, hour
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSV EXPORT  —  "Exportable reports"
// ─────────────────────────────────────────────────────────────────────────────

export const REPORTS = {
  utilisation: "Asset utilisation",
  maintenance: "Maintenance by category",
  departments: "Department allocation summary",
  ageing: "Ageing assets",
} as const;

export type ReportKey = keyof typeof REPORTS;

/** RFC-4180-ish: quote every field, double any embedded quotes. */
function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function exportCsv(key: ReportKey): Promise<string> {
  switch (key) {
    case "utilisation":
      return csv(await getUtilisation());
    case "maintenance":
      return csv(await getMaintenanceByCategory());
    case "departments":
      return csv(await getDepartmentSummary());
    case "ageing":
      return csv(await getAgeingAssets());
  }
}
