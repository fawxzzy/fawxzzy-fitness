export function resolveDayHeaderSummary(args: { isRestDay: boolean; exerciseSummaryLabel: string }): string | undefined {
  return args.isRestDay ? undefined : args.exerciseSummaryLabel;
}
