export const PUBLIC_LEGAL_PROFILE_KEYS = [
  "registeredName",
  "tradingName",
  "country",
  "registeredAddress",
  "privacyEmail",
  "website",
] as const;

export type PublicLegalProfile = Record<
  (typeof PUBLIC_LEGAL_PROFILE_KEYS)[number],
  string
>;

export type DocumentSettings = {
  defaultDueDays: number;
  vatNumber: string;
  vatRatePercent: number | null;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  paymentReference: string;
};

export const emptyDocumentSettings: DocumentSettings = {
  defaultDueDays: 14,
  vatNumber: "",
  vatRatePercent: null,
  accountName: "",
  sortCode: "",
  accountNumber: "",
  paymentReference: "",
};

export type DocumentLine = {
  id: string;
  description: string;
  quantity: number;
  unitAmountPence: number;
};

export type FormDocumentLine = {
  id: string;
  description: string;
  quantity: string;
  unitPounds: string;
};

export type StudioDocumentKind = "proposal" | "invoice";

export type StudioDocumentLine = DocumentLine & { amountPence: number };

export type StudioDocument = {
  kind: StudioDocumentKind;
  heading: string;
  number: string;
  title: string;
  status: string;
  issuedDate: string;
  secondaryDateLabel: "Valid until" | "Due date";
  secondaryDate: string;
  issuer: {
    name: string;
    address: string;
    country: string;
    email: string;
    website: string;
  };
  billTo: {
    name: string;
    company: string;
    email: string;
    missing: boolean;
  };
  lines: StudioDocumentLine[];
  subtotalPence: number;
  vat:
    | { charged: false; note: string; totalPence: number }
    | {
        charged: true;
        vatNumber: string;
        ratePercent: number;
        vatPence: number;
        totalPence: number;
      };
  payment: {
    accountName: string;
    sortCode: string;
    accountNumber: string;
    reference: string;
  } | null;
};

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function publicLegalProfile(value: unknown): PublicLegalProfile {
  const source = isRecord(value) ? value : {};
  return {
    registeredName: text(source.registeredName),
    tradingName: text(source.tradingName),
    country: text(source.country),
    registeredAddress: text(source.registeredAddress),
    privacyEmail: text(source.privacyEmail),
    website: text(source.website),
  };
}

export function normalizeDocumentSettings(value: unknown): DocumentSettings {
  const source = isRecord(value) ? value : {};
  const days = Number(source.defaultDueDays);
  const rate = source.vatRatePercent;
  return {
    defaultDueDays:
      Number.isInteger(days) && days >= 0 && days <= 365 ? days : 14,
    vatNumber: text(source.vatNumber),
    vatRatePercent:
      typeof rate === "number" &&
      Number.isFinite(rate) &&
      rate >= 0 &&
      rate <= 100
        ? rate
        : null,
    accountName: text(source.accountName),
    sortCode: text(source.sortCode),
    accountNumber: text(source.accountNumber),
    paymentReference: text(source.paymentReference),
  };
}

export function addCalendarDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match || !Number.isInteger(days)) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }
  date.setDate(date.getDate() + days);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

export function lineTotalPence(quantity: number, unitAmountPence: number): number {
  return Math.round(quantity * unitAmountPence);
}

export function normalizeLines(value: unknown): DocumentLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const description = text(entry.description);
    const quantity = Number(entry.quantity);
    const unitAmountPence = Number(entry.unitAmountPence);
    if (!description) return [];
    if (!Number.isFinite(quantity) || quantity <= 0) return [];
    if (!Number.isFinite(unitAmountPence) || unitAmountPence < 0) return [];
    return [
      {
        id: text(entry.id) || "line",
        description,
        quantity,
        unitAmountPence: Math.round(unitAmountPence),
      },
    ];
  });
}

function poundsToPence(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

function formatPoundsInput(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? String(pounds) : pounds.toFixed(2);
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(quantity);
}

export function linesForForm(
  record: LooseRecord | undefined,
  createId: () => string,
): FormDocumentLine[] {
  const existing = normalizeLines(record?.lines);
  if (existing.length) {
    return existing.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: formatQuantity(line.quantity),
      unitPounds: formatPoundsInput(line.unitAmountPence),
    }));
  }
  const amount = Number(record?.amountPence);
  return [
    {
      id: createId(),
      description: text(record?.title) || text(record?.number),
      quantity: "1",
      unitPounds:
        Number.isFinite(amount) && amount > 0 ? formatPoundsInput(amount) : "",
    },
  ];
}

export function documentLinesError(lines: FormDocumentLine[]): string {
  if (!lines.length) return "Add at least one line.";
  for (const line of lines) {
    if (!line.description.trim()) return "Add a description to each line.";
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "Enter a quantity greater than zero.";
    }
    if (poundsToPence(line.unitPounds) === null) {
      return "Enter a unit price of zero or more, with up to two decimal places.";
    }
  }
  return "";
}

