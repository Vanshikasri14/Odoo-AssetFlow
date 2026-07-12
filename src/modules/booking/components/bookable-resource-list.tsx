import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type Asset = { id: number; name: string; assetTag: string; location: string | null };

export function BookableResourceList({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No bookable resources yet"
        description="Mark an asset as bookable from the asset registry to see it here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <Link key={asset.id} href={`/bookings/${asset.id}`}>
          <Card className="h-full transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
            <CardHeader>
              <CardTitle>{asset.name}</CardTitle>
              <CardDescription>
                {asset.assetTag}
                {asset.location ? ` · ${asset.location}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">View calendar →</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
