type FinanceRecord = Record<string, unknown> & { id: string };

function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);

  if (typeof value === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(value)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function csv(headers: string[], rows: unknown[][]): string {
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") +
    "\r\n"
  );
}

function displayDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB").format(date);
}

function poundValue(value: unknown): string {
  const pence = Number(value);
  return (Number.isFinite(pence) ? pence / 100 : 0).toFixed(2);
}

function relatedName(
  id: unknown,
  records: FinanceRecord[],
  primaryKey: "company" | "title",
): string {
  if (typeof id !== "string" || !id) return "";
  const record = records.find((item) => item.id === id);
  if (!record) return "";
  if (primaryKey === "company") {
    return String(record.company || record.name || "");
  }
  return String(record.title || "");
}

export function buildInvoicesCsv(
  invoices: FinanceRecord[],
  clients: FinanceRecord[],
  projects: FinanceRecord[],
): string {
  return csv(
    [
      "Invoice number",
      "Client",
      "Project",
      "Amount (£)",
      "Issued date",
      "Due date",
      "Status",
      "Paid date",
    ],
    invoices.map((invoice) => [
      invoice.number,
      relatedName(invoice.clientId, clients, "company"),
      relatedName(invoice.projectId, projects, "title"),
      poundValue(invoice.amountPence),
      displayDate(invoice.issuedDate),
      displayDate(invoice.dueDate),
      invoice.status,
      displayDate(invoice.paidDate),
    ]),
  );
}

export function buildExpensesCsv(
  expenses: FinanceRecord[],
  projects: FinanceRecord[],
): string {
  return csv(
    ["Expense", "Category", "Amount (£)", "Date", "Project", "Notes"],
    expenses.map((expense) => [
      expense.title,
      expense.category,
      poundValue(expense.amountPence),
      displayDate(expense.date),
      relatedName(expense.projectId, projects, "title"),
      expense.notes,
    ]),
  );
}