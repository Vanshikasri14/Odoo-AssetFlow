"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { approveMaintenanceAction } from "../maintenance.actions";

export function ApproveForm({ requestId }: { requestId: number }) {
  const [state, formAction, pending] = useActionState(approveMaintenanceAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Approving…" : "Approve"}
      </Button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
