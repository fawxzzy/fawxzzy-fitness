import path from 'node:path';

export const DEFAULT_PLAYBOOK_DESTINATION = 'docs/INBOX/from-fawxzzyfitness.md';

const ENTRY_HEADER_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s+—\s+(.+)$/;
const FIELD_RE = /^-\s+([^:]+):\s*(.*)$/;

export function deriveStableId(date, title) {
  return `${date}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function parseEvidence(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePlaybookNotes(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const headerMatch = line.match(ENTRY_HEADER_RE);

    if (headerMatch) {
      if (current) entries.push(current);
      current = {
        date: headerMatch[1],
        title: headerMatch[2].trim(),
        startLine: index,
        endLine: index,
        fields: {},
        fieldLineIndexes: {},
      };
      continue;
    }

    if (!current) continue;

    const fieldMatch = line.match(FIELD_RE);
    if (fieldMatch) {
      const key = fieldMatch[1].trim();
      const value = fieldMatch[2].trim();
      current.fields[key] = value;
      current.fieldLineIndexes[key] = index;
    }
    current.endLine = index;
  }

  if (current) entries.push(current);
  return { lines, entries };
}

export function resolvePlaybookDestination(suggestedValue) {
  if (!suggestedValue) {
    return DEFAULT_PLAYBOOK_DESTINATION;
  }

  const trimmed = suggestedValue.trim();
  if (!trimmed) return DEFAULT_PLAYBOOK_DESTINATION;

  const withoutPlaybookPrefix = trimmed.startsWith('Playbook/')
    ? trimmed.slice('Playbook/'.length)
    : trimmed;

  if (path.isAbsolute(withoutPlaybookPrefix)) {
    return DEFAULT_PLAYBOOK_DESTINATION;
  }

  const normalized = path.posix.normalize(withoutPlaybookPrefix.replace(/\\/g, '/'));
  if (!normalized || normalized === '.' || normalized.startsWith('..')) {
    return DEFAULT_PLAYBOOK_DESTINATION;
  }

  return normalized;
}

export function makePlaybookSection(entry) {
  const type = entry.fields.Type || 'Pattern';
  const summary = entry.fields.Summary || 'TODO';
  const rationale = entry.fields.Rationale || 'TODO';
  const evidence = parseEvidence(entry.fields.Evidence || '');

  const evidenceLines = evidence.length > 0 ? evidence.map((item) => `- ${item}`) : ['- TODO'];

  return [
    `### ${entry.title} (from FawxzzyFitness notes, ${entry.date})`,
    `Type: ${type}`,
    `Summary: ${summary}`,
    `Rationale: ${rationale}`,
    'Evidence (FawxzzyFitness):',
    ...evidenceLines,
    '',
  ].join('\n');
}

export function upsertMarkedSection(content, marker, sectionBody) {
  const markerLine = `<!-- PLAYBOOK_NOTE_ID:${marker} -->`;
  const sectionBlock = `${markerLine}\n${sectionBody.trimEnd()}\n`;

  if (!content.includes(markerLine)) {
    const prefix = content.length > 0 && !content.endsWith('\n') ? `${content}\n` : content;
    const separator = prefix.length > 0 ? '\n' : '';
    return `${prefix}${separator}${sectionBlock}`;
  }

  const lines = content.split(/\r?\n/);
  const markerIndex = lines.findIndex((line) => line.trim() === markerLine);
  if (markerIndex < 0) return content;

  let nextMarkerIndex = lines.length;
  for (let i = markerIndex + 1; i < lines.length; i += 1) {
    if (/^<!--\s*PLAYBOOK_NOTE_ID:/.test(lines[i].trim())) {
      nextMarkerIndex = i;
      break;
    }
  }

  const before = lines.slice(0, markerIndex).join('\n').replace(/\s*$/, '');
  const after = lines.slice(nextMarkerIndex).join('\n').replace(/^\s*/, '');

  if (before && after) {
    return `${before}\n\n${sectionBlock}\n${after}`;
  }
  if (before) {
    return `${before}\n\n${sectionBlock}`;
  }
  if (after) {
    return `${sectionBlock}\n${after}`;
  }
  return `${sectionBlock}`;
}
