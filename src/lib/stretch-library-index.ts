import { STRETCH_LIBRARY_SUMMARIES } from "@/lib/stretch-library-summaries";
import type { StretchReferenceSummary } from "@/lib/stretch-library-types";

export const STRETCH_LIBRARY_FILTERS = [
  { id: "all", label: "All stretches", keywords: [] },
  { id: "hips", label: "Hips", keywords: ["hip flexors", "anterior hip", "hip rotators", "posterior hip", "outer hip", "tensor fasciae latae", "lateral hip"] },
  { id: "glutes", label: "Glutes", keywords: ["glutes", "piriformis", "posterior hip", "glute medius"] },
  { id: "hamstrings", label: "Hamstrings", keywords: ["hamstrings", "posterior chain"] },
  { id: "adductors", label: "Adductors", keywords: ["adductors", "groin", "inner thigh"] },
  { id: "quads", label: "Quads", keywords: ["quads", "front thigh", "rectus femoris"] },
  { id: "calves", label: "Calves", keywords: ["calves", "achilles", "ankles", "peroneals", "outer calf"] },
  { id: "chest", label: "Chest", keywords: ["chest", "pec", "front shoulder", "biceps", "serratus"] },
  { id: "shoulders", label: "Shoulders", keywords: ["shoulder", "rear shoulder", "triceps", "shoulder girdle", "rotator cuff"] },
  { id: "upper-back", label: "Upper back", keywords: ["mid-back", "upper back", "thoracic", "lats", "rotation", "spine", "rhomboids", "quadratus lumborum", "side body"] },
  { id: "neck", label: "Neck", keywords: ["neck", "upper traps", "levator", "scalenes"] },
  { id: "forearms", label: "Forearms", keywords: ["forearm", "wrist", "flexors", "extensors", "palms"] },
] as const;

export type StretchLibraryFilterId = (typeof STRETCH_LIBRARY_FILTERS)[number]["id"];

type IndexedStretchReferenceSummary = StretchReferenceSummary & {
  searchHaystack: string;
};

function buildStretchSearchHaystack(stretch: StretchReferenceSummary) {
  return [
    stretch.name,
    stretch.bodyPosition,
    stretch.durationGuidance,
    stretch.equipment,
    ...stretch.targetAreas,
    ...stretch.bestFor,
  ].join(" ").toLowerCase();
}

export const STRETCH_LIBRARY_SEARCH_INDEX: IndexedStretchReferenceSummary[] = STRETCH_LIBRARY_SUMMARIES.map((stretch) => ({
  id: stretch.id,
  name: stretch.name,
  targetAreas: stretch.targetAreas,
  bodyPosition: stretch.bodyPosition,
  durationGuidance: stretch.durationGuidance,
  equipment: stretch.equipment,
  bestFor: stretch.bestFor,
  searchHaystack: buildStretchSearchHaystack(stretch),
}));

const stretchFilterLookup = new Map(STRETCH_LIBRARY_FILTERS.map((filter) => [filter.id, filter] as const));

export function matchesStretchFilter(stretch: IndexedStretchReferenceSummary, filterId: StretchLibraryFilterId) {
  if (filterId === "all") {
    return true;
  }

  const filter = stretchFilterLookup.get(filterId);
  if (!filter) {
    return true;
  }

  const filterHaystack = [...stretch.targetAreas, ...stretch.bestFor, stretch.searchHaystack].join(" ").toLowerCase();
  return filter.keywords.some((keyword) => filterHaystack.includes(keyword.toLowerCase()));
}

const stretchFilterBuckets = new Map<StretchLibraryFilterId, IndexedStretchReferenceSummary[]>(
  STRETCH_LIBRARY_FILTERS.map((filter) => [
    filter.id,
    filter.id === "all"
      ? STRETCH_LIBRARY_SEARCH_INDEX
      : STRETCH_LIBRARY_SEARCH_INDEX.filter((stretch) => matchesStretchFilter(stretch, filter.id)),
  ]),
);

export function queryStretchLibrary({
  filterId = "all",
  query = "",
}: {
  filterId?: StretchLibraryFilterId;
  query?: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const candidatePool = stretchFilterBuckets.get(filterId) ?? STRETCH_LIBRARY_SEARCH_INDEX;

  return candidatePool.filter((stretch) => {
    if (queryTokens.length === 0) {
      return true;
    }

    return queryTokens.every((token) => stretch.searchHaystack.includes(token));
  });
}
