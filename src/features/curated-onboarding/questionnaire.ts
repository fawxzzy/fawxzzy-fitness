import type {
  CardioPreference,
  CuratedIntakeResponses,
  CuratedIntakeSection,
  CuratedOnboardingData,
  CuratedQuestionDefinition,
  CuratedStepId,
  EquipmentAccess,
  ExperienceLevel,
  PreferredStyle,
  TrainingGoal,
} from "./types.ts";

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const yesNoOther = yesNo;

export const CURATED_INTAKE_SECTIONS: readonly CuratedIntakeSection[] = [
  {
    stepId: "intro",
    title: "Your Details",
    description:
      "Your answers shape a workout plan around your goals, schedule, equipment, training background, limitations, and preferences.",
    questions: [
      { id: "email", label: "Email", type: "short-text", required: true, readOnly: true },
      { id: "name", label: "Name", type: "short-text", required: true, placeholder: "Your name" },
      {
        id: "contactMethod",
        label: "Best contact method if different from email (or N/A)",
        type: "short-text",
        required: true,
        placeholder: "N/A",
      },
      {
        id: "socialUsername",
        label: "TikTok / Instagram username (or N/A)",
        type: "short-text",
        required: true,
        placeholder: "N/A",
      },
      { id: "under18", label: "Are you under 18?", type: "single", required: true, options: yesNo },
      {
        id: "guardianPermission",
        label: "Do you have parent/guardian permission to follow a general workout routine?",
        type: "single",
        required: true,
        visibleWhen: { questionId: "under18", values: ["yes"] },
        options: yesNo,
      },
    ],
  },
  {
    stepId: "goals",
    title: "Main Goal",
    questions: [
      {
        id: "mainGoals",
        label: "What is your main goal right now?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "build-muscle", label: "Build Muscle" },
          { value: "get-stronger", label: "Get Stronger" },
          { value: "lose-fat", label: "Lose Fat" },
          { value: "get-leaner", label: "Get Leaner / More Visible Abs" },
          { value: "gain-weight", label: "Gain Weight" },
          { value: "athleticism", label: "Improve Athleticism" },
          { value: "gym-confidence", label: "Improve Confidence in Gym" },
          { value: "consistency", label: "Build a Consistent Routine" },
        ],
      },
      {
        id: "primaryGoal",
        label: "If you had to pick ONE main goal, what is it? Or if you chose Other explain:",
        type: "short-text",
        required: true,
        placeholder: "Your main goal",
      },
      {
        id: "topThreeGoals",
        label: "What are your top 3 body/fitness goals?",
        type: "long-text",
        required: true,
        placeholder: "List your top three goals",
      },
      {
        id: "areasToImprove",
        label: "What areas do you most want to improve?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "chest", label: "Chest" },
          { value: "back", label: "Back" },
          { value: "shoulders", label: "Shoulders" },
          { value: "arms", label: "Arms" },
          { value: "legs", label: "Legs" },
          { value: "glutes", label: "Glutes" },
          { value: "core", label: "Abs/Core" },
          { value: "conditioning", label: "Conditioning/Cardio" },
          { value: "mobility", label: "Mobility/Flexibility" },
          { value: "overall", label: "Overall Physique" },
        ],
      },
      {
        id: "biggestStruggles",
        label: "What are your biggest struggles right now?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "exercise-selection", label: "I don't know what exercises to do" },
          { value: "routine-hopping", label: "I change routines too often" },
          { value: "progression", label: "I don't know how to progress" },
          { value: "consistency", label: "I struggle with consistency" },
          { value: "overeating", label: "I overeat / snack too much" },
          { value: "undereating", label: "I don't eat enough" },
          { value: "pain", label: "I don't know how to train around pain/injuries" },
          { value: "gym-confidence", label: "I feel awkward in the gym" },
          { value: "equipment", label: "I don't have enough equipment" },
          { value: "time", label: "I don't have enough time" },
        ],
      },
    ],
  },
  {
    stepId: "experience",
    title: "Body + Training Background",
    questions: [
      { id: "height", label: "Height", type: "short-text", required: true, placeholder: "5 ft 10 in" },
      { id: "currentWeight", label: "Current Weight", type: "short-text", required: true, placeholder: "180 lbs" },
      {
        id: "weightDirection",
        label: "Are you trying to gain, lose, or maintain weight?",
        type: "single",
        required: true,
        options: [
          { value: "gain", label: "Gain Weight" },
          { value: "lose", label: "Lose Weight" },
          { value: "maintain", label: "Maintain Weight" },
          { value: "not-sure", label: "Not Sure" },
        ],
      },
      {
        id: "trainingExperience",
        label: "How long have you been working out consistently?",
        type: "single",
        required: true,
        options: [
          { value: "brand-new", label: "Brand New" },
          { value: "under-3-months", label: "Less than 3 months" },
          { value: "3-6-months", label: "3-6 months" },
          { value: "6-12-months", label: "6-12 months" },
          { value: "1-2-years", label: "1-2 years" },
          { value: "2-plus-years", label: "2+ years" },
          { value: "on-and-off", label: "I've trained on/off for awhile" },
        ],
      },
      {
        id: "currentRoutine",
        label: "What does your current routine look like?",
        type: "long-text",
        required: true,
        placeholder: "Describe your current training week",
      },
      {
        id: "currentSplit",
        label: "Paste your current workout split if you have one. (Use N.A. for not available)",
        type: "long-text",
        placeholder: "N.A.",
      },
      {
        id: "tracksWorkouts",
        label: "Do you track your lifts/workouts?",
        type: "single",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "sometimes", label: "Sometimes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "trackingTool",
        label: "What do you use to track?",
        type: "short-text",
        placeholder: "App, notes, spreadsheet",
        visibleWhen: { questionId: "tracksWorkouts", values: ["yes", "sometimes"] },
      },
      {
        id: "mainLiftNumbers",
        label: "What are your current rough numbers for main lifts, if you know them?",
        type: "long-text",
        placeholder: "Bench, squat, deadlift, or other useful baselines",
      },
    ],
  },
  {
    stepId: "schedule",
    title: "Schedule + Lifestyle",
    questions: [
      {
        id: "trainingDaysPerWeek",
        label: "How many days per week can you realistically train?",
        type: "single",
        required: true,
        allowOther: true,
        options: [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value: String(value), label: `${value} day${value === 1 ? "" : "s"}` })),
      },
      {
        id: "workoutLength",
        label: "How long can each workout be?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "20-30", label: "20-30 min" },
          { value: "30-45", label: "30-45 min" },
          { value: "45-60", label: "45-60 min" },
          { value: "60-90", label: "60-90 min" },
          { value: "90-plus", label: "90+ min" },
        ],
      },
      {
        id: "preferredTrainingDays",
        label: "Which days do you prefer to train?",
        type: "multi",
        required: true,
        allowOther: true,
        options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Flexible"].map((label) => ({
          value: label.toLowerCase(),
          label,
        })),
      },
      {
        id: "trainingTime",
        label: "What time of day do you usually train?",
        type: "single",
        required: true,
        allowOther: true,
        options: ["Morning", "Afternoon", "Evening", "Night"].map((label) => ({ value: label.toLowerCase(), label })),
      },
      {
        id: "outsideActivity",
        label: "How active are you outside the gym?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "mostly-sitting", label: "Mostly Sitting" },
          { value: "lightly-active", label: "Lightly Active" },
          { value: "pretty-active", label: "Pretty Active" },
          { value: "very-active", label: "Very Active" },
        ],
      },
      {
        id: "sleepHours",
        label: "How many hours of sleep do you usually get?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "under-5", label: "Less than 5" },
          { value: "5-6", label: "5-6" },
          { value: "6-7", label: "6-7" },
          { value: "7-8", label: "7-8" },
          { value: "8-plus", label: "8+" },
        ],
      },
    ],
  },
  {
    stepId: "equipment",
    title: "Equipment Access",
    questions: [
      {
        id: "trainingLocations",
        label: "Where do you train?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "commercial-gym", label: "Commercial Gym" },
          { value: "planet-fitness", label: "Planet Fitness" },
          { value: "home-gym", label: "Home Gym" },
          { value: "school-gym", label: "School Gym" },
          { value: "apartment-gym", label: "Apartment Gym" },
          { value: "outside", label: "Outside" },
        ],
      },
      {
        id: "availableEquipment",
        label: "What equipment do you have access to?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "dumbbells", label: "Dumbbells" },
          { value: "barbells", label: "Barbells" },
          { value: "bench", label: "Bench" },
          { value: "incline-bench", label: "Incline Bench" },
          { value: "squat-rack", label: "Squat Rack" },
          { value: "smith-machine", label: "Smith Machine" },
          { value: "cables", label: "Cables" },
          { value: "machines", label: "Machines" },
          { value: "pull-up-bar", label: "Pull-up Bar" },
          { value: "resistance-bands", label: "Resistance Bands" },
          { value: "kettlebells", label: "Kettlebells" },
          { value: "treadmill", label: "Treadmill" },
          { value: "bike", label: "Bike" },
          { value: "bodyweight", label: "None / Body weight only" },
        ],
      },
      {
        id: "heaviestDumbbells",
        label: "What is the heaviest pair of dumbbells you have access to?",
        type: "short-text",
        placeholder: "50 lbs",
        visibleWhen: { questionId: "availableEquipment", values: ["dumbbells"] },
      },
      { id: "equipmentAvoid", label: "Any equipment you do NOT want to use?", type: "long-text", placeholder: "N.A." },
    ],
  },
  {
    stepId: "constraints",
    title: "Complications / Injuries / Things To Plan Around",
    questions: [
      {
        id: "hasPainOrLimitations",
        label: "Do you currently have any pain, injuries, or physical limitations?",
        type: "single",
        required: true,
        allowOther: true,
        options: yesNoOther,
      },
      {
        id: "painDetails",
        label: "Explain what's going on.",
        type: "long-text",
        placeholder: "Describe the pain, injury, or limitation",
        visibleWhen: { questionId: "hasPainOrLimitations", values: ["yes"] },
      },
      {
        id: "exercisesCannotDo",
        label: "Are there any exercises you cannot do or should avoid? (N.A. if unavailable)",
        type: "long-text",
        placeholder: "N.A.",
      },
      {
        id: "uncomfortableExercises",
        label: "Are there any exercises that feel uncomfortable, painful, or sketchy? (N.A. if unavailable)",
        type: "long-text",
        placeholder: "N.A.",
      },
      {
        id: "professionalRestrictions",
        label: "Have you ever been told by a doctor, physical therapist, coach, or trainer to avoid certain movements?",
        type: "single",
        required: true,
        allowOther: true,
        options: yesNoOther,
      },
      {
        id: "restrictedMovements",
        label: "What were you told to avoid?",
        type: "long-text",
        placeholder: "Movements or activities to avoid",
        visibleWhen: { questionId: "professionalRestrictions", values: ["yes"] },
      },
      {
        id: "warningSymptoms",
        label: "Do you experience any of these during exercise?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "chest-pain", label: "Chest pain or chest discomfort" },
          { value: "dizziness", label: "Dizziness, fainting, or blackouts" },
          { value: "shortness-of-breath", label: "Unusual shortness of breath" },
          { value: "palpitations", label: "Heart palpitations" },
          { value: "fatigue", label: "Unusual fatigue" },
          { value: "swelling", label: "Swelling in ankles/legs" },
          { value: "lower-leg-burning", label: "Burning/cramping in lower legs" },
          { value: "none", label: "None of these" },
        ],
      },
      {
        id: "medicalConditions",
        label: "Do you have any medical conditions I should know about before building the plan?",
        type: "long-text",
        placeholder: "N.A.",
      },
      {
        id: "medications",
        label: "Are you taking any medications or treatments that affect exercise, heart rate, energy, dizziness, pain, or recovery?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          ...yesNo,
          { value: "prefer-not-to-say", label: "Prefer not to say" },
        ],
      },
      {
        id: "medicationConsiderations",
        label: "Is there anything important I should plan around?",
        type: "long-text",
        placeholder: "Relevant exercise or recovery considerations",
        visibleWhen: { questionId: "medications", values: ["yes"] },
      },
      {
        id: "safetyAcknowledgment",
        label:
          "I understand this is general fitness guidance, not medical advice. I will stop if I feel sharp pain, dizziness, chest pain, faintness, or anything unsafe, and I'll consult a qualified professional if needed.",
        type: "acknowledgment",
        required: true,
      },
    ],
    notices: [
      {
        afterQuestionId: "warningSymptoms",
        title: "Safety note",
        body: "If you selected any warning symptoms above, I may only be able to provide general guidance and may ask you to check with a qualified professional before starting or changing exercise.",
        tone: "warning",
      },
    ],
  },
  {
    stepId: "preferences",
    title: "Exercise Preferences",
    questions: [
      { id: "exerciseEnjoy", label: "What exercises do you enjoy?", type: "long-text", required: true, placeholder: "Exercises you like" },
      { id: "exerciseHate", label: "What exercises do you hate?", type: "long-text", placeholder: "Exercises you dislike" },
      {
        id: "movementsToImprove",
        label: "What movements do you want to get better at?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "push-ups", label: "Push-ups" },
          { value: "pull-ups", label: "Pull-ups" },
          { value: "bench-press", label: "Bench press" },
          { value: "squat", label: "Squat" },
          { value: "deadlift-rdl", label: "Deadlift/RDL" },
          { value: "rows", label: "Rows" },
          { value: "shoulder-press", label: "Shoulder press" },
          { value: "arms", label: "Curls/arms" },
          { value: "core", label: "Abs/core" },
          { value: "cardio", label: "Running/cardio" },
        ],
      },
      {
        id: "planStyle",
        label: "What style of plan do you prefer?",
        type: "single",
        required: true,
        options: [
          { value: "simple-repeatable", label: "Simple repeatable" },
          { value: "more-variety", label: "More variety" },
          { value: "strength-focused", label: "Strength-focused" },
          { value: "muscle-focused", label: "Muscle-building-focused" },
          { value: "athletic-focused", label: "Athletic/conditioning-focused" },
          { value: "pick-for-me", label: "Pick for me" },
        ],
      },
      {
        id: "equipmentPreference",
        label: "Do you prefer gym machines, free weights, bodyweight, or a mix?",
        type: "single",
        required: true,
        options: [
          { value: "machines", label: "Machines" },
          { value: "free-weights", label: "Free weights" },
          { value: "bodyweight", label: "Bodyweight" },
          { value: "mix", label: "Mix" },
          { value: "whatever-works", label: "Whatever works" },
        ],
      },
    ],
  },
  {
    stepId: "nutrition",
    title: "Nutrition Basics",
    questions: [
      {
        id: "tracksFood",
        label: "Do you track food or calories?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "sometimes", label: "Sometimes" },
          { value: "used-to", label: "Used to" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "tracksProtein",
        label: "Do you track protein?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "sometimes", label: "Sometimes" },
          { value: "used-to", label: "Used to" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "eatingPattern",
        label: "How would you describe your eating right now?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "clean", label: "Clean" },
          { value: "undereat", label: "Undereat" },
          { value: "overeat", label: "Overeat" },
          { value: "snack", label: "Snack a lot" },
          { value: "random", label: "Eat randomly" },
          { value: "consistent", label: "I'm consistent" },
        ],
      },
      {
        id: "foodRestrictions",
        label: "Any food restrictions, allergies, or preferences?",
        type: "long-text",
        placeholder: "N.A.",
      },
      {
        id: "nutritionDirection",
        label: "Are you trying to bulk, cut, recomp, or just build better habits?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "bulk", label: "Bulk / gain weight" },
          { value: "cut", label: "Cut / lose fat" },
          { value: "recomp", label: "Recomp / build muscle and lose fat slowly" },
          { value: "habits", label: "Build better habits" },
        ],
      },
      {
        id: "nutritionHelp",
        label: "What nutrition help do you want included?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "protein", label: "Protein target guidance" },
          { value: "meals", label: "Simple meal ideas" },
          { value: "lean-bulk", label: "Lean bulk tips" },
          { value: "fat-loss", label: "Fat loss basics" },
          { value: "grocery", label: "Grocery ideas" },
          { value: "habits", label: "Habit structure" },
          { value: "none", label: "I don't want nutrition help" },
        ],
      },
    ],
  },
  {
    stepId: "delivery",
    title: "Accountability + Delivery",
    questions: [
      {
        id: "planContents",
        label: "What do you want from the plan?",
        type: "multi",
        required: true,
        allowOther: true,
        options: [
          { value: "weekly-split", label: "Full weekly split" },
          { value: "exercise-list", label: "Exercise list" },
          { value: "sets-reps", label: "Sets/reps" },
          { value: "progression", label: "Progression rules" },
          { value: "warm-up", label: "Warm-up guidance" },
          { value: "substitutions", label: "Substitutions" },
          { value: "core", label: "Abs/core plan" },
          { value: "cardio", label: "Cardio guidance" },
          { value: "nutrition", label: "Nutrition notes" },
          { value: "check-ins", label: "Check-in structure" },
        ],
      },
      {
        id: "planDetail",
        label: "How detailed do you want the plan?",
        type: "single",
        required: true,
        options: [
          { value: "simple", label: "Simple: Tell me what to do" },
          { value: "medium", label: "Medium: Plan + Notes" },
          { value: "detailed", label: "Detailed: Explain everything" },
        ],
      },
      {
        id: "deliveryMethod",
        label: "How do you want the plan delivered?",
        type: "single",
        required: true,
        allowOther: true,
        options: [
          { value: "google-doc", label: "Google Doc" },
          { value: "pdf", label: "PDF" },
          { value: "app", label: "In the app later, if available" },
          { value: "social", label: "Text/Other Social platform" },
          { value: "email", label: "Email" },
        ],
      },
      {
        id: "followUpConsent",
        label: "Are you okay with me checking in after 2-4 weeks to see how it went?",
        type: "single",
        required: true,
        allowOther: true,
        options: yesNoOther,
      },
      {
        id: "testimonialConsent",
        label: "If this helps you, are you okay with me using anonymous feedback/testimonial later?",
        type: "single",
        required: true,
        allowOther: true,
        options: yesNoOther,
      },
      { id: "anythingElse", label: "Anything else you want me to know?", type: "long-text", placeholder: "Optional" },
      {
        id: "accuracyAcknowledgment",
        label: "I understand that my plan will be built based on the information I provide.",
        type: "acknowledgment",
        required: true,
      },
      {
        id: "fitnessGuidanceAcknowledgment",
        label:
          "I understand that if I have pain, injuries, medical concerns, or warning symptoms, I should consult a qualified professional before starting or progressing exercise.",
        type: "acknowledgment",
        required: true,
      },
    ],
  },
] as const;

