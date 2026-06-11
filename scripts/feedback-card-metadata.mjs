export const FEEDBACK_CARD_ID_MAX_LENGTH = 40;
export const FEEDBACK_CARD_PHASE_MAX_LENGTH = 80;
export const FEEDBACK_CARD_PRIORITY_VALUES = ["P0", "P1", "P2", "P3"];
export const FEEDBACK_CARD_DEPENDENCY_NOTE_MAX_LENGTH = 240;
export const FEEDBACK_CARD_DEPENDENCY_REF_MAX_LENGTH = 160;

function sanitizeText(value, maxLength) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function toTitleKey(value) {
  return sanitizeText(value, FEEDBACK_CARD_DEPENDENCY_REF_MAX_LENGTH)?.toLowerCase() ?? "";
}

function shortRecordId(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.split("-")[0]?.slice(0, 8) ?? normalized.slice(0, 8) : "unknown";
}

function recordLabel(record, { getRecordId, getCardId, getShortId, getTitle }) {
  const cardId = getCardId(record);
  if (cardId) {
    return cardId;
  }

  const shortId = getShortId(record);
  const title = getTitle(record);
  if (shortId && title) {
    return `${shortId} (${title})`;
  }

  return shortId || title || getRecordId(record);
}

function dependencyLabel(record, { getCardId, getTitle, getShortId }) {
  return getCardId(record) || getTitle(record) || getShortId(record) || "unknown-card";
}

export function normalizeFeedbackCardId(value) {
  const normalized = sanitizeText(value, FEEDBACK_CARD_ID_MAX_LENGTH);
  if (!normalized) {
    return null;
  }

  const compact = normalized
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  return /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(compact) ? compact : null;
}

export function normalizeFeedbackCardPhase(value) {
  return sanitizeText(value, FEEDBACK_CARD_PHASE_MAX_LENGTH);
}

export function normalizeFeedbackCardPriority(value) {
  const normalized = sanitizeText(value, 8)?.toUpperCase() ?? "";
  return FEEDBACK_CARD_PRIORITY_VALUES.includes(normalized) ? normalized : null;
}

export function normalizeFeedbackDependencyNote(value) {
  return sanitizeText(value, FEEDBACK_CARD_DEPENDENCY_NOTE_MAX_LENGTH);
}

