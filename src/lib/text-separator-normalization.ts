export function normalizeDecoratedText(value: string) {
  return String(value)
    .replaceAll("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢", "\u2022")
    .replaceAll("Ã¢â‚¬Â¢", "\u2022")
    .replaceAll("â€¢", "\u2022")
    .replaceAll("Ã‚Â·", "\u2022")
    .replaceAll("Ã¢â‚¬â€œ", "\u2013")
    .replaceAll("Ã¢â€ â€™", "\u2192")
    .replaceAll("â†’", "\u2192")
    .trim();
}
