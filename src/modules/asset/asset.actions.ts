"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertRole, ASSET_WRITERS } from "@/lib/rbac";
import { DomainError } from "@/modules/core/errors";
import { assetSchema, type AssetFormState } from "./asset.schema";
import { registerAsset, updateAsset } from "./asset.service";

function parse(formData: FormData) {
  return assetSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    departmentId: formData.get("departmentId") ?? "",
    serialNo: formData.get("serialNo") ?? "",
    acquisitionDate: formData.get("acquisitionDate") ?? "",
    acquisitionCost: formData.get("acquisitionCost") ?? "",
    condition: formData.get("condition"),
    location: formData.get("location") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    notes: formData.get("notes") ?? "",
    isBookable: formData.get("isBookable") ?? undefined,
  });
}

/** Register a new asset. Asset Managers and Admins only. */
export async function createAsset(
  _prev: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const me = await assertRole(ASSET_WRITERS);

  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let newId: number;
  try {
    const asset = await registerAsset(me.id, parsed.data);
    newId = asset.id;
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidatePath("/assets");
  // `redirect` throws, so it must be outside the try/catch — otherwise the catch
  // would swallow the redirect signal and the user would sit on a dead form.
  redirect(`/assets/${newId}`);
}

export async function editAsset(
  _prev: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const me = await assertRole(ASSET_WRITERS);

  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (!parsed.data.id) return { error: "Missing asset id." };

  try {
    await updateAsset(me.id, parsed.data.id, parsed.data);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/assets/${parsed.data.id}`);
  revalidatePath("/assets");
  return { ok: "Asset updated." };
}
