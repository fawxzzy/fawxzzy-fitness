const DEFAULT_MARGIN_PX = 12;

export function scrollDockAwareIntoView(
  scrollContainer: HTMLElement,
  target: HTMLElement,
  marginPx = DEFAULT_MARGIN_PX,
) {
  const scrollRect = scrollContainer.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const visibleTop = scrollRect.top + marginPx;
  const visibleBottom = scrollRect.bottom - marginPx;

  if (targetRect.top < visibleTop) {
    scrollContainer.scrollTop += targetRect.top - visibleTop;
    return;
  }

  if (targetRect.bottom > visibleBottom) {
    scrollContainer.scrollTop += targetRect.bottom - visibleBottom;
  }
}
