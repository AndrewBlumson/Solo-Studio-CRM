import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_LEGAL_PROFILE_KEYS,
  addCalendarDays,
  applyDocumentLines,
  buildStudioDocument,
  documentLinesError,
  emptyDocumentSettings,
  linesForForm,
  publicLegalProfile,
} from "./studio-document.ts";

const legacyInvoice = {
  id: "invoice-01",
  number: "SS-104",
  clientId: "client-north",
  amountPence: 132500,
  issuedDate: "2026-09-25",
  dueDate: "2026-10-09",
  status: "Sent",
};

const client = {
  id: "client-north",
  name: "Eleanor Price",
  company: "North & Kind",
  email: "eleanor@example.com",
};

test("a saved lump sum prints as one line for the same amount", () => {
  const document = buildStudioDocument({
    kind: "invoice",
    record: legacyInvoice,
    client,
    legalProfile: {
      tradingName: "Fieldnotes Studio",
      registeredAddress: "1 Studio Yard, Hertford",
      privacyEmail: "hello@example.com",
      website: "https://example.com",
    },
    paymentSettings: emptyDocumentSettings,
  });

  assert.deepEqual(document.lines, [
    {
      id: "legacy-line",
      description: "SS-104",
      quantity: 1,
      unitAmountPence: 132500,
      amountPence: 132500,
    },
  ]);
  assert.equal(document.subtotalPence, 132500);
  assert.equal(document.vat.charged, false);
  assert.equal(document.vat.totalPence, 132500);
  assert.equal(document.payment, null);
  assert.equal(document.issuer.name, "Fieldnotes Studio");
  assert.equal(document.issuer.country, "");
  assert.deepEqual(document.billTo, {
    name: "Eleanor Price",
    company: "North & Kind",
    email: "eleanor@example.com",
    missing: false,
  });
});

test("line totals are written back as the record amount", () => {
  const formLines = linesForForm(
    {
      title: "Identity system",
      lines: [
        {
          id: "line-1",
          description: "Identity system",
          quantity: 1,
          unitAmountPence: 240000,
        },
        {
          id: "line-2",
          description: "Launch page",
          quantity: 2,
          unitAmountPence: 40000,
        },
      ],
    },
    () => assert.fail("saved lines keep their own ids"),
  );
  assert.equal(documentLinesError(formLines), "");
  const saved = applyDocumentLines(formLines);
  assert.equal(saved.amountPence, 320000);
  assert.equal(
    saved.lines.reduce(
      (sum, line) => sum + Math.round(line.quantity * line.unitAmountPence),
      0,
    ),
    saved.amountPence,
  );

  const document = buildStudioDocument({
    kind: "proposal",
    record: {
      title: "Identity system",
      amountPence: 1,
      status: "Draft",
      validUntil: "2026-10-20",
      lines: saved.lines,
    },
    client,
    legalProfile: {},
    paymentSettings: emptyDocumentSettings,
  });
  assert.equal(document.subtotalPence, 320000);
  assert.equal(document.secondaryDateLabel, "Valid until");
});

test("VAT is added only when a number and a rate are both set", () => {
  const record = {
    ...legacyInvoice,
    lines: [
      {
        id: "line-1",
        description: "Seasonal story",
        quantity: 1,
        unitAmountPence: 100000,
      },
    ],
  };
  const withoutNumber = buildStudioDocument({
    kind: "invoice",
    record,
    client,
    legalProfile: {},
    paymentSettings: { ...emptyDocumentSettings, vatRatePercent: 20 },
  });
  assert.deepEqual(withoutNumber.vat, {
    charged: false,
    note: "No VAT charged.",
    totalPence: 100000,
  });

  const numberWithoutRate = buildStudioDocument({
    kind: "invoice",
    record,
    client,
    legalProfile: { vatNumber: "GB999999999" },
    paymentSettings: { ...emptyDocumentSettings, vatNumber: "GB123456789" },
  });
  assert.equal(numberWithoutRate.vat.charged, false);
  if (!numberWithoutRate.vat.charged) {
    assert.equal(
      numberWithoutRate.vat.note,
      "VAT number is saved, but no rate is set, so no VAT is added.",
    );
  }
  assert.equal(numberWithoutRate.vat.totalPence, 100000);

  const charged = buildStudioDocument({
    kind: "invoice",
    record,
    client,
    legalProfile: {},
    paymentSettings: {
      ...emptyDocumentSettings,
      vatNumber: "GB123456789",
      vatRatePercent: 20,
    },
  });
  assert.deepEqual(charged.vat, {
    charged: true,
    vatNumber: "GB123456789",
    ratePercent: 20,
    vatPence: 20000,
    totalPence: 120000,
  });
});

test("payment details stay off the public legal profile", () => {
  const legalProfile = {
    tradingName: "Fieldnotes Studio",
    registeredName: "Fieldnotes Studio",
    country: "United Kingdom",
    registeredAddress: "1 Studio Yard",
    privacyEmail: "hello@example.com",
    website: "https://example.com",
    sortCode: "20-00-00",
    accountNumber: "12345678",
    accountName: "Should not be public",
    vatNumber: "GB999999999",
    paymentReference: "SECRET",
  };
  const publicProfile = publicLegalProfile(legalProfile);
  assert.deepEqual(
    Object.keys(publicProfile).sort(),
    [...PUBLIC_LEGAL_PROFILE_KEYS].sort(),
  );
  assert.equal("sortCode" in publicProfile, false);
  assert.equal("accountNumber" in publicProfile, false);
  assert.equal("vatNumber" in publicProfile, false);

  const document = buildStudioDocument({
    kind: "invoice",
    record: legacyInvoice,
    client,
    legalProfile,
    paymentSettings: emptyDocumentSettings,
  });
  assert.equal(document.payment, null);
  assert.equal(document.vat.charged, false);
  assert.equal(document.issuer.name, "Fieldnotes Studio");
  assert.equal(document.issuer.address, "1 Studio Yard");
  assert.equal(document.issuer.email, "hello@example.com");

  const withPrivatePayment = buildStudioDocument({
    kind: "invoice",
    record: legacyInvoice,
    client,
    legalProfile: publicProfile,
    paymentSettings: {
      ...emptyDocumentSettings,
      accountName: "Fieldnotes Studio",
      sortCode: "200000",
      accountNumber: "12345678",
    },
  });
  assert.deepEqual(withPrivatePayment.payment, {
    accountName: "Fieldnotes Studio",
    sortCode: "20-00-00",
    accountNumber: "12345678",
    reference: "SS-104",
  });
});

test("empty company details stay blank", () => {
  const document = buildStudioDocument({
    kind: "proposal",
    record: { title: "A proposal", amountPence: 5000, status: "Draft" },
    client: null,
    legalProfile: {},
    paymentSettings: emptyDocumentSettings,
  });
  assert.equal(document.issuer.name, "");
  assert.equal(document.issuer.address, "");
  assert.equal(document.issuer.email, "");
  assert.equal(document.issuer.website, "");
  assert.equal(document.billTo.missing, true);
});

test("calendar due dates stay on the issued date plus the chosen number of days", () => {
  assert.equal(addCalendarDays("2026-10-05", 14), "2026-10-19");
  assert.equal(addCalendarDays("2026-02-31", 1), "");
});
