import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countAttentionItemsByDay,
  filterAttentionItemsForDay,
  getActiveProjectDeadlinesThroughWeekEnd,
} from './week-agenda.ts';

test('includes active project deadlines due by Sunday but excludes paused or finished projects', () => {
  const projects = [
    { id: 'planning', status: 'Planning', dueDate: '2026-10-05' },
    { id: 'in-progress', status: 'In progress', dueDate: '2026-10-11' },
    { id: 'overdue-active', status: 'In progress', dueDate: '2026-10-02' },
    { id: 'later', status: 'In progress', dueDate: '2026-10-12' },
    { id: 'on-hold', status: 'On hold', dueDate: '2026-10-07' },
    { id: 'completed', status: 'Completed', dueDate: '2026-10-04' },
    { id: 'archived', status: 'Archived', dueDate: '2026-10-07' },
    { id: 'undated', status: 'In progress', dueDate: '' },
  ];

  const dueThisWeek = getActiveProjectDeadlinesThroughWeekEnd(projects, '2026-10-11');

  assert.deepEqual(
    dueThisWeek.map((project) => project.id),
    ['planning', 'in-progress', 'overdue-active'],
  );
});

test('filters to the selected day while keeping overdue and undated items visible', () => {
  const items = [
    { id: 'today', date: '2026-10-05', severity: 1 },
    { id: 'tomorrow', date: '2026-10-06', severity: 2 },
    { id: 'overdue', date: '2026-10-02', severity: 0 },
    { id: 'missing-date', date: '', severity: 1 },
  ];

  const visible = filterAttentionItemsForDay(items, '2026-10-05');

  assert.deepEqual(visible.map((item) => item.id), ['today', 'overdue', 'missing-date']);
});

test('counts due items only for dates in the current week', () => {
  const counts = countAttentionItemsByDay(
    [
      { date: '2026-10-05' },
      { date: '2026-10-05' },
      { date: '2026-10-07' },
      { date: '' },
      { date: '2026-10-12' },
    ],
    ['2026-10-05', '2026-10-06', '2026-10-07'],
  );

  assert.deepEqual(counts, {
    '2026-10-05': 2,
    '2026-10-06': 0,
    '2026-10-07': 1,
  });
});
