"use client";

import { motion } from "motion/react";
import type { ComponentProps } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-black text-white",
  ghost: "bg-transparent text-black border border-neutral-200",
  danger: "bg-transparent text-red-600 border border-red-200",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof motion.button> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`rounded-full px-6 py-3 text-base font-medium disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