export const CURATED_QUESTIONS = CURATED_INTAKE_SECTIONS.flatMap((section) => section.questions);
export const CURATED_QUESTION_IDS = CURATED_QUESTIONS.map((question) => question.id);

const sectionByStep = new Map(CURATED_INTAKE_SECTIONS.map((section) => [section.stepId, section]));
const questionById = new Map(CURATED_QUESTIONS.map((question) => [question.id, question]));

export function getCuratedIntakeSection(stepId: CuratedStepId) {
  return sectionByStep.get(stepId as CuratedIntakeSection["stepId"]) ?? null;
}

export function getCuratedQuestion(questionId: string) {
  return questionById.get(questionId) ?? null;
}

export function getStringResponse(responses: CuratedIntakeResponses, questionId: string) {
  const value = responses[questionId];
  return typeof value === "string" ? value : "";
}

export function getArrayResponse(responses: CuratedIntakeResponses, questionId: string) {
  const value = responses[questionId];
  return Array.isArray(value) ? value : [];
}

export function isCuratedQuestionVisible(
  question: CuratedQuestionDefinition,
  responses: CuratedIntakeResponses,
) {
  if (!question.visibleWhen) return true;

  const parentResponse = responses[question.visibleWhen.questionId];
  if (Array.isArray(parentResponse)) {
    return question.visibleWhen.values.some((value) => parentResponse.includes(value));
  }

  return typeof parentResponse === "string" && question.visibleWhen.values.includes(parentResponse);
}

