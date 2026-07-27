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
    eyebrow: "Your Details",
    title: "Custom Workout Setup Intake",
    body: "Start with the same identity and consent details used by the canonical setup form.",
    nextLabel: "Next",
  },
  {
    id: "goals",
    eyebrow: "Main Goal",
    title: "Main Goal",
    body: "Capture the complete goal, target-area, and current-struggle picture.",
    nextLabel: "Next",
  },
  {
    id: "experience",
    eyebrow: "Background",
    title: "Body + Training Background",
    body: "Record the baseline the routine and progression rules need to respect.",
    nextLabel: "Next",
  },
  {
    id: "equipment",
    eyebrow: "Equipment",
    title: "Equipment Access",
    body: "Record where you train, everything available, and anything you do not want used.",
    nextLabel: "Next",
  },
  {
    id: "schedule",
    eyebrow: "Schedule",
    title: "Schedule + Lifestyle",
    body: "Capture realistic availability, preferred days, activity, and recovery context.",
    nextLabel: "Next",
  },
  {
    id: "preferences",
    eyebrow: "Preferences",
    title: "Exercise Preferences",
    body: "Capture what you enjoy, avoid, want to improve, and how the plan should feel.",
    nextLabel: "Next",
  },
  {
    id: "constraints",
    eyebrow: "Safety",
    title: "Complications / Injuries / Things To Plan Around",
    body: "Record limitations, warning symptoms, professional restrictions, and safety acknowledgments.",
    nextLabel: "Next",
  },
  {
    id: "nutrition",
    eyebrow: "Nutrition",
    title: "Nutrition Basics",
    body: "Capture current habits and the nutrition support that should accompany the plan.",
    nextLabel: "Next",
  },
  {
    id: "delivery",
    eyebrow: "Delivery",
    title: "Accountability + Delivery",
    body: "Set plan detail, delivery, follow-up, feedback, and final acknowledgments.",
    nextLabel: "Review",
  },
  {
    id: "review",
    eyebrow: "Review",
    title: "Review the saved intake",
    body: "Confirm every answer before the curated engine builds an editable routine draft.",
    nextLabel: "Generate plan",
  },
  {
    id: "generation-handoff",
    eyebrow: "Generated Plan",
    title: "Review your curated routine",
    body: "Review the deterministic plan, then open it as a normal editable routine draft before publishing.",
    nextLabel: "Create editable draft",
  },
];

const STEP_REGISTRY_BY_ID = new Map(CURATED_STEP_REGISTRY.map((step) => [step.id, step]));

export function getCuratedStepDefinition(stepId: CuratedStepId) {
  return STEP_REGISTRY_BY_ID.get(stepId) ?? CURATED_STEP_REGISTRY[0];
}

export { CURATED_STEP_ORDER };
