"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pathname}
          className="absolute inset-0 flex min-h-0 flex-col"
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