export function removeHiddenCuratedResponses(responses: CuratedIntakeResponses) {
  const visibleResponses = { ...responses };

  for (const question of CURATED_QUESTIONS) {
    if (isCuratedQuestionVisible(question, visibleResponses)) continue;
    delete visibleResponses[question.id];
    delete visibleResponses[`${question.id}Other`];
  }

  return visibleResponses;
}

export function hasCuratedQuestionResponse(
  question: CuratedQuestionDefinition,
  responses: CuratedIntakeResponses,
) {
  const value = responses[question.id];
  const hasOtherResponse = getStringResponse(responses, `${question.id}Other`).trim().length > 0;

  if (question.type === "acknowledgment") {
    return value === true;
  }

  if (question.type === "multi") {
    return Array.isArray(value) && value.length > 0 && (!value.includes("other") || hasOtherResponse);
  }

  return typeof value === "string" && value.trim().length > 0 && (value !== "other" || hasOtherResponse);
}

export function getMissingRequiredQuestionIds(stepId: CuratedStepId, responses: CuratedIntakeResponses) {
  const section = getCuratedIntakeSection(stepId);
  if (!section) return [];

  return section.questions
    .filter((question) =>
      isCuratedQuestionVisible(question, responses)
      && question.required
      && !hasCuratedQuestionResponse(question, responses),
    )
    .map((question) => question.id);
}

