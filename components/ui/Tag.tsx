import { type ReactNode } from "react";

type Variant = "default" | "forest" | "amber" | "crimson" | "plate" | "vermilion" | "violet" | "slate";

const variants: Record<Variant, string> = {
  default: "border-rule-strong text-ink-2",
  forest: "border-forest text-forest",
  amber: "border-amber text-amber",
  crimson: "border-crimson text-crimson",
  plate: "border-plate text-plate",
  vermilion: "border-vermilion text-vermilion",
  violet: "border-violet text-violet",
  slate: "border-slate text-slate",
};

export function Tag({
  children,
  variant = "default",
  filled = false,
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  filled?: boolean;
  className?: string;
}) {
  const filledClass = filled
    ? variant === "plate"
      ? "bg-plate text-paper border-plate"
      : variant === "forest"
      ? "bg-forest-bg"
      : variant === "amber"
      ? "bg-amber-bg"
      : variant === "crimson"
      ? "bg-crimson-bg"
      : variant === "violet"
      ? "bg-violet-bg"
      : variant === "slate"
      ? "bg-slate-bg"
      : ""
    : "";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-px border font-italic-serif text-[11px] leading-5 ${variants[variant]} ${filledClass} ${className}`}
    >
      {children}
    </span>
  );
}
