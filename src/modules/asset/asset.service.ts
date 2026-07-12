import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DomainError } from "@/modules/core/errors";
import { logMessage, MODEL } from "@/modules/core/chatter.service";
import { nextByCode, SEQ } from "@/modules/core/sequence.service";
import type { AssetFilters } from "./asset.schema";

type AssetInput = {
  id?: number;
  name: string;
  categoryId: number;
  departmentId: number | null;
  serialNo: string | null;
  acquisitionDate: Date | null;
  acquisitionCost: number | null;
  condition: "new" | "good" | "fair" | "poor" | "damaged";
  location: string | null;
  imageUrl: string | null;
  notes: string | null;
  isBookable: boolean;
};

/**
 * Register an asset. It enters the world as `available`, per the brief.
 *
 * The asset tag comes from `ir_sequence` under a row-level lock — NOT from
 * `count() + 1`, which mints duplicates under concurrency and collides with an
 * already-issued tag as soon as a record is archived.
 */
export async function registerAsset(actorId: number, input: AssetInput) {
  return db.$transaction(async (tx) => {
    if (input.serialNo) {
      const clash = await tx.assetAsset.findUnique({
        where: { serialNo: input.serialNo },
        select: { assetTag: true },
      });
      if (clash) {
        throw new DomainError(
          `Serial number ${input.serialNo} is already registered as ${clash.assetTag}.`,
          "SERIAL_TAKEN",
        );
      }
    }

    const assetTag = await nextByCode(tx, SEQ.ASSET);

    const asset = await tx.assetAsset.create({
      data: {
        assetTag,
        name: input.name,
        categoryId: input.categoryId,
        departmentId: input.departmentId,
        serialNo: input.serialNo,
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost,
        condition: input.condition,
        location: input.location,
        imageUrl: input.imageUrl,
        notes: input.notes,
        isBookable: input.isBookable,
        // state defaults to `available` — never set it here. The lifecycle
        // module owns every subsequent transition.
        createUid: actorId,
        writeUid: actorId,
      },
    });

    await logMessage(tx, {
      model: MODEL.ASSET,
      resId: asset.id,
      action: "create",
      body: `${assetTag} — ${asset.name} registered.`,
      authorId: actorId,
    });

    return asset;
  });
}

/**
 * Edit an asset's descriptive fields. Note `state` is NOT among them: lifecycle
 * changes go through transitionAsset(), never through a form.
 */
export async function updateAsset(actorId: number, id: number, input: AssetInput) {
  return db.$transaction(async (tx) => {
    if (input.serialNo) {
      const clash = await tx.assetAsset.findFirst({
        where: { serialNo: input.serialNo, id: { not: id } },
        select: { assetTag: true },
      });
      if (clash) {
        throw new DomainError(
          `Serial number ${input.serialNo} already belongs to ${clash.assetTag}.`,
          "SERIAL_TAKEN",
        );
      }
    }

    const asset = await tx.assetAsset.update({
      where: { id },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        departmentId: input.departmentId,
        serialNo: input.serialNo,
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost,
        condition: input.condition,
        location: input.location,
        imageUrl: input.imageUrl,
        notes: input.notes,
        isBookable: input.isBookable,
        writeUid: actorId,
      },
    });

    await logMessage(tx, {
      model: MODEL.ASSET,
      resId: id,
      action: "write",
      body: `${asset.assetTag} details updated.`,
      authorId: actorId,
    });

    return asset;
  });
}

/**
 * Search and filter. Everything runs server-side off the URL's query string, so
 * a filtered view is a shareable link and the browser never holds 10,000 rows.
 *
 * The free-text box searches tag, serial and name at once — a user with a laptop
 * in their hands doesn't know which of those they're holding.
 */
export async function searchAssets(filters: AssetFilters) {
  const where: Prisma.AssetAssetWhereInput = { active: true };

  if (filters.q) {
    where.OR = [
      { assetTag: { contains: filters.q, mode: "insensitive" } },
      { serialNo: { contains: filters.q, mode: "insensitive" } },
      { name: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.category) where.categoryId = filters.category;
  if (filters.state) where.state = filters.state;
  if (filters.department) where.departmentId = filters.department;
  if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
  if (filters.bookable) where.isBookable = filters.bookable === "1";

  return db.assetAsset.findMany({
    where,
    orderBy: { assetTag: "asc" },
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      // The current holder is the one allocation that is still open.
      allocations: {
        where: { returnedDate: null },
        select: {
          id: true,
          expectedReturnDate: true,
          holderUser: { select: { id: true, name: true } },
          holderDept: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
    take: 200,
  });
}

/** One asset, with everything the detail page shows. */
export async function getAsset(id: number) {
  return db.assetAsset.findUnique({
    where: { id },
    include: {
      category: true,
      department: { select: { id: true, name: true } },
      allocations: {
        orderBy: { allocatedDate: "desc" },
        include: {
          holderUser: { select: { id: true, name: true } },
          holderDept: { select: { id: true, name: true } },
          allocatedBy: { select: { id: true, name: true } },
        },
      },
      maintenance: {
        orderBy: { createDate: "desc" },
        include: {
          requestedBy: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } },
        },
      },
      bookings: {
        where: { state: "confirmed", endDatetime: { gte: new Date() } },
        orderBy: { startDatetime: "asc" },
        include: { user: { select: { id: true, name: true } } },
        take: 5,
      },
    },
  });
}

/**
 * The asset's history timeline.
 *
 * This is the payoff of routing every state change through the chatter: the
 * "allocation history + maintenance history" the brief asks for is ONE query
 * against ONE table, and it picks up new event types automatically — when Dev B
 * ships audits, audit events appear here without anyone touching this function.
 */
export async function getAssetHistory(assetId: number) {
  return db.mailMessage.findMany({
    where: { model: MODEL.ASSET, resId: assetId },
    orderBy: { createDate: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

/** For the filter dropdowns. */
export async function getFilterOptions() {
  const [categories, departments, locations] = await Promise.all([
    db.assetCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.hrDepartment.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.assetAsset.findMany({
      where: { active: true, location: { not: null } },
      distinct: ["location"],
      orderBy: { location: "asc" },
      select: { location: true },
    }),
  ]);

  return {
    categories,
    departments,
    locations: locations.map((l) => l.location!).filter(Boolean),
  };
}