function optionLabel(questionId: string, value: string) {
  const question = getCuratedQuestion(questionId);
  if (value === "other") return "Other";
  return question?.options?.find((option) => option.value === value)?.label ?? value;
}

export function formatCuratedResponse(question: CuratedQuestionDefinition, responses: CuratedIntakeResponses) {
  const value = responses[question.id];
  if (value === true) return "Confirmed";
  if (Array.isArray(value)) {
    const labels = value.map((entry) => optionLabel(question.id, entry));
    const other = value.includes("other") ? getStringResponse(responses, `${question.id}Other`) : "";
    return [...labels.filter((label) => label !== "Other"), ...(other ? [other] : [])].join(", ") || "Not answered";
  }
  if (typeof value === "string" && value) {
    if (value === "other") return getStringResponse(responses, `${question.id}Other`) || "Other";
    return question.options ? optionLabel(question.id, value) : value;
  }
  return question.required ? "Not answered" : "Not provided";
}

function splitTextList(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function deriveTrainingGoal(responses: CuratedIntakeResponses): TrainingGoal {
  const goals = getArrayResponse(responses, "mainGoals");
  const primary = getStringResponse(responses, "primaryGoal").toLowerCase();
  if (goals.includes("get-stronger") || primary.includes("strong")) return "get-stronger";
  if (goals.includes("build-muscle") || goals.includes("gain-weight") || primary.includes("muscle") || primary.includes("mass")) return "build-muscle";
  if (goals.includes("lose-fat") || goals.includes("get-leaner") || primary.includes("lean") || primary.includes("fat")) return "get-leaner";
  return "general-fitness";
}

function deriveExperience(responses: CuratedIntakeResponses): ExperienceLevel {
  const experience = getStringResponse(responses, "trainingExperience");
  if (["brand-new", "under-3-months"].includes(experience)) return "beginner";
  if (experience === "2-plus-years") return "advanced";
  return "intermediate";
}

function parseBoundedIntegerResponse(
  responses: CuratedIntakeResponses,
  questionId: string,
  minimum: number,
  maximum: number,
) {
  const selectedValue = getStringResponse(responses, questionId);
  const responseValue = selectedValue === "other"
    ? getStringResponse(responses, `${questionId}Other`)
    : selectedValue;
  const normalized = responseValue.trim();
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function deriveEquipment(responses: CuratedIntakeResponses): EquipmentAccess[] {
  const selected = new Set<EquipmentAccess>();
  const locations = getArrayResponse(responses, "trainingLocations");
  const equipment = getArrayResponse(responses, "availableEquipment");
  const otherEquipment = [
    locations.includes("other") ? getStringResponse(responses, "trainingLocationsOther") : "",
    equipment.includes("other") ? getStringResponse(responses, "availableEquipmentOther") : "",
  ].join(" ").toLowerCase();

  if (
    locations.some((value) => ["commercial-gym", "planet-fitness", "school-gym", "apartment-gym"].includes(value))
    || /\b(?:commercial gym|planet fitness|school gym|apartment gym|full gym)\b/.test(otherEquipment)
  ) selected.add("full-gym");
  if (
    equipment.some((value) => ["barbells", "bench", "incline-bench", "squat-rack"].includes(value))
    || /\b(?:barbells?|benches?|squat racks?)\b/.test(otherEquipment)
  ) selected.add("barbell");
  if (
    equipment.some((value) => ["dumbbells", "kettlebells"].includes(value))
    || /\b(?:dumbbells?|kettlebells?)\b/.test(otherEquipment)
  ) selected.add("dumbbells");
  if (
    equipment.some((value) => ["smith-machine", "cables", "machines", "treadmill", "bike"].includes(value))
    || /\b(?:smith machines?|cable towers?|cables?|machines?|treadmills?|stationary bikes?|exercise bikes?)\b/.test(otherEquipment)
  ) selected.add("machines");
  if (
    equipment.includes("resistance-bands")
    || /\b(?:resistance bands?|mini bands?|loop bands?)\b/.test(otherEquipment)
  ) selected.add("bands");
  if (
    equipment.includes("bodyweight")
    || locations.includes("outside")
    || /\b(?:body[\s-]?weight|calisthenics|pull[\s-]?up bars?|trx|suspension trainers?)\b/.test(otherEquipment)
  ) selected.add("bodyweight");

  if (selected.size === 0) selected.add("bodyweight");
  return Array.from(selected);
}

function derivePreferredStyle(responses: CuratedIntakeResponses): PreferredStyle {
  const style = getStringResponse(responses, "planStyle");
  if (style === "muscle-focused") return "push-pull-legs";
  if (style === "strength-focused" || style === "more-variety") return "upper-lower";
  if (style === "athletic-focused") return "hybrid";
  return "full-body";
}

function deriveCardioPreference(responses: CuratedIntakeResponses): CardioPreference {
  const style = getStringResponse(responses, "planStyle");
  const goals = getArrayResponse(responses, "mainGoals");
  const areas = getArrayResponse(responses, "areasToImprove");
  return style === "athletic-focused" || goals.includes("athleticism") || areas.includes("conditioning") ? "focus" : "balanced";
}

export function deriveCuratedEngineData(
  responses: CuratedIntakeResponses,
  fallback?: Partial<CuratedOnboardingData>,
): Omit<CuratedOnboardingData, "intakeResponses"> {
  const trainingDays = getStringResponse(responses, "trainingDaysPerWeek");
  const parsedDays = parseBoundedIntegerResponse(responses, "trainingDaysPerWeek", 1, 7);
  const workoutLength = getStringResponse(responses, "workoutLength");
  const sessionLengthByAnswer: Record<string, number> = {
    "20-30": 30,
    "30-45": 45,
    "45-60": 60,
    "60-90": 75,
    "90-plus": 90,
  };
  const parsedSessionLength = workoutLength === "other"
    ? parseBoundedIntegerResponse(responses, "workoutLength", 10, 180)
    : sessionLengthByAnswer[workoutLength] ?? null;
  const exerciseLikes = splitTextList(getStringResponse(responses, "exerciseEnjoy"));
  const exerciseDislikes = splitTextList(
    getStringResponse(responses, "exerciseHate") || getStringResponse(responses, "exercisesCannotDo"),
  );
  const hasGoalResponse = getStringResponse(responses, "primaryGoal").length > 0
    || getArrayResponse(responses, "mainGoals").length > 0;

  return {
    trainingGoal: hasGoalResponse
      ? deriveTrainingGoal(responses)
      : fallback?.trainingGoal ?? null,
    experience: getStringResponse(responses, "trainingExperience") ? deriveExperience(responses) : fallback?.experience ?? null,
    daysPerWeek: trainingDays ? parsedDays : fallback?.daysPerWeek ?? null,
    sessionLengthMinutes: workoutLength ? parsedSessionLength : fallback?.sessionLengthMinutes ?? null,
    equipment: getArrayResponse(responses, "availableEquipment").length > 0 || getArrayResponse(responses, "trainingLocations").length > 0
      ? deriveEquipment(responses)
      : [...(fallback?.equipment ?? [])],
    preferredStyle: getStringResponse(responses, "planStyle") ? derivePreferredStyle(responses) : fallback?.preferredStyle ?? null,
    cardioPreference: getStringResponse(responses, "planStyle") ? deriveCardioPreference(responses) : fallback?.cardioPreference ?? null,
    limitations: [
      getStringResponse(responses, "painDetails"),
      getStringResponse(responses, "medicalConditions"),
      getStringResponse(responses, "medicationConsiderations"),
    ].filter(Boolean).join("\n") || fallback?.limitations || "",
    exerciseLikes: exerciseLikes.length > 0
      ? exerciseLikes
      : [...(fallback?.exerciseLikes ?? [])],
    exerciseDislikes: exerciseDislikes.length > 0
      ? exerciseDislikes
      : [...(fallback?.exerciseDislikes ?? [])],
    targetAreas: getArrayResponse(responses, "areasToImprove").length > 0
      ? getArrayResponse(responses, "areasToImprove")
      : [...(fallback?.targetAreas ?? [])],
  };
}

export function createCuratedParityFixture(variant: "standard" | "limitations"): CuratedIntakeResponses {
  const responses: CuratedIntakeResponses = {};

  for (const question of CURATED_QUESTIONS) {
    if (!question.required) continue;
    if (question.type === "acknowledgment") responses[question.id] = true;
    else if (question.type === "multi") responses[question.id] = [question.options?.[0]?.value ?? "response"];
    else if (question.type === "single") responses[question.id] = question.options?.[0]?.value ?? "response";
    else responses[question.id] = `${question.label} response`;
  }

  responses.email = `curated-${variant}@example.com`;
  responses.name = variant === "standard" ? "Atlas Standard" : "Atlas Limitations";
  responses.contactMethod = "N/A";
  responses.socialUsername = "N/A";
  responses.under18 = "no";

  if (variant === "limitations") {
    responses.hasPainOrLimitations = "yes";
    responses.painDetails = "Avoid painful overhead range";
    responses.warningSymptoms = ["none"];
    responses.medications = "prefer-not-to-say";
    responses.planStyle = "athletic-focused";
    responses.trainingDaysPerWeek = "4";
    responses.workoutLength = "45-60";
  }

  return removeHiddenCuratedResponses(responses);
}
