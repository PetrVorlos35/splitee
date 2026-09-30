import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "lg" | "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-form text-form-ink active:bg-form-deep disabled:bg-form/40",
  secondary: "bg-sheet text-ink border border-rule active:bg-paper disabled:text-ink-3",
  quiet: "bg-transparent text-form active:bg-form-soft disabled:text-ink-3",
  danger: "bg-sheet text-owe border border-owe/30 active:bg-owe-soft disabled:opacity-40",
};

const sizes: Record<Size, string> = {
  lg: "h-13 px-6 text-base",
  md: "h-11 px-5 text-[0.9375rem]",
  sm: "h-9 px-3.5 text-sm",
};

/**
 * Tlačítko bez spring animace — odezva má být okamžitá (PRODUCT.md, rychlost),
 * stisk je jen krátké zmáčknutí přes CSS.
 */
export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] whitespace-nowrap font-semibold tracking-[-0.005em] transition-[transform,background-color] duration-100 select-none active:scale-[0.98] disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
