type QueryError = { message?: string } | null;

type QueryResult<T> = {
  data: T[] | null;
  error: QueryError;
};

export async function loadSessionExercisesWithSchemaFallback<T>(args: {
  runSelect: (select: string) => Promise<QueryResult<T>>;
  selects: {
    rich: string;
    effort: string;
    timer: string;
    legacy: string;
  };
  isMissingEffortColumnError: (error: QueryError) => boolean;
  isMissingTimerColumnError: (error: QueryError) => boolean;
}) {
  let result = await args.runSelect(args.selects.rich);

  if (result.error && args.isMissingTimerColumnError(result.error)) {
    result = await args.runSelect(args.selects.effort);
    if (result.error && args.isMissingEffortColumnError(result.error)) {
      result = await args.runSelect(args.selects.legacy);
    }
  } else if (result.error && args.isMissingEffortColumnError(result.error)) {
    result = await args.runSelect(args.selects.timer);
    if (result.error && args.isMissingTimerColumnError(result.error)) {
      result = await args.runSelect(args.selects.legacy);
    }
  }

  return result;
}
