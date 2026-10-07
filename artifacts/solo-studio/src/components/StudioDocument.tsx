import { useEffect, type Dispatch, type SetStateAction } from "react";
import { Link } from "wouter";
import { useGetStudioLegalProfile } from "@workspace/api-client-react";
import {
  applyDocumentLines,
  buildStudioDocument,
  documentLinesError,
  normalizeDocumentSettings,
  type FormDocumentLine,
  type StudioDocument,
  type StudioDocumentKind,
} from "../lib/studio-document";

function money(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format((Number(pence) || 0) / 100);
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB").format(date);
}

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity) ? String(quantity) : String(quantity);
}

function lineId() {
  return globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}`;
}

export function DocumentLinesEditor({
  lines,
  onChange,
}: {
  lines: FormDocumentLine[];
  onChange: (lines: FormDocumentLine[], amountPounds: number | null) => void;
}) {
  const update = (next: FormDocumentLine[]) => {
    const error = documentLinesError(next);
    onChange(next, error ? null : applyDocumentLines(next).amountPence / 100);
  };

  return (
    <div className="document-lines" data-testid="document-lines">
      <div className="eyebrow">Work</div>
      <p className="small-muted">
        The amount saved on this record is the sum of these lines. Printing
        does not send the document or collect payment.
      </p>
      {lines.map((line, index) => (
        <div className="document-line" key={line.id}>
          <label>
            <span>Description</span>
            <input
              value={line.description}
              onChange={(event) =>
                update(
                  lines.map((item) =>
                    item.id === line.id
                      ? { ...item, description: event.target.value }
                      : item,
                  ),
                )
              }
              data-testid={`input-line-description-${index}`}
            />
          </label>
          <label>
            <span>Qty</span>
            <input
              inputMode="decimal"
              value={line.quantity}
              onChange={(event) =>
                update(
                  lines.map((item) =>
                    item.id === line.id
                      ? { ...item, quantity: event.target.value }
                      : item,
                  ),
                )
              }
              data-testid={`input-line-quantity-${index}`}
            />
          </label>
          <label>
            <span>Unit price (£)</span>
            <input
              inputMode="decimal"
              value={line.unitPounds}
              onChange={(event) =>
                update(
                  lines.map((item) =>
                    item.id === line.id
                      ? { ...item, unitPounds: event.target.value }
                      : item,
                  ),
                )
              }
              data-testid={`input-line-price-${index}`}
            />
          </label>
          <button
            type="button"
            className="button small"
            disabled={lines.length === 1}
            onClick={() => update(lines.filter((item) => item.id !== line.id))}
            data-testid={`button-remove-line-${index}`}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="button-row">
        <button
          type="button"
          className="button small"
          onClick={() =>
            update([
              ...lines,
              { id: lineId(), description: "", quantity: "1", unitPounds: "" },
            ])
          }
          data-testid="button-add-line"
        >
          Add line
        </button>
        <span className="small-muted" data-testid="text-line-total">
          {documentLinesError(lines)
            ? "Enter each line to update the total."
            : `Lines total ${money(applyDocumentLines(lines).amountPence)}`}
        </span>
      </div>
    </div>
  );
}

export function DocumentSettingsCard({
  form,
  setForm,
  onSave,
}: {
  form: { document?: Record<string, unknown> };
  setForm: Dispatch<SetStateAction<any>>;
  onSave: () => void;
}) {
  const document = form.document ?? {};
  const setDocument = (key: string, value: string) => {
    setForm((current: { document?: Record<string, unknown> }) => ({
      ...current,
      document: { ...current.document, [key]: value },
    }));
  };
  const fields: Array<[string, string, string]> = [
    ["accountName", "Account name", "Name on the account"],
    ["sortCode", "Sort code", "00-00-00"],
    ["accountNumber", "Account number", "8 digits"],
    ["paymentReference", "Payment reference", "Leave blank to use the invoice number"],
  ];

  return (
    <form
      className="card section"
      style={{ maxWidth: 700 }}
      data-testid="section-document-settings"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="eyebrow">Documents · private to this account</div>
      <h2 className="card-title">Proposals, invoices and how you get paid</h2>
      <p className="small-muted">
        These details appear on the printed page only. They are not added to
        the public legal pages. Leave the VAT number blank if you are not VAT
        registered. No rate is assumed.
      </p>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="document-due-days">Default days until an invoice is due</label>
          <input
            id="document-due-days"
            type="number"
            min="0"
            max="365"
            value={String(document.defaultDueDays ?? 14)}
            onChange={(event) => setDocument("defaultDueDays", event.target.value)}
            data-testid="input-document-due-days"
          />
        </div>
        <div className="field">
          <label htmlFor="document-vat-number">VAT number</label>
          <input
            id="document-vat-number"
            value={String(document.vatNumber ?? "")}
            onChange={(event) => setDocument("vatNumber", event.target.value)}
            data-testid="input-document-vat-number"
          />
        </div>
        <div className="field">
          <label htmlFor="document-vat-rate">VAT rate (%)</label>
          <input
            id="document-vat-rate"
            inputMode="decimal"
            placeholder="Leave blank if no VAT"
            value={
              document.vatRatePercent === null || document.vatRatePercent === undefined
                ? ""
                : String(document.vatRatePercent)
            }
            onChange={(event) => setDocument("vatRatePercent", event.target.value)}
            data-testid="input-document-vat-rate"
          />
        </div>
        {fields.map(([key, label, placeholder]) => (
          <div className="field" key={key}>
            <label htmlFor={`document-${key}`}>{label}</label>
            <input
              id={`document-${key}`}
              placeholder={placeholder}
              value={String(document[key] ?? "")}
              onChange={(event) => setDocument(key, event.target.value)}
              data-testid={`input-document-${key}`}
            />
          </div>
        ))}
      </div>
      <button className="button primary" type="submit" data-testid="button-save-document-settings">
        Save document settings
      </button>
    </form>
  );
}

function DocumentSheet({ document }: { document: StudioDocument }) {
  return (
    <article className="studio-print" data-testid="studio-document">
      <header className="studio-print-head">
        <div>
          <p className="studio-print-kicker">{document.heading}</p>
          <h1>{document.number || document.title}</h1>
          {document.number && document.title !== document.number ? (
            <p className="studio-print-title">{document.title}</p>
          ) : null}
        </div>
        {document.status ? (
          <p className="studio-print-status">{document.status}</p>
        ) : null}
      </header>
      <div className="studio-print-parties">
        <section>
          <h2>From</h2>
          {document.issuer.name ? <p>{document.issuer.name}</p> : null}
          {document.issuer.address ? <p>{document.issuer.address}</p> : null}
          {document.issuer.country ? <p>{document.issuer.country}</p> : null}
          {document.issuer.email ? <p>{document.issuer.email}</p> : null}
          {document.issuer.website ? <p>{document.issuer.website}</p> : null}
          {!document.issuer.name &&
          !document.issuer.address &&
          !document.issuer.email &&
          !document.issuer.website ? (
            <p className="studio-print-empty">Company identity has not been added.</p>
          ) : null}
        </section>
        <section>
          <h2>Bill to</h2>
          {document.billTo.missing ? (
            <p className="studio-print-empty">No client is linked to this record.</p>
          ) : (
            <>
              {document.billTo.name ? <p>{document.billTo.name}</p> : null}
              {document.billTo.company ? <p>{document.billTo.company}</p> : null}
              {document.billTo.email ? <p>{document.billTo.email}</p> : null}
            </>
          )}
        </section>
        <section>
          <h2>Dates</h2>
          {document.issuedDate ? (
            <p>Issued {formatDate(document.issuedDate)}</p>
          ) : null}
          <p>
            {document.secondaryDateLabel} {formatDate(document.secondaryDate)}
          </p>
        </section>
      </div>
      <table className="studio-print-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {document.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.description}</td>
              <td>{formatQuantity(line.quantity)}</td>
              <td>{money(line.unitAmountPence)}</td>
              <td>{money(line.amountPence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="studio-print-totals">
        <p>
          <span>Subtotal</span>
          <strong>{money(document.subtotalPence)}</strong>
        </p>
        {document.vat.charged ? (
          <p>
            <span>
              VAT {document.vat.ratePercent}% · {document.vat.vatNumber}
            </span>
            <strong>{money(document.vat.vatPence)}</strong>
          </p>
        ) : (
          <p>
            <span>{document.vat.note}</span>
          </p>
        )}
        <p className="studio-print-due">
          <span>Total due</span>
          <strong>{money(document.vat.totalPence)}</strong>
        </p>
      </div>
      {document.payment ? (
        <section className="studio-print-payment">
          <h2>Payment</h2>
          {document.payment.accountName ? <p>{document.payment.accountName}</p> : null}
          {document.payment.sortCode ? <p>Sort code {document.payment.sortCode}</p> : null}
          {document.payment.accountNumber ? (
            <p>Account number {document.payment.accountNumber}</p>
          ) : null}
          {document.payment.reference ? (
            <p>Reference {document.payment.reference}</p>
          ) : null}
        </section>
      ) : null}
      <p className="studio-print-note">
        This page is for printing or saving as a PDF. It does not send the{" "}
        {document.heading.toLowerCase()} or collect payment.
      </p>
    </article>
  );
}

export function StudioDocumentPage({
  kind,
  record,
  client,
  lead,
  paymentSettings,
  backHref,
}: {
  kind: StudioDocumentKind;
  record?: Record<string, unknown>;
  client?: Record<string, unknown> | null;
  lead?: Record<string, unknown> | null;
  paymentSettings: unknown;
  backHref: string;
}) {
  const legalProfileQuery = useGetStudioLegalProfile();
  const studioDocument = record
    ? buildStudioDocument({
        kind,
        record,
        client,
        lead,
        legalProfile: legalProfileQuery.data ?? {},
        paymentSettings,
      })
    : null;

  const pageTitle = studioDocument
    ? `${studioDocument.heading} ${studioDocument.number || studioDocument.title} · Solo Studio`
    : `${kind === "invoice" ? "Invoice" : "Proposal"} · Solo Studio`;

  useEffect(() => {
    window.document.title = pageTitle;
  }, [pageTitle]);

  return (
    <main className="studio-print-screen">
      <div className="studio-print-toolbar">
        <Link href={backHref} className="button" data-testid="link-document-back">
          Back to the studio
        </Link>
        {studioDocument ? (
          <button
            type="button"
            className="button primary"
            onClick={() => window.print()}
            data-testid="button-print-document"
          >
            Print
          </button>
        ) : null}
        <p>
          {legalProfileQuery.isError
            ? "Company identity could not be loaded. Those fields are left blank."
            : "Save a PDF from the print dialog. Nothing is emailed from this page."}
        </p>
      </div>
      {studioDocument ? (
        <DocumentSheet document={studioDocument} />
      ) : (
        <section className="studio-print studio-print-missing" data-testid="studio-document-missing">
          <h1>That record is not in this workspace.</h1>
          <p>It may have been deleted, or the link is for another account.</p>
        </section>
      )}
    </main>
  );
}

export function documentSettingsFromForm(form: {
  document?: Record<string, unknown>;
}) {
  const document = form.document ?? {};
  const rate = document.vatRatePercent;
  const rateText = rate === null || rate === undefined ? "" : String(rate).trim();
  return normalizeDocumentSettings({
    defaultDueDays: Number(document.defaultDueDays),
    vatNumber: document.vatNumber ?? "",
    vatRatePercent: rateText === "" ? null : Number(rateText),
    accountName: document.accountName ?? "",
    sortCode: document.sortCode ?? "",
    accountNumber: document.accountNumber ?? "",
    paymentReference: document.paymentReference ?? "",
  });
}
