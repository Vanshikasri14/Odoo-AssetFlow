"use client";

import { useActionState } from "react";
import { AssetCondition } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createAsset, editAsset } from "../asset.actions";
import { CONDITION_LABEL, type AssetFormState } from "../asset.schema";
import { Banner, Field } from "@/modules/hr/components/shared";

type Existing = {
  id: number;
  name: string;
  categoryId: number;
  departmentId: number | null;
  serialNo: string | null;
  acquisitionDate: Date | null;
  acquisitionCost: unknown;
  condition: AssetCondition;
  location: string | null;
  imageUrl: string | null;
  notes: string | null;
  isBookable: boolean;
};

function isoDate(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function AssetForm({
  categories,
  departments,
  asset,
}: {
  categories: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  asset?: Existing;
}) {
  const action = asset ? editAsset : createAsset;
  const [state, formAction, pending] = useActionState<AssetFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {asset && <input type="hidden" name="id" value={asset.id} />}

      <Card>
        <CardHeader>
          <CardTitle>{asset ? "Edit asset" : "Register asset"}</CardTitle>
          <CardDescription>
            {asset
              ? "Lifecycle status isn't edited here — it changes through allocation, maintenance and audit."
              : "The asset tag is issued automatically by ir_sequence. New assets enter as Available."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Field label="Name" htmlFor="name" errors={state?.fieldErrors?.name}>
            <Input
              id="name"
              name="name"
              required
              defaultValue={asset?.name}
              disabled={pending}
              placeholder='MacBook Pro 14"'
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="categoryId" errors={state?.fieldErrors?.categoryId}>
              <Select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={asset?.categoryId ?? ""}
                disabled={pending}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Owning department"
              htmlFor="departmentId"
              hint="Who the asset belongs to — not who currently holds it."
            >
              <Select
                id="departmentId"
                name="departmentId"
                defaultValue={asset?.departmentId ?? "none"}
                disabled={pending}
              >
                <option value="none">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Serial number"
              htmlFor="serialNo"
              errors={state?.fieldErrors?.serialNo}
              hint="Must be unique across all assets."
            >
              <Input
                id="serialNo"
                name="serialNo"
                defaultValue={asset?.serialNo ?? ""}
                disabled={pending}
                placeholder="C02X1234JGH5"
              />
            </Field>

            <Field label="Condition" htmlFor="condition">
              <Select
                id="condition"
                name="condition"
                defaultValue={asset?.condition ?? "good"}
                disabled={pending}
              >
                {Object.values(AssetCondition).map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Acquisition date" htmlFor="acquisitionDate">
              <Input
                id="acquisitionDate"
                name="acquisitionDate"
                type="date"
                defaultValue={isoDate(asset?.acquisitionDate ?? null)}
                disabled={pending}
              />
            </Field>

            <Field
              label="Acquisition cost (₹)"
              htmlFor="acquisitionCost"
              hint="Used for ranking in reports only — not linked to accounting."
            >
              <Input
                id="acquisitionCost"
                name="acquisitionCost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={asset?.acquisitionCost ? String(asset.acquisitionCost) : ""}
                disabled={pending}
                placeholder="189000"
              />
            </Field>
          </div>

          <Field label="Location" htmlFor="location">
            <Input
              id="location"
              name="location"
              defaultValue={asset?.location ?? ""}
              disabled={pending}
              placeholder="Bengaluru HQ / Floor 3"
            />
          </Field>

          <Field label="Photo URL" htmlFor="imageUrl" hint="Paste a link to a photo of the asset.">
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              defaultValue={asset?.imageUrl ?? ""}
              disabled={pending}
              placeholder="https://…"
            />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <Input
              id="notes"
              name="notes"
              defaultValue={asset?.notes ?? ""}
              disabled={pending}
              placeholder="Anything worth knowing about this unit"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shared resource</CardTitle>
            <CardDescription>
              Bookable assets — rooms, vehicles, the projector — can be reserved by time slot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="isBookable"
                defaultChecked={asset?.isBookable ?? false}
                disabled={pending}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
              />
              <span className="text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  Bookable by time slot
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Puts this asset on the Bookings screen, where overlapping reservations are
                  rejected.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <Banner ok={state?.ok} error={state?.error} />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving…" : asset ? "Save changes" : "Register asset"}
            </Button>
            {!asset && (
              <p className="text-center text-xs text-zinc-400">
                Tag assigned on save. Status starts as Available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
