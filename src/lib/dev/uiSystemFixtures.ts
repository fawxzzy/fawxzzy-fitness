import type { ExerciseCardDensity, ExerciseCardState } from "@/components/ExerciseCard";

export const uiSystemFixtureIds = [
  "default",
  "empty",
  "long-names",
  "broken-images",
  "zero-results",
  "in-progress",
  "weird-values",
] as const;

export type UiSystemFixtureId = (typeof uiSystemFixtureIds)[number];

type UiSystemExercise = {
  id: string;
  name: string;
  summary: string | null;
  badgeText?: string;
  state?: ExerciseCardState;
  density?: ExerciseCardDensity;
  showLeadingVisual?: boolean;
  image_icon_path?: string | null;
};

export type UiSystemFixture = {
  id: UiSystemFixtureId;
  label: string;
  description: string;
  header: {
    title: string;
    subtitle: string;
    meta: string;
    status?: string;
  };
  searchPlaceholder: string;
  notes: string;
  chips: string[];
  exercises: UiSystemExercise[];
  emptyState: {
    title: string;
    body: string;
  };
};

const sharedChips = ["current", "coated", "high contrast"] as const;

export const uiSystemFixtures: Record<UiSystemFixtureId, UiSystemFixture> = {
  default: {
    id: "default",
    label: "Default",
    description: "Balanced showcase for the canonical midnight performance surface.",
    header: {
      title: "Today",
      subtitle: "Upper Pull · Friday · 8 exercises",
      meta: "Focus rail locked · no duplicate title echo",
      status: "Ready",
    },
    searchPlaceholder: "Search exercise library",
    notes: "Cards use the same shell family, the accent only appears on selected states, and metadata stays visibly dimmer than titles.",
    chips: [...sharedChips],
    exercises: [
      {
        id: "default-a",
        name: "Chest-Supported Row",
        summary: "4 sets · 8-10 reps · neutral grip",
        badgeText: "Today",
        state: "selected",
        density: "detailed",
      },
      {
        id: "default-b",
        name: "Cable Pulldown",
        summary: "3 sets · 12 reps · medium pronated grip",
        state: "default",
        density: "compact",
      },
    ],
    emptyState: {
      title: "No blockers",
      body: "Primary empty states keep the same card shell and spacing instead of falling back to unfinished text.",
    },
  },
  empty: {
    id: "empty",
    label: "Empty",
    description: "Intentional empty-state spacing for routes with no routines or exercise matches.",
    header: {
      title: "Routines",
      subtitle: "No current routine selected",
      meta: "Use the same shell instead of raw text",
      status: "Empty",
    },
    searchPlaceholder: "Search routines",
    notes: "Empty states should feel deliberate and fully designed, not like a missing branch of the UI tree.",
    chips: ["empty", "designed", "same rail"],
    exercises: [],
    emptyState: {
      title: "Nothing scheduled yet",
      body: "Create a routine or add an exercise to see how the system behaves when real content arrives.",
    },
  },
  "long-names": {
    id: "long-names",
    label: "Long Names",
    description: "Long exercise names and metadata without mid-word wrapping or hierarchy collapse.",
    header: {
      title: "View Day",
      subtitle: "Single-Arm Cable Lat Pulldown (Paused, Neutral Grip, Week 6 Test)",
      meta: "34/36 title scale · controlled wrapping",
      status: "Dense",
    },
    searchPlaceholder: "Search by exercise, cue, or split",
    notes: "The title line carries the hierarchy. Supporting metadata wraps intentionally but never tries to compete with the title itself.",
    chips: ["long text", "wrap safe", "density test"],
    exercises: [
      {
        id: "long-a",
        name: "Single-Arm Cable Lat Pulldown (Paused, Neutral Grip, Week 6 Test)",
        summary: "4 working sets · add one-second pause at full extension · compare to prior week",
        badgeText: "PR",
        state: "active",
        density: "detailed",
      },
      {
        id: "long-b",
        name: "Rear-Foot Elevated Split Squat / Contralateral Hold / Tempo 3-1-1",
        summary: "3 sets · 12 reps each side · keep torso stacked",
        state: "default",
        density: "compact",
      },
    ],
    emptyState: {
      title: "Long labels still fit",
      body: "Oversized names clamp cleanly and stay on the same rail as headers, cards, and actions.",
    },
  },
  "broken-images": {
    id: "broken-images",
    label: "Broken Images",
    description: "Media slots stay reserved and layout does not shift when thumbnails fail.",
    header: {
      title: "Add Exercise",
      subtitle: "Fallback media contract",
      meta: "Reserved thumb space · no layout shift",
      status: "Fallback",
    },
    searchPlaceholder: "Search and verify thumbnail fallback",
    notes: "The image well is always reserved so a broken or missing asset does not change the card width, title wrap, or action position.",
    chips: ["fallback", "reserved media", "no shift"],
    exercises: [
      {
        id: "broken-a",
        name: "Dumbbell Incline Press",
        summary: "No asset returned from the library",
        state: "default",
        density: "detailed",
        image_icon_path: "/missing/thumb-a.png",
      },
      {
        id: "broken-b",
        name: "Air Bike Sprint",
        summary: "Thumbnail intentionally hidden",
        state: "empty",
        density: "compact",
        showLeadingVisual: false,
      },
    ],
    emptyState: {
      title: "Media can fail safely",
      body: "Fallback handling belongs to the primitive, not to each screen.",
    },
  },
  "zero-results": {
    id: "zero-results",
    label: "Zero Results",
    description: "Search and filter surfaces when the user gets no matches back.",
    header: {
      title: "History",
      subtitle: "No matches for paused neutral grip",
      meta: "Search stays usable with zero rows",
      status: "Search",
    },
    searchPlaceholder: "Search history",
    notes: "Zero-result states should keep controls visible so recovery is obvious without needing a second screen.",
    chips: ["search", "zero results", "recoverable"],
    exercises: [],
    emptyState: {
      title: "No matching sessions",
      body: "Try a broader search or remove one filter. The input, chips, and segmented control stay live above this state.",
    },
  },
  "in-progress": {
    id: "in-progress",
    label: "In Progress",
    description: "Active workout state with clear accent ownership and stable loading widths.",
    header: {
      title: "Session",
      subtitle: "Lower Push · set 3 of 5",
      meta: "Accent reserved for active intent and progress",
      status: "Live",
    },
    searchPlaceholder: "Quick add exercise",
    notes: "In-progress treatment uses the accent as intent, not as ambient glow, while the action bar stays solid and predictable.",
    chips: ["live", "accent intent", "stable width"],
    exercises: [
      {
        id: "progress-a",
        name: "Hack Squat",
        summary: "999 lb · 8 reps · top set armed",
        badgeText: "Set 3",
        state: "active",
        density: "detailed",
      },
      {
        id: "progress-b",
        name: "Leg Extension",
        summary: "Logged · 3 sets · 18 total reps",
        badgeText: "Logged",
        state: "completed",
        density: "compact",
      },
    ],
    emptyState: {
      title: "Session still coherent",
      body: "Loading and active states preserve the same footprint as the final action bar and cards.",
    },
  },
  "weird-values": {
    id: "weird-values",
    label: "Weird Values",
    description: "Stress values for notes, metrics, and duplicate-sounding metadata.",
    header: {
      title: "Dev Fixtures",
      subtitle: "Upper Pull / Upper Pull Variation / 12h 59m / 250 history items",
      meta: "Stress values and punctuation-safe wrapping",
      status: "Stress",
    },
    searchPlaceholder: "Search weird values",
    notes: "Notes can stretch past 500 characters. Measurements can spike. The system still needs to look deliberate and structurally calm under those extremes.",
    chips: ["999 reps", "12h 59m", "250 items"],
    exercises: [
      {
        id: "weird-a",
        name: "Tempo RDL + Row [B-Set] {v2}",
        summary: "999 reps · 999 lb · 12h 59m elapsed · cardio merge fallback",
        badgeText: "Stress",
        state: "selected",
        density: "detailed",
      },
      {
        id: "weird-b",
        name: "Session With Duplicate-Sounding Labels / Phase 2 / Phase 2",
        summary: "Only cardio · 0 sets · missing notes merged from history import",
        state: "default",
        density: "compact",
      },
    ],
    emptyState: {
      title: "Edge values stay disciplined",
      body: "The primitive contracts must absorb odd values so screen code does not invent ad hoc fallbacks.",
    },
  },
};

export function resolveUiSystemFixture(fixture?: string | null): UiSystemFixture {
  if (!fixture) {
    return uiSystemFixtures.default;
  }

  return uiSystemFixtures[(uiSystemFixtureIds as readonly string[]).includes(fixture) ? (fixture as UiSystemFixtureId) : "default"];
}
