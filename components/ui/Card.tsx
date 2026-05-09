import { type ReactNode, type HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: "default" | "plate" | "inset";
};

export function Card({ children, variant = "default", className = "", ...rest }: Props) {
  const variantClass =
    variant === "plate"
      ? "bg-paper border border-plate"
      : variant === "inset"
      ? "bg-paper-2 border border-rule"
      : "bg-paper border border-rule";
  return (
    <div className={`${variantClass} ${className}`} {...rest}>
      {children}
    </div>
  );
}
