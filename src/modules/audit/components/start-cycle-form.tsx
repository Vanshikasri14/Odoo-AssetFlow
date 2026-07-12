"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { startCycleAction } from "../audit.actions";

export function StartCycleForm({ auditCycleId }: { auditCycleId: number }) {
  const [state, formAction, pending] = useActionState(startCycleAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="auditCycleId" value={auditCycleId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start cycle"}
      </Button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