export function normalizeFeedbackDependencyReferences(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/)
      : [];

  const references = [];
  const seen = new Set();

  for (const entry of source) {
    const normalized = sanitizeText(entry, FEEDBACK_CARD_DEPENDENCY_REF_MAX_LENGTH);
    if (!normalized) {
      continue;
    }

    const cardId = normalizeFeedbackCardId(normalized);
    const canonical = cardId ?? normalized;
    const key = cardId ? `id:${cardId}` : `title:${canonical.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    references.push(canonical);
  }

  return references;
}

export function applyResolvedFeedbackCardDependencies(records, options = {}) {
  const getRecordId = options.getRecordId ?? ((record) => record.id);
  const getShortId = options.getShortId ?? ((record) => record.short_id ?? record.shortId ?? shortRecordId(record.id));
  const getCardId = options.getCardId ?? ((record) => normalizeFeedbackCardId(record.card_id ?? record.cardId));
  const getTitle = options.getTitle ?? ((record) => sanitizeText(record.title ?? record.summary, 200));
  const getDependsOn = options.getDependsOn ?? ((record) => normalizeFeedbackDependencyReferences(record.depends_on ?? record.dependsOn));
  const setResolved = options.setResolved ?? ((record, resolved) => ({
    ...record,
    depends_on: resolved.dependsOn,
    blocks: resolved.blocks,
  }));

  const byRecordId = new Map();
  const byCardId = new Map();
  const byTitle = new Map();
  const ambiguousTitles = new Set();

  for (const record of records) {
    const recordId = getRecordId(record);
    byRecordId.set(recordId, record);

    const cardId = getCardId(record);
    if (cardId) {
      if (byCardId.has(cardId)) {
        throw new Error(`Duplicate feedback card_id "${cardId}" found on ${recordLabel(record, {
          getRecordId,
          getCardId,
          getShortId,
          getTitle,
        })}.`);
      }

      byCardId.set(cardId, record);
    }

    const titleKey = toTitleKey(getTitle(record));
    if (!titleKey) {
      continue;
    }

    if (byTitle.has(titleKey)) {
      ambiguousTitles.add(titleKey);
      continue;
    }

    byTitle.set(titleKey, record);
  }

  const edges = new Map();
  const resolvedTargets = new Map();

  for (const record of records) {
    const recordId = getRecordId(record);
    const dependencies = getDependsOn(record) ?? [];
    const targets = [];
    const seenTargetIds = new Set();

    for (const dependency of dependencies) {
      const normalizedCardId = normalizeFeedbackCardId(dependency);
      let target = normalizedCardId ? byCardId.get(normalizedCardId) ?? null : null;

      if (!target) {
        const titleKey = toTitleKey(dependency);
        if (titleKey && ambiguousTitles.has(titleKey)) {
          throw new Error(
            `Feedback dependency error for ${recordLabel(record, {
              getRecordId,
              getCardId,
              getShortId,
              getTitle,
            })}: dependency "${dependency}" matches multiple card titles. Add explicit card_id metadata.`,
          );
        }

        target = titleKey ? byTitle.get(titleKey) ?? null : null;
      }

      if (!target) {
        throw new Error(
          `Feedback dependency error for ${recordLabel(record, {
            getRecordId,
            getCardId,
            getShortId,
            getTitle,
          })}: unresolved dependency "${dependency}". Add a matching card_id or exact title to the current board export.`,
        );
      }

      const targetId = getRecordId(target);
      if (targetId === recordId) {
        throw new Error(
          `Feedback dependency error for ${recordLabel(record, {
            getRecordId,
            getCardId,
            getShortId,
            getTitle,
          })}: a card cannot depend on itself.`,
        );
      }

      if (seenTargetIds.has(targetId)) {
        continue;
      }

      seenTargetIds.add(targetId);
      targets.push(target);
    }

    edges.set(recordId, targets.map((target) => getRecordId(target)));
    resolvedTargets.set(recordId, targets);
  }

  const visiting = [];
  const visitingSet = new Set();
  const visited = new Set();

  function visit(recordId) {
    if (visited.has(recordId)) {
      return;
    }

    if (visitingSet.has(recordId)) {
      const cycleStart = visiting.indexOf(recordId);
      const cycleIds = [...visiting.slice(cycleStart), recordId];
      const cycleLabels = cycleIds.map((id) => recordLabel(byRecordId.get(id), {
        getRecordId,
        getCardId,
        getShortId,
        getTitle,
      }));
      throw new Error(`Feedback dependency cycle detected: ${cycleLabels.join(" -> ")}`);
    }

    visiting.push(recordId);
    visitingSet.add(recordId);
    for (const targetId of edges.get(recordId) ?? []) {
      visit(targetId);
    }
    visiting.pop();
    visitingSet.delete(recordId);
    visited.add(recordId);
  }

  for (const record of records) {
    visit(getRecordId(record));
  }

  const reverseEdges = new Map();
  for (const record of records) {
    reverseEdges.set(getRecordId(record), []);
  }
  for (const [recordId, targetIds] of edges.entries()) {
    for (const targetId of targetIds) {
      reverseEdges.get(targetId)?.push(byRecordId.get(recordId));
    }
  }

  return records.map((record) => {
    const recordId = getRecordId(record);
    const dependsOn = (resolvedTargets.get(recordId) ?? []).map((target) => dependencyLabel(target, {
      getCardId,
      getTitle,
      getShortId,
    }));
    const blocks = (reverseEdges.get(recordId) ?? []).map((target) => dependencyLabel(target, {
      getCardId,
      getTitle,
      getShortId,
    }));

    return setResolved(record, {
      dependsOn,
      blocks,
    });
  });
}
