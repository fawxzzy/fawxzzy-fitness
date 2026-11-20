/**
 * One formatter for the goal line on exercise cards (Today, the in-progress workout, the day editor).
 *
 * Input is the goal split into parts, as every caller already has it (`splitExerciseTargetValues`):
 *   ["4 sets", "5 reps", "225 lbs"]           -> "4 × 5 @ 225 lbs"
 *   ["4 sets", "8–10 reps", "35 lbs"]         -> "4 × 8–10 @ 35 lbs"
 *   ["1 set", "18:00 s", "2 km"]              -> "18:00 · 2 km"
 *   ["3 sets", "0:45 s"]                      -> "3 × 0:45"
 *   ["4 sets", "100 lbs"]                     -> "4 sets @ 100 lbs"
 *
 * Rules: sets and the main effort (reps, else time, else distance, else calories) join with "×"; reps drop their
 * noun once "×" says it; a single set drops "1 ×" for timed and distance work; the clock never carries a stray
 * "s"; the load follows "@"; anything else trails with a middle dot. The visual line uses symbols, so the card
 * also gets a spoken form ("4 sets of 5 reps at 225 lbs") for screen readers.
 *
 * Presentation only: no goal is computed, rounded or converted here.
 */

export type ExerciseGoalDisplay = {
  /** Visual line, for example `4 × 5 @ 225 lbs`. */
  text: string;
  /** Screen-reader line, for example `4 sets of 5 reps at 225 lbs`. */
  spoken: string;
};

type GoalPartKind = "sets" | "reps" | "failure" | "weight" | "time" | "distance" | "calories" | "other";

type GoalPart = {
  kind: GoalPartKind;
  /** Visual text for the part, units kept where they carry meaning. */
  text: string;
  /** Number in front of the noun (sets and reps only). */
  count?: string;
  noun?: string;
};

const SETS_PATTERN = /^(\d+)\s*(sets?|intervals?|rounds?)$/i;
const REPS_PATTERN = /^(\d+(?:\s*[–-]\s*\d+)?)\s*reps?$/i;
const FAILURE_PATTERN = /^(?:to\s+)?failure$/i;
const WEIGHT_PATTERN = /^\d+(?:[.,]\d+)?\s*(?:lbs?|kgs?|pounds?|kilograms?)$/i;
const CLOCK_PATTERN = /^(\d+:\d{2}(?::\d{2})?)(?:\s*(?:s|sec|secs|seconds?))?$/i;
const DISTANCE_PATTERN = /^\d+(?:[.,]\d+)?\s*(?:mi|miles?|km|m|meters?|metres?|yd|yards?)$/i;
const CALORIES_PATTERN = /^\d+(?:[.,]\d+)?\s*(?:cal|kcal|calories)$/i;

function classifyGoalPart(raw: string): GoalPart | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) {
    return null;
  }

  const sets = text.match(SETS_PATTERN);
  if (sets) {
    return { kind: "sets", text, count: sets[1], noun: sets[2].toLowerCase() };
  }

  const reps = text.match(REPS_PATTERN);
  if (reps) {
    // Ranges always read with an en dash ("8–10"), whichever dash the stored line used.
    const count = reps[1].replace(/\s*[–-]\s*/, "–");
    return { kind: "reps", text: `${count} ${count === "1" ? "rep" : "reps"}`, count, noun: count === "1" ? "rep" : "reps" };
  }

  if (FAILURE_PATTERN.test(text)) {
    return { kind: "failure", text: "failure" };
  }

  if (WEIGHT_PATTERN.test(text)) {
    return { kind: "weight", text };
  }

  const clock = text.match(CLOCK_PATTERN);
  if (clock) {
    return { kind: "time", text: clock[1] };
  }

  if (DISTANCE_PATTERN.test(text)) {
    return { kind: "distance", text };
  }

  if (CALORIES_PATTERN.test(text)) {
    return { kind: "calories", text };
  }

  return { kind: "other", text };
}

const EFFORT_PRIORITY: GoalPartKind[] = ["reps", "failure", "time", "distance", "calories"];

function spokenClock(clock: string) {
  const pieces = clock.split(":").map((piece) => Number.parseInt(piece, 10));
  const [hours, minutes, seconds] = pieces.length === 3 ? pieces : [0, pieces[0], pieces[1]];
  const words: string[] = [];
  if (hours > 0) words.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0) words.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds > 0 || words.length === 0) words.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  return words.join(" ");
}

function spokenPart(part: GoalPart) {
  if (part.kind === "time") return spokenClock(part.text);
  if (part.kind === "reps") return `${part.count?.replace("–", " to ")} ${part.noun}`;
  if (part.kind === "failure") return "to failure";
  return part.text;
}

/** `null` when there is nothing to show (no parts, or only blanks). */
export function formatExerciseGoalDisplay(parts: readonly string[]): ExerciseGoalDisplay | null {
  const classified = parts.map(classifyGoalPart).filter((part): part is GoalPart => part !== null);
  if (classified.length === 0) {
    return null;
  }

  const sets = classified.find((part) => part.kind === "sets") ?? null;
  const effortKind = EFFORT_PRIORITY.find((kind) => classified.some((part) => part.kind === kind)) ?? null;
  const effort = effortKind ? classified.find((part) => part.kind === effortKind) ?? null : null;
  const weight = classified.find((part) => part.kind === "weight") ?? null;
  const rest = classified.filter((part) => part !== sets && part !== effort && part !== weight);

  const visual: string[] = [];
  const spoken: string[] = [];
  const setCount = sets?.count ?? null;
  const isRepEffort = effort?.kind === "reps" || effort?.kind === "failure";

  if (sets && effort) {
    const dropsSingleSet = setCount === "1" && !isRepEffort;
    const effortVisual = effort.kind === "reps" ? effort.count ?? effort.text : effort.text;
    visual.push(dropsSingleSet ? effort.text : `${setCount} × ${effortVisual}`);
    spoken.push(dropsSingleSet ? spokenPart(effort) : `${sets.text} of ${spokenPart(effort)}`);
  } else if (sets) {
    visual.push(sets.text);
    spoken.push(sets.text);
  } else if (effort) {
    visual.push(effort.text);
    spoken.push(spokenPart(effort));
  }

  if (weight) {
    visual.push(visual.length > 0 ? `@ ${weight.text}` : weight.text);
    spoken.push(spoken.length > 0 ? `at ${weight.text}` : weight.text);
  }

  const head = visual.join(" ");
  const tail = rest.map((part) => part.text);
  const text = [head, ...tail].filter(Boolean).join(" · ");
  const spokenText = [spoken.join(" "), ...rest.map(spokenPart)].filter(Boolean).join(", ");

  return { text, spoken: spokenText };
}
