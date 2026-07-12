import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole, ASSET_WRITERS } from "@/lib/rbac";
import { getFilterOptions } from "@/modules/asset/asset.service";
import { AssetForm } from "@/modules/asset/components/asset-form";

export const metadata: Metadata = { title: "Register asset · AssetFlow" };

export default async function NewAssetPage() {
  // Asset Managers and Admins only — an Employee who guesses this URL is bounced.
  await requireRole(ASSET_WRITERS);

  const { categories, departments } = await getFilterOptions();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/assets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to assets
      </Link>

      <AssetForm categories={categories} departments={departments} />
    </div>
  );
}
