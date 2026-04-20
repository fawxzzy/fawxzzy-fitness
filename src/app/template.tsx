"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <motion.div
        key={pathname}
        className="absolute inset-0 flex min-h-0 flex-col"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.08 : 0.16, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
