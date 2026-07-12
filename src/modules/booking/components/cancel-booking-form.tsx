"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cancelBookingAction } from "../booking.actions";

export function CancelBookingForm({ bookingId, assetId }: { bookingId: number; assetId: number }) {
  const [state, formAction, pending] = useActionState(cancelBookingAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="assetId" value={assetId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
