import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkspaceExport, parseWorkspaceImport } from './workspace-export.ts';

const currentWorkspace = {
  leads: [],
  clients: [],
  proposals: [],
  projects: [],
  tasks: [],
  invoices: [],
  expenses: [],
  timeEntries: [],
  settings: {
    businessName: 'Fieldnotes Studio',
    defaultHourlyRatePence: 6500,
    designTheme: 'evergreen',
  },
};

test('accepts new backups without removed optional content collections', () => {
  const backup = buildWorkspaceExport(currentWorkspace, '2026-10-05T00:00:00.000Z');

  assert.deepEqual(parseWorkspaceImport(backup).data, currentWorkspace);
});

test('preserves existing case studies and social drafts in backups', () => {
  const legacyWorkspace = {
    ...currentWorkspace,
    caseStudies: [{ id: 'case-1', title: 'A completed project' }],
    launchDrafts: [{ id: 'draft-1', channel: 'LinkedIn', content: 'Draft text' }],
  };
  const backup = buildWorkspaceExport(legacyWorkspace, '2026-10-05T00:00:00.000Z');

  assert.deepEqual(parseWorkspaceImport(backup).data, legacyWorkspace);
});
