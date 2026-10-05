type AttentionItemDate = {
  date: string;
  severity: number;
};

type ProjectDeadline = {
  id: string;
  status?: string;
  dueDate?: string;
};

export function getActiveProjectDeadlinesThroughWeekEnd<T extends ProjectDeadline>(
  projects: readonly T[],
  weekEndKey: string,
): T[] {
  return projects.filter(
    (project) =>
      ['Planning', 'In progress'].includes(project.status ?? '') &&
      Boolean(project.dueDate) &&
      (project.dueDate ?? '') <= weekEndKey,
  );
}

export function filterAttentionItemsForDay<T extends AttentionItemDate>(
  items: readonly T[],
  dayKey: string,
): T[] {
  return items.filter((item) => item.severity === 0 || !item.date || item.date === dayKey);
}

export function countAttentionItemsByDay(
  items: readonly Pick<AttentionItemDate, 'date'>[],
  dayKeys: readonly string[],
): Record<string, number> {
  const counts = Object.fromEntries(dayKeys.map((dayKey) => [dayKey, 0])) as Record<string, number>;
  const visibleDays = new Set(dayKeys);

  for (const item of items) {
    if (visibleDays.has(item.date)) counts[item.date] += 1;
  }

  return counts;
}
