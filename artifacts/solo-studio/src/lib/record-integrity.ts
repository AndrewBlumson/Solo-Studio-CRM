export type StudioRecord = Record<string, any> & { id: string };

export type ProjectDependentRecords = {
  proposals: StudioRecord[];
  tasks: StudioRecord[];
  timeEntries: StudioRecord[];
  invoices: StudioRecord[];
  expenses: StudioRecord[];
};

export function taskBelongsToProject(
  taskId: string | undefined,
  projectId: string | undefined,
  tasks: StudioRecord[],
) {
  if (!taskId) return true;
  return Boolean(projectId && tasks.some((task) => task.id === taskId && task.projectId === projectId));
}

export function projectDateValidationMessage(startDate: string, dueDate: string) {
  if (startDate && dueDate && dueDate < startDate) {
    return 'The due date must be on or after the start date.';
  }
  return '';
}

export function findConvertedProject(proposal: StudioRecord, projects: StudioRecord[]) {
  if (proposal.linkedProjectId) {
    const byProposalLink = projects.find((project) => project.id === proposal.linkedProjectId);
    if (byProposalLink) return byProposalLink;
  }

  const bySourceLink = projects.find((project) => project.sourceProposalId === proposal.id);
  if (bySourceLink) return bySourceLink;

  const legacyMatches = projects.filter(
    (project) =>
      proposal.clientId &&
      project.title === proposal.title &&
      project.clientId === proposal.clientId &&
      Number(project.budgetPence || 0) === Number(proposal.amountPence || 0) &&
      String(project.description || '') === String(proposal.notes || ''),
  );
  return legacyMatches.length === 1 ? legacyMatches[0] : undefined;
}

export function getProjectDependentRecords(
  projectId: string,
  workspace: {
    proposals: StudioRecord[];
    tasks: StudioRecord[];
    timeEntries: StudioRecord[];
    invoices: StudioRecord[];
    expenses: StudioRecord[];
    projects: StudioRecord[];
  },
) {
  const project = workspace.projects.find((record) => record.id === projectId);
  const dependents: ProjectDependentRecords = {
    proposals: workspace.proposals.filter(
      (record) => record.linkedProjectId === projectId || record.id === project?.sourceProposalId,
    ),
    tasks: workspace.tasks.filter((record) => record.projectId === projectId),
    timeEntries: workspace.timeEntries.filter((record) => record.projectId === projectId),
    invoices: workspace.invoices.filter((record) => record.projectId === projectId),
    expenses: workspace.expenses.filter((record) => record.projectId === projectId),
  };
  return dependents;
}

export function paidDateForStatus(status: string, currentPaidDate: string, today: string) {
  return status === 'Paid' ? currentPaidDate || today : '';
}
