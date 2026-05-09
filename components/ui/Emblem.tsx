import { type ReactNode } from "react";

type Variant = "plate" | "forest" | "amber" | "crimson" | "violet" | "slate" | "ink";

const colorMap: Record<Variant, string> = {
  plate: "border-plate text-plate",
  forest: "border-forest text-forest",
  amber: "border-amber text-amber",
  crimson: "border-crimson text-crimson",
  violet: "border-violet text-violet",
  slate: "border-slate text-slate",
  ink: "border-ink-3 text-ink-3",
};

export function Emblem({
  children,
  size = 32,
  variant = "plate",
  doubleRing = true,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  variant?: Variant;
  doubleRing?: boolean;
  className?: string;
}) {
  const fontSize = Math.max(10, Math.floor(size * 0.36));
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-serif relative shrink-0 ${colorMap[variant]} ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {children}
      {doubleRing && (
        <span
          className={`absolute rounded-full border ${colorMap[variant]} pointer-events-none opacity-40`}
          style={{ inset: 2 }}
          aria-hidden
        />
      )}
    </span>
  );
}
