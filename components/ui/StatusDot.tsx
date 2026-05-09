type Variant = "plate" | "forest" | "amber" | "crimson" | "vermilion" | "violet" | "slate" | "ink";

const colorMap: Record<Variant, string> = {
  plate: "bg-plate",
  forest: "bg-forest",
  amber: "bg-amber",
  crimson: "bg-crimson",
  vermilion: "bg-vermilion",
  violet: "bg-violet",
  slate: "bg-slate",
  ink: "bg-ink-3",
};

export function StatusDot({
  variant,
  pulse = false,
  size = 8,
  className = "",
}: {
  variant: Variant;
  pulse?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full ${colorMap[variant]} ${pulse ? "animate-ink-pulse" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
