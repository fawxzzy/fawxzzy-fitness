export type BestEffortStep = readonly [label: string, run: () => unknown | Promise<unknown>];

export type BestEffortLogger = (message: string, details: Record<string, unknown>) => void;

const defaultLogger: BestEffortLogger = (message, details) => {
  console.warn(message, details);
};

/**
 * Runs follow-up work (telemetry, integration publishes) that must never undo or mask a mutation that already
 * succeeded. Every step is attempted even when an earlier one throws; failures are logged and returned by label,
 * never rethrown. Today's discard uses this after the workout rows are deleted: a throwing signal publish used to
 * surface "Could not discard the workout" for a workout that was already gone.
 */
export async function runBestEffortSteps(
  context: string,
  steps: ReadonlyArray<BestEffortStep>,
  log: BestEffortLogger = defaultLogger,
): Promise<string[]> {
  const failed: string[] = [];
  for (const [label, run] of steps) {
    try {
      await run();
    } catch (error) {
      failed.push(label);
      try {
        log(`[${context}] best-effort step failed`, {
          step: label,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // A broken logger must not turn a finished mutation into a failure either.
      }
    }
  }
  return failed;
}
