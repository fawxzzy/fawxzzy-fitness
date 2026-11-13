/**
 * Test-only. The safety answers a generation attempt must carry: the engine fails closed on a missing,
 * empty or wrong-typed `warningSymptoms`, a missing `safetyAcknowledgment`, or a missing `under18`.
 */
export const CLEAR_SAFETY_RESPONSES = {
  warningSymptoms: ["none"],
  safetyAcknowledgment: true,
  under18: "no",
} as const;

export function clearSafetyResponses(overrides: Record<string, string | string[] | boolean | undefined> = {}) {
  const responses: Record<string, string | string[] | boolean> = {
    warningSymptoms: [...CLEAR_SAFETY_RESPONSES.warningSymptoms],
    safetyAcknowledgment: CLEAR_SAFETY_RESPONSES.safetyAcknowledgment,
    under18: CLEAR_SAFETY_RESPONSES.under18,
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete responses[key];
    else responses[key] = value;
  }
  return responses;
}
