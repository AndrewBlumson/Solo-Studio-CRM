type RecordItem = Record<string, any> & { id: string };

export type ProposalInvoiceWorkspace = {
  invoices: RecordItem[];
  clients: RecordItem[];
  leads: RecordItem[];
};

type ProposalInvoiceResult =
  | { kind: 'existing'; invoice: RecordItem }
  | { kind: 'missing-client'; message: string }
  | {
      kind: 'created';
      invoice: RecordItem;
      client?: RecordItem;
      clientId: string;
      leadId?: string;
    };

function nextInvoiceNumber(invoices: RecordItem[]) {
  const matches = invoices
    .map((invoice) => String(invoice.number || '').match(/^(.*?)(\d+)$/))
    .filter((match): match is RegExpMatchArray => match !== null);
  const firstMatch = matches[0];
  if (!firstMatch) return `INV-${String(invoices.length + 1).padStart(3, '0')}`;
  const prefix = firstMatch[1];
  const sameSeries = matches.filter((match) => match[1] === prefix);
  const largest = sameSeries.reduce(
    (current, match) => Math.max(current, Number(match[2])),
    0,
  );
  const padding = Math.max(...sameSeries.map((match) => match[2].length));
  return `${prefix}${String(largest + 1).padStart(padding, '0')}`;
}

export function prepareProposalInvoice(
  proposal: RecordItem,
  workspace: ProposalInvoiceWorkspace,
  issuedDate: string,
  createId: () => string,
): ProposalInvoiceResult {
  const linkedInvoice = workspace.invoices.find(
    (invoice) => invoice.sourceProposalId === proposal.id,
  );
  if (linkedInvoice) return { kind: 'existing', invoice: linkedInvoice };

  const existingClient = workspace.clients.find(
    (client) => client.id === proposal.clientId,
  );
  let clientId = existingClient?.id || '';
  const lead = workspace.leads.find((record) => record.id === proposal.leadId);
  let createdClient: RecordItem | undefined;

  if (!clientId && lead && String(lead.name || '').trim()) {
    clientId = createId();
    createdClient = {
      id: clientId,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: '',
      notes: `Converted from proposal ${proposal.title}.`,
      createdAt: issuedDate,
    };
  }

  if (!clientId) {
    return {
      kind: 'missing-client',
      message: 'Link this proposal to a client or lead before drafting an invoice.',
    };
  }

  const invoice: RecordItem = {
    id: createId(),
    number: nextInvoiceNumber(workspace.invoices),
    clientId,
    projectId: '',
    amountPence: Number(proposal.amountPence) || 0,
    issuedDate,
    dueDate: '',
    status: 'Draft',
    paidDate: '',
    sourceProposalId: proposal.id,
  };

  return {
    kind: 'created',
    invoice,
    client: createdClient,
    clientId,
    leadId: createdClient ? lead?.id : undefined,
  };
}

export function buildRecordOutput(
  _entity: string,
  item: RecordItem | undefined,
  form: Record<string, any>,
  createId: () => string,
): RecordItem {
  return {
    ...item,
    ...form,
    id: item?.id ?? createId(),
  };
}
