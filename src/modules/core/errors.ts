/**
 * Domain errors. Server actions catch these and return them as friendly form
 * state; anything else is a genuine bug and is allowed to 500.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    /** Machine-readable code the UI can branch on. */
    readonly code: string,
    /** Extra payload — e.g. who currently holds the asset. */
    readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/** Raised when an asset is already held. The UI turns this into the
 *  "currently held by Priya — request a transfer instead?" prompt. */
export class AssetAlreadyAllocatedError extends DomainError {
  constructor(assetTag: string, holderName: string, holderId: number | null) {
    super(
      `${assetTag} is currently held by ${holderName}.`,
      "ASSET_ALREADY_ALLOCATED",
      { assetTag, holderName, holderId },
    );
  }
}

/** Raised when a booking would overlap an existing confirmed one. */
export class BookingOverlapError extends DomainError {
  constructor(resourceName: string, conflictStart: Date, conflictEnd: Date) {
    super(
      `${resourceName} is already booked for that window.`,
      "BOOKING_OVERLAP",
      { resourceName, conflictStart, conflictEnd },
    );
  }
}

export class IllegalTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`An asset cannot go from "${from}" to "${to}".`, "ILLEGAL_TRANSITION", {
      from,
      to,
    });
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to do that.") {
    super(message, "FORBIDDEN");
  }
}
