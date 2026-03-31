"use client";

import { useMemo, useState } from "react";
import { BottomActionDock, DockButton } from "@/components/layout/BottomActionDock";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";
import { AppButton } from "@/components/ui/AppButton";

export function MobileScaffoldDemo() {
  const [longList, setLongList] = useState(true);

  const rows = useMemo(
    () => Array.from({ length: longList ? 24 : 3 }, (_, index) => index + 1),
    [longList],
  );

  return (
    <div className="h-[calc(100dvh-var(--app-top-offset))] min-h-0">
      <MobileScreenScaffold
        scrollClassName="px-1"
        topChrome={(
          <div className="mx-1 rounded-xl border border-border/60 bg-surface/95 px-3 py-2 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-muted">Demo</p>
            <p className="text-sm font-semibold text-text">Mobile Scaffold Contract Preview</p>
          </div>
        )}
        bottomDock={(
          <BottomActionDock
            left={<DockButton variant="secondary" type="button" onClick={() => setLongList((current) => !current)}>{longList ? "Short content" : "Long content"}</DockButton>}
            right={<AppButton type="button" variant="primary" size="md" fullWidth>Primary Action</AppButton>}
          />
        )}
      >
        <div className="space-y-2 px-1 pt-3">
          {rows.map((row) => (
            <button
              key={row}
              type="button"
              className="w-full rounded-xl border border-border/55 bg-surface/55 px-3 py-3 text-left text-sm text-text"
            >
              Interactive row {row}
            </button>
          ))}

          <div className="rounded-xl border border-dashed border-border/60 bg-surface/35 px-3 py-3 text-xs text-muted">
            Final interactive row should stay fully visible above the dock.
          </div>

          <label className="block space-y-1 rounded-xl border border-border/55 bg-surface/55 px-3 py-3 text-xs text-muted">
            <span>Keyboard check input</span>
            <input className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm text-text" placeholder="Focus me to test keyboard + dock" />
          </label>
        </div>
      </MobileScreenScaffold>
    </div>
  );
}