export function applyDocumentLines(lines: FormDocumentLine[]): {
  lines: DocumentLine[];
  amountPence: number;
} {
  const saved = lines.map((line) => {
    const quantity = Number(line.quantity);
    const unitAmountPence = poundsToPence(line.unitPounds) ?? 0;
    return {
      id: line.id,
      description: line.description.trim(),
      quantity,
      unitAmountPence,
    };
  });
  const amountPence = saved.reduce(
    (sum, line) => sum + lineTotalPence(line.quantity, line.unitAmountPence),
    0,
  );
  return { lines: saved, amountPence };
}

function party(record: LooseRecord | null | undefined) {
  if (!record) return { name: "", company: "", email: "" };
  return {
    name: text(record.name),
    company: text(record.company),
    email: text(record.email),
  };
}

function hasParty(value: { name: string; company: string; email: string }) {
  return Boolean(value.name || value.company || value.email);
}

export function formatSortCode(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 6 && digits === value.replace(/[-\s]/g, "")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  }
  return value.trim();
}

export function buildStudioDocument(input: {
  kind: StudioDocumentKind;
  record: LooseRecord;
  client?: LooseRecord | null;
  lead?: LooseRecord | null;
  legalProfile: unknown;
  paymentSettings: unknown;
}): StudioDocument {
  const legal = publicLegalProfile(input.legalProfile);
  const payment = normalizeDocumentSettings(input.paymentSettings);
  const record = input.record;
  const savedLines = normalizeLines(record.lines);
  const amountPence = Number(record.amountPence);
  const fallbackAmount =
    Number.isFinite(amountPence) && amountPence > 0 ? Math.round(amountPence) : 0;
  const description =
    text(record.title) ||
    text(record.number) ||
    (input.kind === "proposal" ? "Proposal" : "Invoice");
  const sourceLines = savedLines.length
    ? savedLines
    : [
        {
          id: "legacy-line",
          description,
          quantity: 1,
          unitAmountPence: fallbackAmount,
        },
      ];
  const lines = sourceLines.map((line) => ({
    ...line,
    amountPence: lineTotalPence(line.quantity, line.unitAmountPence),
  }));
  const subtotalPence = lines.reduce((sum, line) => sum + line.amountPence, 0);
  const client = party(input.client);
  const lead = input.kind === "proposal" ? party(input.lead) : party(null);
  const billSource = hasParty(client) ? client : lead;
  const vat = vatTreatment(payment, subtotalPence);
  const hasPayment = Boolean(
    payment.accountName || payment.sortCode || payment.accountNumber,
  );
  const number = text(record.number);

  return {
    kind: input.kind,
    heading: input.kind === "proposal" ? "Proposal" : "Invoice",
    number,
    title: text(record.title) || number || description,
    status: text(record.status),
    issuedDate: input.kind === "invoice" ? text(record.issuedDate) : "",
    secondaryDateLabel: input.kind === "proposal" ? "Valid until" : "Due date",
    secondaryDate: text(
      input.kind === "proposal" ? record.validUntil : record.dueDate,
    ),
    issuer: {
      name: legal.tradingName || legal.registeredName,
      address: legal.registeredAddress,
      country: legal.country,
      email: legal.privacyEmail,
      website: legal.website,
    },
    billTo: {
      ...billSource,
      missing: !hasParty(billSource),
    },
    lines,
    subtotalPence,
    vat,
    payment: hasPayment
      ? {
          accountName: payment.accountName,
          sortCode: formatSortCode(payment.sortCode),
          accountNumber: payment.accountNumber,
          reference: payment.paymentReference || number || text(record.title),
        }
      : null,
  };
}

function vatTreatment(
  payment: DocumentSettings,
  subtotalPence: number,
): StudioDocument["vat"] {
  if (!payment.vatNumber) {
    return {
      charged: false,
      note: "No VAT charged.",
      totalPence: subtotalPence,
    };
  }
  if (payment.vatRatePercent === null) {
    return {
      charged: false,
      note: "VAT number is saved, but no rate is set, so no VAT is added.",
      totalPence: subtotalPence,
    };
  }
  const vatPence = Math.round((subtotalPence * payment.vatRatePercent) / 100);
  return {
    charged: true,
    vatNumber: payment.vatNumber,
    ratePercent: payment.vatRatePercent,
    vatPence,
    totalPence: subtotalPence + vatPence,
  };
}

export function parseDocumentPath(
  path: string,
): { kind: StudioDocumentKind; id: string } | null {
  const pathname = path.split("?")[0] ?? "";
  const match = /^\/(proposal|invoice)\/([^/]+)$/.exec(pathname);
  if (!match?.[1] || !match[2]) return null;
  const id = decodeURIComponent(match[2]);
  if (!id) return null;
  return { kind: match[1] === "invoice" ? "invoice" : "proposal", id };
}
