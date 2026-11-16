// Style-preserving writer for config/fitness-owner-work-registry.json.
// The registry is hand-maintained in a compact style (one work item per block, inline arrays, one allowlist id per line),
// so re-serializing it with JSON.stringify would rewrite ~1,000 lines. Instead the fold patches only what it changed:
// the touched work item blocks, appended new items, the allowlist, the top-level updatedAt and provenance.boardSync.
// Every patch is verified: the patched text must parse to exactly the folded registry, or the writer throws.
import { canonicalJson } from "./board-events.mjs";

const J = JSON.stringify;
const toLf = (text) => text.replace(/\r\n/g, "\n");

/** One work item rendered in the registry's own style. All existing items round-trip through this byte for byte (see tests). */
export function renderItem(item) {
  const { card, ...rest } = item;
  const head = Object.entries(rest).map(([k, v]) => `${J(k)}: ${J(v)}`).join(", ");
  if (!card) return `    { ${head} }`;
  const lines = Object.entries(card).map(([k, v]) => `        ${J(k)}: ${J(v)}`).join(",\n");
  return `    { ${head},\n      "card": {\n${lines}\n      }\n    }`;
}

export function renderAllowlist(ids) {
  return `  "acceptedPublicCardIds": [\n${ids.map((id) => `    ${J(id)}`).join(",\n")}\n  ]`;
}

const once = (text, needle, label) => {
  const at = text.indexOf(needle);
  if (at < 0 || text.indexOf(needle, at + 1) >= 0) throw new Error(`registry text patch: ${label} not found exactly once; the registry is not in the expected hand-written style`);
  return at;
};
const replaceOnce = (text, from, to, label) => { const at = once(text, from, label); return `${text.slice(0, at)}${to}${text.slice(at + from.length)}`; };

/** @returns {string} patched registry text in the EOL style of `raw` */
export function patchRegistryText(raw, before, after) {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  let text = toLf(raw);
  const beforeById = new Map(before.workItems.map((item) => [item.id, item]));
  const added = [];
  for (const item of after.workItems) {
    const old = beforeById.get(item.id);
    if (!old) { added.push(item); continue; }
    if (canonicalJson(old) !== canonicalJson(item)) text = replaceOnce(text, renderItem(old), renderItem(item), `work item ${item.id}`);
  }
  if (added.length) {
    // Anchor on the last item as it stands in `text` now: the loop above may already have re-rendered it.
    const lastBefore = before.workItems.at(-1);
    const last = renderItem(after.workItems.find((item) => item.id === lastBefore.id) ?? lastBefore);
    text = replaceOnce(text, `${last}\n  ]\n}`, `${last},\n${added.map(renderItem).join(",\n")}\n  ]\n}`, "end of workItems");
  }
  if (canonicalJson(before.acceptedPublicCardIds) !== canonicalJson(after.acceptedPublicCardIds)) text = replaceOnce(text, renderAllowlist(before.acceptedPublicCardIds), renderAllowlist(after.acceptedPublicCardIds), "acceptedPublicCardIds");
  if (before.updatedAt !== after.updatedAt) text = replaceOnce(text, `\n  "updatedAt": ${J(before.updatedAt)},\n`, `\n  "updatedAt": ${J(after.updatedAt)},\n`, "updatedAt");
  const sync = after.provenance?.boardSync;
  if (sync && canonicalJson(before.provenance?.boardSync) !== canonicalJson(sync)) {
    const line = `    "boardSync": { "at": ${J(sync.at)}, "appliedEventCount": ${J(sync.appliedEventCount)}, "lastEventId": ${J(sync.lastEventId)} }`;
    if (before.provenance?.boardSync) {
      const old = text.match(/\n {4}"boardSync": \{[^\n]*\}(?=,?\n)/);
      if (!old) throw new Error("registry text patch: existing provenance.boardSync line not found");
      text = text.replace(old[0], `\n${line}`);
    } else text = replaceOnce(text, `\n  },\n  "acceptedPublicCardIds": [`, `,\n${line}\n  },\n  "acceptedPublicCardIds": [`, "end of provenance");
  }
  const out = eol === "\n" ? text : text.replace(/\n/g, "\r\n");
  let parsed;
  try { parsed = JSON.parse(out); } catch (error) { throw new Error(`registry text patch produced invalid JSON: ${error.message}`); }
  if (canonicalJson(parsed) !== canonicalJson(after)) throw new Error("registry text patch does not match the folded registry; refusing to write");
  return out;
}
