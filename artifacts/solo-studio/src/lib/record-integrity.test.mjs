import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findConvertedProject,
  getProjectDependentRecords,
  paidDateForStatus,
  projectDateValidationMessage,
  taskBelongsToProject,
} from './record-integrity.ts';

test('a time entry task must belong to the selected project', () => {
  const tasks = [
    { id: 'task-a', projectId: 'project-a' },
    { id: 'task-b', projectId: 'project-b' },
  ];

  assert.equal(taskBelongsToProject('task-a', 'project-a', tasks), true);
  assert.equal(taskBelongsToProject('task-b', 'project-a', tasks), false);
  assert.equal(taskBelongsToProject('', 'project-a', tasks), true);
});

test('project due dates cannot precede their start dates', () => {
  assert.equal(projectDateValidationMessage('2026-10-05', '2026-10-04'), 'The due date must be on or after the start date.');
  assert.equal(projectDateValidationMessage('2026-10-05', '2026-10-05'), '');
  assert.equal(projectDateValidationMessage('2026-10-05', ''), '');
});

test('proposal conversion finds an existing linked or uniquely matching legacy project', () => {
  const proposal = {
    id: 'proposal-a',
    title: 'Brand refresh',
    clientId: 'client-a',
    amountPence: 25025,
    notes: 'A careful refresh.',
  };
  const project = {
    id: 'project-a',
    title: proposal.title,
    clientId: proposal.clientId,
    budgetPence: proposal.amountPence,
    description: proposal.notes,
  };

  assert.equal(findConvertedProject({ ...proposal, linkedProjectId: 'project-a' }, [project]), project);
  assert.equal(findConvertedProject(proposal, [project]), project);
  assert.equal(findConvertedProject(proposal, [project, { ...project, id: 'project-b' }]), undefined);
});

test('project dependency counts include records that must remain linked', () => {
  const dependencies = getProjectDependentRecords('project-a', {
    proposals: [{ id: 'proposal-a' }, { id: 'proposal-b', linkedProjectId: 'project-a' }],
    tasks: [{ id: 'task-a', projectId: 'project-a' }, { id: 'task-b', projectId: 'project-b' }],
    timeEntries: [{ id: 'time-a', projectId: 'project-a' }],
    invoices: [{ id: 'invoice-a', projectId: 'project-a' }],
    expenses: [{ id: 'expense-a', projectId: 'project-a' }],
    projects: [{ id: 'project-a', sourceProposalId: 'proposal-a' }],
  });

  assert.deepEqual(
    Object.fromEntries(Object.entries(dependencies).map(([kind, records]) => [kind, records.length])),
    { proposals: 2, tasks: 1, timeEntries: 1, invoices: 1, expenses: 1 },
  );
});

test('only Paid invoices receive a paid date', () => {
  assert.equal(paidDateForStatus('Draft', '2026-10-05', '2026-10-06'), '');
  assert.equal(paidDateForStatus('Paid', '', '2026-10-06'), '2026-10-06');
  assert.equal(paidDateForStatus('Paid', '2026-10-04', '2026-10-06'), '2026-10-04');
});
