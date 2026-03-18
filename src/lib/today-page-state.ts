export function getTodayGlobalErrorMessage(args: {
  searchParamError?: string | null;
  hasInProgressSession: boolean;
  fetchFailed: boolean;
}) {
  const error = args.searchParamError?.trim();
  if (!error) return null;
  if (args.fetchFailed) return null;
  if (!args.hasInProgressSession) return null;
  return error;
}
