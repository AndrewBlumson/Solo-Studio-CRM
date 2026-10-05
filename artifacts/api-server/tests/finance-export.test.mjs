import assert from "node:assert/strict";
import { test } from "node:test";

const { buildInvoicesCsv, buildExpensesCsv } = await import(
  "../../solo-studio/src/lib/finance-export.ts"
);

test("invoice exports resolve names, preserve pounds and prevent spreadsheet formulas", () => {
  const output = buildInvoicesCsv(
    [
      {
        id: "invoice-01",
        number: '=HYPERLINK("https://example.invalid")',
        clientId: "client-01",
        projectId: "project-01",
        amountPence: 12530,
        issuedDate: "2026-10-04",
        dueDate: "2026-10-18",
        status: "Sent",
        paidDate: "",
      },
    ],
    [{ id: "client-01", name: "Alice", company: 'North, "Kind"' }],
    [{ id: "project-01", title: "Brand refresh" }],
  );
  const csv = output.slice(1);

  assert.match(
    csv,
    /^"Invoice number","Client","Project","Amount \(£\)","Issued date","Due date","Status","Paid date"/,
  );
  assert.match(
    csv,
    /"'=HYPERLINK\(""https:\/\/example\.invalid""\)","North, ""Kind""","Brand refresh","125\.30","04\/10\/2026","18\/10\/2026","Sent",""/,
  );
});

test("expense exports include UK dates, pound values and related projects", () => {
  const output = buildExpensesCsv(
    [
      {
        id: "expense-01",
        title: "Train to client",
        category: "Travel",
        amountPence: 1999,
        date: "2026-10-04",
        projectId: "project-01",
        notes: "Return fare",
      },
    ],
    [{ id: "project-01", title: "Autumn campaign" }],
  );
  const csv = output.slice(1);

  assert.match(
    csv,
    /^"Expense","Category","Amount \(£\)","Date","Project","Notes"/,
  );
  assert.match(
    csv,
    /"Train to client","Travel","19\.99","04\/10\/2026","Autumn campaign","Return fare"/,
  );
});