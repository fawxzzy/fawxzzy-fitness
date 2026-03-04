import { readFileSync, writeFileSync } from 'node:fs';

const DRAFTS_HEADER = '## DRAFTS (auto)';

function ensureTrailingNewline(content) {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function findDraftsSectionBounds(content) {
  const headerIndex = content.indexOf(DRAFTS_HEADER);
  if (headerIndex === -1) {
    return null;
  }

  const sectionStart = content.indexOf('\n', headerIndex);
  if (sectionStart === -1) {
    return { start: content.length, end: content.length };
  }

  const nextHeaderMatch = /^##\s+/gm;
  nextHeaderMatch.lastIndex = sectionStart + 1;
  const nextHeader = nextHeaderMatch.exec(content);
  const sectionEnd = nextHeader ? nextHeader.index : content.length;

  return { start: sectionStart + 1, end: sectionEnd };
}

function ensureDraftsSection(content) {
  const found = findDraftsSectionBounds(content);
  if (found) {
    return { content, ...found };
  }

  const normalized = ensureTrailingNewline(content);
  const appended = `${normalized}\n${DRAFTS_HEADER}\n\n`;
  const bounds = findDraftsSectionBounds(appended);
  return { content: appended, ...bounds };
}

function hasDraftId(content, id) {
  return content.includes(`<!-- PLAYBOOK_DRAFT_ID:${id} -->`);
}

export function appendDraftsToNotes(notesPath, drafts) {
  const original = readFileSync(notesPath, 'utf8');
  const { content: withSection, start, end } = ensureDraftsSection(original);

  const newDrafts = drafts.filter((draft) => !hasDraftId(withSection, draft.id));
  if (newDrafts.length === 0) {
    return { added: [] };
  }

  const draftBlock = `${newDrafts.map((draft) => draft.body.trimEnd()).join('\n\n')}\n\n`;
  const updated = `${withSection.slice(0, start)}${draftBlock}${withSection.slice(start, end)}${withSection.slice(end)}`;

  writeFileSync(notesPath, updated, 'utf8');

  return { added: newDrafts };
}

export function formatDraftEntry({ id, date, title, type, summary, suggestedPlaybookFile, rationale, evidence }) {
  return [
    `<!-- PLAYBOOK_DRAFT_ID:${id} -->`,
    `## ${date} — ${title}`,
    `- Type: ${type}`,
    `- Summary: ${summary}`,
    `- Suggested Playbook File: ${suggestedPlaybookFile}`,
    `- Rationale: ${rationale}`,
    `- Evidence: ${evidence.join(', ')}`,
    '- Status: Proposed',
  ].join('\n');
}
