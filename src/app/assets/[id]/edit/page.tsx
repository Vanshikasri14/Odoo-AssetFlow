import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole, ASSET_WRITERS } from "@/lib/rbac";
import { getAsset, getFilterOptions } from "@/modules/asset/asset.service";
import { AssetForm } from "@/modules/asset/components/asset-form";

export const metadata: Metadata = { title: "Edit asset · AssetFlow" };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ASSET_WRITERS);

  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) notFound();

  const [asset, { categories, departments }] = await Promise.all([
    getAsset(assetId),
    getFilterOptions(),
  ]);
  if (!asset) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/assets/${asset.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {asset.assetTag}
      </Link>

      <AssetForm categories={categories} departments={departments} asset={asset} />
    </div>
  );
}
