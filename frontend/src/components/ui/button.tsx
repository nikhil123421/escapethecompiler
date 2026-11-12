import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-[#0a0d05] shadow-[0_12px_34px_-16px_rgba(200,247,81,.75)] hover:bg-[#d7ff72] active:translate-y-px",
  secondary:
    "border border-line-strong bg-elevated text-ink hover:border-accent/40 hover:bg-[#171b23]",
  ghost: "text-muted hover:bg-white/[0.06] hover:text-ink",
  danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
  subtle: "bg-white/[0.06] text-ink hover:bg-white/[0.1]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonStyles(variant, size, className)} {...props} />
  );
}
