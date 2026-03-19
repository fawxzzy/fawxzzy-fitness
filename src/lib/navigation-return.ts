export function isSafeAppPath(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function resolveReturnHref(rawReturnTo: string | null | undefined, fallbackHref: string): string {
  return isSafeAppPath(rawReturnTo) ? rawReturnTo : fallbackHref;
}

export function resolvePreferredReturnHref(options: {
  requestedReturnTo?: string | null;
  currentPath: string;
  stack: string[];
  fallbackHref?: string;
}) {
  const requestedReturnTo = isSafeAppPath(options.requestedReturnTo) ? options.requestedReturnTo : null;
  if (requestedReturnTo && requestedReturnTo !== options.currentPath) {
    return requestedReturnTo;
  }

  return getSafeReturnContract(options.currentPath, options.stack, options.fallbackHref).returnHref;
}

export function getSafeReturnContract(currentPath: string, stack: string[], fallbackHref?: string) {
  const isCurrentStackTail = stack[stack.length - 1] === currentPath;
  const previousEntry = isCurrentStackTail ? stack[stack.length - 2] : null;
  const historyHref = isSafeAppPath(previousEntry) ? previousEntry : null;
  const fallbackReturnHref = isSafeAppPath(fallbackHref) ? fallbackHref : null;

  return {
    historyHref,
    fallbackReturnHref,
    returnHref: historyHref ?? fallbackReturnHref,
    useHistoryBack: Boolean(historyHref),
  };
}
