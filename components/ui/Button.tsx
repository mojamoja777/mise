import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "default" | "primary" | "vermilion" | "ghost";

const variants: Record<Variant, string> = {
  default: "bg-paper border-rule-strong text-ink hover:bg-paper-2 hover:border-ink-3",
  primary: "bg-plate border-plate text-paper hover:bg-plate-deep hover:border-plate-deep font-serif font-medium tracking-wide",
  vermilion: "bg-vermilion border-vermilion text-paper hover:opacity-90",
  ghost: "bg-transparent border-transparent text-ink hover:bg-paper-2 hover:border-rule",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
};

export function Button({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...rest
}: Props) {
  const sizeClass =
    size === "sm" ? "px-3 py-1 text-[11px]" : size === "lg" ? "px-6 py-3 text-sm" : "px-3.5 py-2 text-xs";
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizeClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
