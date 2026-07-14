import { FEEDBACK_MONETIZATION_CARD_SET } from "./feedback-monetization-roadmap.mjs";
import { FEEDBACK_SESSION_TIMER_CARD_SET } from "./feedback-session-exercise-timer-cards.mjs";

const FEEDBACK_CARD_SET_DEFINITIONS = [
  {
    key: "monetization",
    aliases: ["monetization", "monetization-roadmap", "ff-mon"],
    spec: FEEDBACK_MONETIZATION_CARD_SET,
  },
  {
    key: "session-exercise-timers",
    aliases: [
      "session-exercise-timers",
      "session-exercise-timer",
      "exercise-timers",
      "session-timers",
      "ff-session",
      "session-rest-timers",
      "session-rest-timer",
      "session-rest",
      "rest-timers",
    ],
    spec: FEEDBACK_SESSION_TIMER_CARD_SET,
  },
];

export function listFeedbackCardSets() {
  return FEEDBACK_CARD_SET_DEFINITIONS.map(({ key, spec }) => ({
    key,
    name: spec.name,
    cardCount: Array.isArray(spec.cards) ? spec.cards.length : 0,
  }));
}

export function resolveFeedbackCardSet(name) {
  const normalizedName = String(name ?? "").trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  return FEEDBACK_CARD_SET_DEFINITIONS.find(({ key, aliases }) => (
    key === normalizedName
    || aliases.some((alias) => alias === normalizedName)
  )) ?? null;
}
