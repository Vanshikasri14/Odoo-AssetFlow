"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A real asset photo, with a fallback.
 *
 * If the image 404s, times out, or the venue wifi drops mid-demo, we render the
 * icon instead of leaving a broken-image glyph on screen. A photo is decoration;
 * it must never be able to make the page look broken.
 *
 * Client component purely because `onError` is a browser event — the server has
 * no way to know an image failed to load.
 */
export function ThumbImage({
  src,
  size,
  fallback,
}: {
  src: string;
  size: number;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
      // A user-supplied URL can point anywhere. Skipping the optimiser means an
      // unknown host degrades to this component's own fallback, rather than
      // throwing a 500 out of the image optimiser for a domain we never
      // allow-listed in next.config.
      unoptimized
    />
  );
}
