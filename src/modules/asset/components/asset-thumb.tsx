import type { CSSProperties, ReactNode } from "react";
import {
  Armchair,
  Boxes,
  Building2,
  Car,
  DoorOpen,
  Drill,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Printer,
  Projector,
  Smartphone,
  Tablet,
  Truck,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { ThumbImage } from "./thumb-image";

/**
 * The little picture beside an asset.
 *
 * If a real photo was uploaded (`imageUrl`), show it. Otherwise fall back to an
 * icon chosen from what the asset actually IS.
 *
 * Why icons rather than stock photos of a MacBook? Three reasons:
 *   • A remote image is a network request that can 404, hang, or fail outright
 *     when the venue wifi drops — mid-demo, in front of a judge.
 *   • Thirty rows of photos is megabytes of payload, for decoration.
 *   • An icon reads as "laptop" instantly at 40px. A photo of a laptop at 40px
 *     is a grey smudge.
 *
 * Matching runs on the NAME first, then the category — "MacBook Pro" and "Toyota
 * Innova" are both more specific than "Electronics" and "Vehicles".
 *
 * Note the icons are returned as literal JSX rather than as component
 * references (`const Icon = …; <Icon />`). The React Compiler rejects the latter:
 * a component it can't see statically is a component it can't optimise.
 */
type Render = (props: { className: string; style: CSSProperties }) => ReactNode;

const ICON: Record<string, Render> = {
  laptop: (p) => <Laptop {...p} strokeWidth={1.5} />,
  tablet: (p) => <Tablet {...p} strokeWidth={1.5} />,
  phone: (p) => <Smartphone {...p} strokeWidth={1.5} />,
  projector: (p) => <Projector {...p} strokeWidth={1.5} />,
  monitor: (p) => <Monitor {...p} strokeWidth={1.5} />,
  keyboard: (p) => <Keyboard {...p} strokeWidth={1.5} />,
  mouse: (p) => <Mouse {...p} strokeWidth={1.5} />,
  headset: (p) => <Headphones {...p} strokeWidth={1.5} />,
  printer: (p) => <Printer {...p} strokeWidth={1.5} />,
  truck: (p) => <Truck {...p} strokeWidth={1.5} />,
  car: (p) => <Car {...p} strokeWidth={1.5} />,
  chair: (p) => <Armchair {...p} strokeWidth={1.5} />,
  desk: (p) => <Building2 {...p} strokeWidth={1.5} />,
  tool: (p) => <Drill {...p} strokeWidth={1.5} />,
  room: (p) => <DoorOpen {...p} strokeWidth={1.5} />,
  generic: (p) => <Boxes {...p} strokeWidth={1.5} />,
};

/** Most specific first — the first match wins. */
const BY_NAME: [RegExp, keyof typeof ICON][] = [
  [/macbook|thinkpad|latitude|laptop|notebook/i, "laptop"],
  [/ipad|tablet/i, "tablet"],
  [/iphone|phone|pixel|galaxy/i, "phone"],
  [/projector|epson/i, "projector"],
  [/monitor|ultrasharp|display|screen/i, "monitor"],
  [/keyboard|keychron/i, "keyboard"],
  [/\bmouse\b|mx master/i, "mouse"],
  [/headset|headphone|jabra|earbud/i, "headset"],
  [/printer|label/i, "printer"],
  [/\bvan\b|truck|tata ace|delivery/i, "truck"],
  [/innova|swift|dzire|\bcar\b|vehicle/i, "car"],
  [/chair|aeron|stool/i, "chair"],
  [/desk|table|cabinet|filing/i, "desk"],
  [/drill|ladder|\btool\b|bosch/i, "tool"],
  [/\broom\b|hall|\bpod\b|meeting/i, "room"],
];

const BY_CATEGORY: [RegExp, keyof typeof ICON][] = [
  [/electronic/i, "laptop"],
  [/peripheral/i, "keyboard"],
  [/furniture/i, "chair"],
  [/vehicle/i, "car"],
  [/room|space/i, "room"],
  [/tool/i, "tool"],
];

function pick(name: string, category?: string): keyof typeof ICON {
  for (const [pattern, key] of BY_NAME) if (pattern.test(name)) return key;
  if (category) for (const [pattern, key] of BY_CATEGORY) if (pattern.test(category)) return key;
  return "generic";
}

export function AssetThumb({
  name,
  category,
  imageUrl,
  size = 40,
  className,
}: {
  name: string;
  category?: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const box = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
    className,
  );

  const icon = ICON[pick(name, category)]({
    className: "text-zinc-400 dark:text-zinc-500",
    style: { width: size * 0.5, height: size * 0.5 },
  });

  return (
    <span className={box} style={{ width: size, height: size }} aria-hidden="true">
      {imageUrl ? <ThumbImage src={imageUrl} size={size} fallback={icon} /> : icon}
    </span>
  );
}
