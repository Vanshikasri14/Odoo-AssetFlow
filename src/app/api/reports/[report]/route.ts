import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { exportCsv, REPORTS, type ReportKey } from "@/modules/analytics/reports.service";

/**
 * CSV export. A route handler rather than a server action, because the browser
 * needs to receive a *file* — server actions return data to React, they can't
 * set Content-Disposition.
 *
 * Guarded exactly like the page it exports: an Employee cannot fetch this URL to
 * scrape the whole asset register. The proxy lets /api/* through untouched, so
 * this check is the only thing standing here — which is precisely why it exists
 * at the point of use rather than in middleware.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!can.viewAllAnalytics(me)) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { report } = await params;
  if (!(report in REPORTS)) {
    return NextResponse.json({ error: "No such report." }, { status: 404 });
  }

  const key = report as ReportKey;
  const body = await exportCsv(key);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assetflow-${key}-${stamp}.csv"`,
    },
  });
}
