"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { AppButton } from "@/components/ui/AppButton";
import type { AppButtonCanonicalVariant, AppButtonSize } from "@/components/ui/appButtonClasses";
import { Chip, ChipButton } from "@/components/ui/Chip";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { useFieldNotice } from "@/components/ui/FieldNotice";
import { Menu } from "@/components/ui/Menu";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { useToast } from "@/components/ui/ToastProvider";

// /dev/ui-kit: the living reference for docs/ui/FOUNDATION.md. Every primitive renders here in each state so a
// section lane can see what it consumes before it builds. Dev-only (page.tsx 404s in production; the /dev layout
// and middleware guard it too).

const BUTTON_VARIANTS: AppButtonCanonicalVariant[] = ["primary", "promote", "secondary", "quiet", "danger"];
const BUTTON_SIZES: AppButtonSize[] = ["lg", "md", "sm"];
const SEGMENT_SETS = [
  ["Day", "Week"],
  ["Sets", "Reps", "Load"],
  ["Mon", "Wed", "Fri", "Sun"],
  ["XS", "S", "M", "L", "XL"],
];

function KitSection({ id, title, note, children }: { id: string; title: string; note: string; children: ReactNode }) {
  return (
    <section id={id} data-ui-kit-section={id} className="space-y-3 rounded-[var(--radius-lg)] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface)/0.6)] p-4">
      <div className="space-y-1">
        <TitleText as="h2" className="text-lg">{title}</TitleText>
        <SubtitleText className="text-sm">{note}</SubtitleText>
      </div>
      {children}
    </section>
  );
}

function SegmentDemo({ labels }: { labels: string[] }) {
  const [value, setValue] = useState(labels[0].toLowerCase());
  return (
    <SegmentedControl
      ariaLabel={`${labels.length} options`}
      value={value}
      onChange={setValue}
      options={labels.map((label) => ({ label, value: label.toLowerCase() }))}
    />
  );
}

function FieldDemo({ startWithError }: { startWithError: boolean }) {
  const [name, setName] = useState("Push Day");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (startWithError) setError("Routine name already exists.");
  }, [startWithError]);
  return (
    <div className="space-y-2">
      <FormField label="Routine name" invalid={Boolean(error)} error={error} helper="Try saving with the name Push Day.">
        {(control) => (
          <input
            {...control}
            value={name}
            onChange={(event) => {
              setError(null);
              setName(event.target.value);
            }}
            className={formFieldControlClassName}
          />
        )}
      </FormField>
      <AppButton
        variant="secondary"
        size="sm"
        onClick={() => setError(name.trim().toLowerCase() === "push day" ? "Routine name already exists." : null)}
      >
        Save name
      </AppButton>
    </div>
  );
}

function FormLevelNoticeDemo() {
  const notice = useFieldNotice("ui-kit:form");
  return (
    <div className="flex flex-wrap gap-2">
      <AppButton variant="secondary" size="sm" onClick={() => notice.report("Could not save. Check your connection.")}>
        Report form error
      </AppButton>
      <AppButton variant="quiet" size="sm" onClick={notice.clear}>
        Clear
      </AppButton>
    </div>
  );
}

