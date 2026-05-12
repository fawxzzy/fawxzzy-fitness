import { CURATED_STEP_ORDER } from "./constants.ts";
import type { CuratedStepId } from "./types.ts";

export interface CuratedStepDefinition {
  id: CuratedStepId;
  eyebrow: string;
  title: string;
  body: string;
  nextLabel: string;
}

export const CURATED_STEP_REGISTRY: CuratedStepDefinition[] = [
  {
    id: "intro",
    eyebrow: "First-Time Setup",
    title: "Set up your training",
    body: "Share your setup once so the first curated plan can be shaped around your real schedule, equipment, and preferences.",
    nextLabel: "Start setup",
  },
  {
    id: "goals",
    eyebrow: "Training Focus",
    title: "What are you training for?",
    body: "Pick the focus that should anchor your first routine.",
    nextLabel: "Next",
  },
  {
    id: "experience",
    eyebrow: "Experience",
    title: "How experienced are you right now?",
    body: "This helps us size progression, exercise complexity, and how hard the opening weeks should feel.",
    nextLabel: "Next",
  },
  {
    id: "equipment",
    eyebrow: "Equipment",
    title: "What equipment can you actually use?",
    body: "Choose every setup that should be considered safe to program around.",
    nextLabel: "Next",
  },
  {
    id: "schedule",
    eyebrow: "Schedule",
    title: "How often and how long can you train?",
    body: "Lock in the weekly rhythm the future plan should respect from day one.",
    nextLabel: "Next",
  },
  {
    id: "preferences",
    eyebrow: "Preferences",
    title: "How should the routine feel?",
    body: "Choose the split and cardio balance that make the routine feel usable, not theoretical.",
    nextLabel: "Next",
  },
  {
    id: "constraints",
    eyebrow: "Constraints",
    title: "Anything the routine should avoid or favor?",
    body: "Flag limitations, dislikes, and any areas you want the plan to emphasize.",
    nextLabel: "Review",
  },
  {
    id: "review",
    eyebrow: "Review",
    title: "Review the saved intake",
    body: "This is the intake payload we will save now and hand to the curated engine once generation is live.",
    nextLabel: "Save intake",
  },
  {
    id: "generation-handoff",
    eyebrow: "Generator Handoff",
    title: "Your intake is saved",
    body: "The handoff contract is connected, but real routine generation is still intentionally out of scope for this pass.",
    nextLabel: "Open Today",
  },
];

const STEP_REGISTRY_BY_ID = new Map(CURATED_STEP_REGISTRY.map((step) => [step.id, step]));

export function getCuratedStepDefinition(stepId: CuratedStepId) {
  return STEP_REGISTRY_BY_ID.get(stepId) ?? CURATED_STEP_REGISTRY[0];
}

export { CURATED_STEP_ORDER };
