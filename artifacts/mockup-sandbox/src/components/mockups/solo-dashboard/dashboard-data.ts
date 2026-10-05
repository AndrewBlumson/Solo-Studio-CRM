export type DemoEntity =
  | "leads"
  | "clients"
  | "proposals"
  | "projects"
  | "tasks"
  | "invoices"
  | "expenses"
  | "timeEntries";

export type DemoRecord = Record<string, string | number | boolean> & { id: string };

function keyFor(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftedDate(amount: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + amount);
  return keyFor(date);
}

export const today = new Date();
today.setHours(0, 0, 0, 0);
export const todayKey = keyFor(today);
export const monthPrefix = todayKey.slice(0, 7);

const monday = new Date(today);
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

export const weekDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(monday);
  date.setDate(monday.getDate() + index);
  return date;
});
export const weekDayKeys = weekDays.map(keyFor);
export const weekEndKey = weekDayKeys[6];

export const demoStore = {
  leads: [
    { id: "lead-olive", name: "Sophie Bennett", company: "Olive & Row", stage: "Proposal sent", valuePence: 480000, nextActionDate: shiftedDate(1) },
    { id: "lead-fable", name: "Tom Edwards", company: "Fable Press", stage: "Qualified", valuePence: 265000, nextActionDate: shiftedDate(2) },
    { id: "lead-morrow", name: "Amira Shah", company: "Morrow Studio", stage: "New", valuePence: 190000, nextActionDate: shiftedDate(4) },
    { id: "lead-common", name: "Jamie Clarke", company: "Common Ground", stage: "Won", valuePence: 320000, nextActionDate: shiftedDate(-1) },
  ],
  clients: [
    { id: "client-north", name: "Eleanor Price", company: "North & Kind" },
    { id: "client-common", name: "Jamie Clarke", company: "Common Ground" },
  ],
  proposals: [
    { id: "prop-olive", title: "Olive & Row, digital shop", leadId: "lead-olive", clientId: "", status: "Sent", amountPence: 480000, validUntil: shiftedDate(14) },
    { id: "prop-common", title: "Common Ground, identity", leadId: "lead-common", clientId: "client-common", status: "Accepted", amountPence: 320000, validUntil: shiftedDate(10) },
  ],
  projects: [
    { id: "project-north", title: "North & Kind, seasonal story", clientId: "client-north", description: "A bright, flexible campaign landing page for the new collection.", status: "In progress", startDate: shiftedDate(-3), dueDate: shiftedDate(12), budgetPence: 265000 },
    { id: "project-common", title: "Common Ground, identity system", clientId: "client-common", description: "An identity built around the good work happening locally.", status: "Completed", startDate: shiftedDate(-18), dueDate: shiftedDate(-2), budgetPence: 320000 },
  ],
  tasks: [
    { id: "task-01", projectId: "project-north", title: "Share first page direction", dueDate: shiftedDate(1), priority: "High", completed: false },
    { id: "task-02", projectId: "project-north", title: "Prepare mobile prototype", dueDate: shiftedDate(3), priority: "Medium", completed: false },
    { id: "task-03", projectId: "project-common", title: "Package final logo files", dueDate: shiftedDate(-2), priority: "Low", completed: true },
  ],
  invoices: [
    { id: "invoice-01", number: "SS-104", clientId: "client-north", projectId: "project-north", amountPence: 132500, issuedDate: shiftedDate(-10), dueDate: shiftedDate(4), status: "Sent", paidDate: "" },
    { id: "invoice-02", number: "SS-103", clientId: "client-common", projectId: "project-common", amountPence: 160000, issuedDate: shiftedDate(-17), dueDate: shiftedDate(-4), status: "Paid", paidDate: shiftedDate(-6) },
  ],
  expenses: [
    { id: "expense-01", title: "Type Foundry licence", category: "Software", amountPence: 4800, date: shiftedDate(-2), projectId: "project-common" },
    { id: "expense-02", title: "Client workshop train", category: "Travel", amountPence: 3260, date: shiftedDate(-1), projectId: "project-north" },
  ],
  timeEntries: [
    { id: "time-01", projectId: "project-north", taskId: "task-01", date: todayKey, durationMinutes: 105, notes: "First round of visual references" },
    { id: "time-02", projectId: "project-common", taskId: "task-03", date: shiftedDate(-2), durationMinutes: 75, notes: "Final file handover" },
  ],
};

export function demoMoney(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format((Number(pence) || 0) / 100);
}

export function demoDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB").format(date);
}

export function demoClientName(clientId: string) {
  return demoStore.clients.find((client) => client.id === clientId)?.company ?? "—";
}

export function demoProjectName(projectId: string) {
  return demoStore.projects.find((project) => project.id === projectId)?.title ?? "—";
}

