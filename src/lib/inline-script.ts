const BACKSLASH = String.fromCharCode(0x5c);
// "<" and ">" could close the <script> element or open an HTML comment, "&" matters in XHTML parsing, and
// U+2028/U+2029 end a line in older JS parsers. All are valid as \u escapes inside a JSON string.
const INLINE_SCRIPT_UNSAFE = new RegExp(`[<>&${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, "g");

function toUnicodeEscape(character: string) {
  return `${BACKSLASH}u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
}

/** JSON.stringify for a string that is written into an inline <script> element. */
export function serializeStringForInlineScript(value: string) {
  return JSON.stringify(value).replace(INLINE_SCRIPT_UNSAFE, toUnicodeEscape);
}
