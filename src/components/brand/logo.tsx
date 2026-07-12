import Image from "next/image";
import { cn } from "@/components/ui/utils";

/**
 * Brand assets.
 *
 * `public/logo.png` is a full lockup — circular arrows + icons + "AssetFlow" +
 * a tagline — drawn on a WHITE background at 1536×1024. That shape dictates where
 * it can go:
 *
 *   • FullLogo  — use where there is room and a light surface (the auth pages).
 *                 The tagline is part of what makes it look designed; shrink it
 *                 to 36px and it becomes grey mush.
 *
 *   • LogoMark  — the sidebar's 36px slot, on a DARK surface. The lockup can't
 *                 go there, so we crop to the circular mark and sit it on a white
 *                 chip — which turns the image's white background from a bug into
 *                 a deliberate badge.
 */

/** Brand colours, read off the logo. */
export const BRAND = {
  navy: "#12274a",
  green: "#21a179",
} as const;

// Crop box of the circular mark within logo.png, measured in source pixels.
const SRC = { w: 1536, h: 1024 };
const CROP = { x: 118, y: 262, size: 445 };

/** Square mark — the circular arrows, cropped out of the lockup. */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  // Scale the whole image up so that the crop box exactly fills `size`, then
  // shift it so the crop box lands at the origin.
  const scale = size / CROP.size;
  const w = SRC.w * scale;

  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-md bg-white", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt=""
        width={SRC.w}
        height={SRC.h}
        priority
        className="absolute max-w-none"
        style={{
          width: w,
          height: "auto",
          left: -CROP.x * scale,
          top: -CROP.y * scale,
        }}
      />
    </span>
  );
}

/** Mark + wordmark, for the sidebar. */
export function Logo({
  className,
  showWord = true,
  size = 32,
}: {
  className?: string;
  showWord?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWord && (
        // The wordmark is set in text rather than cropped from the PNG: it stays
        // crisp at any size, respects the user's font settings, and is selectable.
        // Colours match the logo — navy "Asset", green "Flow".
        <span className="text-base font-semibold tracking-tight">
          <span className="text-zinc-900 dark:text-zinc-50">Asset</span>
          <span style={{ color: BRAND.green }}>Flow</span>
        </span>
      )}
    </span>
  );
}

/** The complete lockup, for the auth pages — where it has room to breathe. */
export function FullLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="AssetFlow — Enterprise Asset & Resource Management System"
      width={SRC.w}
      height={SRC.h}
      priority
      className={cn("h-auto w-56", className)}
    />
  );
}