export function demoLeadName(leadId: string) {
  return demoStore.leads.find((lead) => lead.id === leadId)?.company ?? "—";
}

export type DemoAttentionItem = {
  id: string;
  entity: DemoEntity;
  record: DemoRecord;
  category: string;
  title: string;
  context: string;
  date: string;
  dateText: string;
  badge: string;
  severity: number;
};

function makeAttentionItem(
  entity: DemoEntity,
  record: DemoRecord,
  category: string,
  title: string,
  context: string,
  date: string,
  overdueLabel = "Overdue",
  forceOverdue = false,
): DemoAttentionItem {
  const isOverdue = forceOverdue || Boolean(date && date < todayKey);
  const severity = isOverdue ? 0 : !date || date === todayKey ? 1 : 2;
  return {
    id: `${entity}-${record.id}`,
    entity,
    record,
    category,
    title,
    context,
    date,
    dateText: date ? demoDate(date) : "Due date not set",
    badge: isOverdue ? overdueLabel : !date ? "Add due date" : date === todayKey ? "Today" : "This week",
    severity,
  };
}

export const attentionItems: DemoAttentionItem[] = [
  ...demoStore.tasks
    .filter((task) => !task.completed && task.dueDate && task.dueDate <= weekEndKey)
    .map((task) => makeAttentionItem("tasks", task, "Task", task.title, demoProjectName(task.projectId), task.dueDate)),
  ...demoStore.projects
    .filter((project) => ["Planning", "In progress"].includes(project.status) && project.dueDate && project.dueDate <= weekEndKey)
    .map((project) => makeAttentionItem("projects", project, "Project deadline", project.title, demoClientName(project.clientId), project.dueDate)),
  ...demoStore.leads
    .filter((lead) => !["Won", "Lost"].includes(lead.stage) && lead.nextActionDate && lead.nextActionDate <= weekEndKey)
    .map((lead) => makeAttentionItem("leads", lead, "Follow-up", lead.name, lead.company, lead.nextActionDate)),
  ...demoStore.proposals
    .filter((proposal) => proposal.status === "Sent" && proposal.validUntil && proposal.validUntil <= weekEndKey)
    .map((proposal) => makeAttentionItem("proposals", proposal, "Proposal expiry", proposal.title, proposal.clientId ? demoClientName(proposal.clientId) : demoLeadName(proposal.leadId), proposal.validUntil, "Expired")),
  ...demoStore.invoices
    .filter((invoice) => invoice.status === "Overdue" || (invoice.status === "Sent" && (!invoice.dueDate || invoice.dueDate <= weekEndKey)))
    .map((invoice) => makeAttentionItem("invoices", invoice, "Invoice", invoice.number || "Invoice", [demoClientName(invoice.clientId), demoMoney(invoice.amountPence)].filter((value) => value && value !== "—").join(" · "), invoice.dueDate || "", "Overdue", invoice.status === "Overdue")),
].sort((a, b) => a.severity - b.severity || (a.date || todayKey).localeCompare(b.date || todayKey) || a.category.localeCompare(b.category));

export const attentionCountsByDay = Object.fromEntries(
  weekDayKeys.map((dayKey) => [dayKey, attentionItems.filter((item) => item.date === dayKey).length]),
) as Record<string, number>;

export const weekMinutes = demoStore.timeEntries
  .filter((entry) => entry.date >= weekDayKeys[0] && entry.date <= weekDayKeys[6])
  .reduce((total, entry) => total + Number(entry.durationMinutes || 0), 0);

export const upcomingInvoices = demoStore.invoices
  .filter((invoice) => invoice.status === "Sent" && invoice.dueDate && invoice.dueDate > weekEndKey)
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  .slice(0, 3);

export const dashboardMetrics = {
  collected: demoStore.invoices.filter((invoice) => invoice.status === "Paid").reduce((total, invoice) => total + Number(invoice.amountPence || 0), 0),
  outstanding: demoStore.invoices.filter((invoice) => ["Sent", "Overdue"].includes(invoice.status)).reduce((total, invoice) => total + Number(invoice.amountPence || 0), 0),
  expenses: demoStore.expenses.filter((expense) => String(expense.date || "").startsWith(monthPrefix)).reduce((total, expense) => total + Number(expense.amountPence || 0), 0),
  activeProjects: demoStore.projects.filter((project) => ["In progress", "Planning"].includes(project.status)).length,
  openTasks: demoStore.tasks.filter((task) => !task.completed).length,
  pipelineConversations: demoStore.leads.filter((lead) => !["Won", "Lost"].includes(lead.stage)).length,
};

export function attentionForDay(dayKey: string) {
  return attentionItems.filter((item) => item.severity === 0 || !item.date || item.date === dayKey);
}
