import type { CSSProperties, ReactNode } from "react";

export function StandaloneScreenSafeArea({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        "--app-safe-top": "env(safe-area-inset-top, 0px)",
        "--app-safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "--app-safe-left": "env(safe-area-inset-left, 0px)",
        "--app-safe-right": "env(safe-area-inset-right, 0px)",
        "--app-standalone-safe-top": "env(safe-area-inset-top, 0px)",
      } as CSSProperties}
      className="h-full w-full"
    >
      {children}
    </div>
  );
}