export function UiKitShowcase({ initialOpen = null, hideDevBadge = false }: { initialOpen?: string | null; hideDevBadge?: boolean }) {
  const toast = useToast();
  const [loadingVariant, setLoadingVariant] = useState<AppButtonCanonicalVariant | null>(null);
  const [sheetOpen, setSheetOpen] = useState(initialOpen === "sheet");
  const [confirmOpen, setConfirmOpen] = useState(initialOpen === "confirm");
  const [chips, setChips] = useState(["Chest", "Triceps", "Shoulders"]);
  const [selectedChip, setSelectedChip] = useState("all");
  const [lastMenuAction, setLastMenuAction] = useState("none yet");

  return (
    <ContentRail>
      {hideDevBadge ? <style>{"nextjs-portal{display:none!important}"}</style> : null}
      <div className="space-y-4 py-4" data-ui-kit="">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <TitleText as="h1" className="text-2xl">UI kit</TitleText>
            <SubtitleText className="text-sm">Design foundation primitives. Reference: docs/ui/FOUNDATION.md.</SubtitleText>
          </div>
          <Menu
            label="Kit actions"
            items={[
              { id: "rename", label: "Rename", onSelect: () => setLastMenuAction("Rename") },
              { id: "duplicate", label: "Duplicate", onSelect: () => setLastMenuAction("Duplicate") },
              { id: "archive", label: "Archive", disabled: true, onSelect: () => setLastMenuAction("Archive") },
              { id: "delete", label: "Delete", tone: "danger", onSelect: () => setConfirmOpen(true) },
            ]}
          />
        </header>

        <KitSection id="buttons" title="AppButton" note="primary, promote, secondary, quiet, danger. Every size is at least 44px. Tap one to see loading.">
          <div className="grid grid-cols-1 gap-2">
            {BUTTON_VARIANTS.map((variant) => (
              <AppButton
                key={variant}
                variant={variant}
                fullWidth
                loading={loadingVariant === variant}
                onClick={() => {
                  setLoadingVariant(variant);
                  window.setTimeout(() => setLoadingVariant(null), 1600);
                }}
              >
                {variant[0].toUpperCase() + variant.slice(1)}
              </AppButton>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {BUTTON_SIZES.map((size) => (
              <AppButton key={size} variant="secondary" size={size}>
                Size {size}
              </AppButton>
            ))}
            <AppButton variant="primary" size="sm" disabled>
              Disabled
            </AppButton>
          </div>
        </KitSection>

        <KitSection id="menu" title="Menu" note="Top-right popover: arrow keys, Escape and an outside tap close it, 44px rows. Use the ⋮ in the header.">
          <p className="text-sm text-[rgb(var(--text-secondary))]" data-ui-kit-menu-last="">
            Last action: {lastMenuAction}
          </p>
        </KitSection>

        <KitSection id="sheet" title="Sheet and Confirm" note="One bottom sheet for pickers and forms; the confirm runs on it and names the object.">
          <div className="grid grid-cols-2 gap-2">
            <AppButton variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
              Open sheet
            </AppButton>
            <AppButton variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              Delete routine
            </AppButton>
          </div>
        </KitSection>

        <KitSection id="chips" title="Chips" note="Chip (label or badge, optional remove) and ChipButton (filter). Pill and AppBadge are thin wrappers.">
          <div className="flex flex-wrap gap-2">
            <Chip>Neutral</Chip>
            <Chip tone="accent">Accent</Chip>
            <Chip tone="success">Success</Chip>
            <Chip tone="attention">Attention</Chip>
            <Chip tone="danger">Danger</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Chip key={chip} variant="label" onRemove={() => setChips((current) => current.filter((item) => item !== chip))}>
                {chip}
              </Chip>
            ))}
            {chips.length === 0 ? (
              <AppButton variant="quiet" size="sm" onClick={() => setChips(["Chest", "Triceps", "Shoulders"])}>
                Reset chips
              </AppButton>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "push", "pull", "legs"].map((chip) => (
              <ChipButton key={chip} selected={selectedChip === chip} onClick={() => setSelectedChip(chip)}>
                {chip[0].toUpperCase() + chip.slice(1)}
              </ChipButton>
            ))}
          </div>
        </KitSection>

        <KitSection id="segmented" title="SegmentedControl" note="2 to 5 options, a visible selected segment, arrow keys move.">
          <div className="space-y-2">
            {SEGMENT_SETS.map((labels) => (
              <SegmentDemo key={labels.join("-")} labels={labels} />
            ))}
          </div>
        </KitSection>

        <KitSection id="notices" title="FieldNotice and FormField" note="Errors never render as red text: they go to the in-flow notice, the field gets a neutral marker.">
          <FieldDemo startWithError={initialOpen === "field-error"} />
          <FormLevelNoticeDemo />
          <div className="flex flex-wrap gap-2">
            <AppButton variant="quiet" size="sm" onClick={() => toast.success("Saved.")}>
              Success notice
            </AppButton>
            <AppButton variant="quiet" size="sm" onClick={() => toast.info("Rest timer started.")}>
              Info notice
            </AppButton>
          </div>
        </KitSection>
      </div>

      <Sheet
        open={sheetOpen}
        title="Choose a day"
        description="Pickers and forms use this sheet: scrim, handle, a 44px close, a pinned footer."
        onClose={() => setSheetOpen(false)}
        footer={(
          <AppButton variant="primary" fullWidth onClick={() => setSheetOpen(false)}>
            Done
          </AppButton>
        )}
      >
        <div className="space-y-2">
          {["Push Day", "Pull Day", "Leg Day"].map((day) => (
            <AppButton key={day} variant="secondary" fullWidth onClick={() => setSheetOpen(false)}>
              {day}
            </AppButton>
          ))}
        </div>
      </Sheet>

      <ConfirmDestructiveModal
        open={confirmOpen}
        title="Delete routine"
        objectName="Push Pull Legs"
        consequenceText="Its days and exercises are removed. Past sessions stay in History."
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success("Routine deleted (demo).");
        }}
      />
    </ContentRail>
  );
}
