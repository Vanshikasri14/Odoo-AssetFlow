"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError } from "@/modules/core/errors";
import { markAllRead, markRead } from "./notification.service";

export async function readOne(id: number) {
  const me = await getCurrentUser();
  if (!me) throw new ForbiddenError("You are not signed in.");

  await markRead(me.id, id);
  revalidatePath("/", "layout"); // the bell lives in the shell
}

export async function readAll() {
  const me = await getCurrentUser();
  if (!me) throw new ForbiddenError("You are not signed in.");

  await markAllRead(me.id);
  revalidatePath("/", "layout");
}
