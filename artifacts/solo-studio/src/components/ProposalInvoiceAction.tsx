import { useState } from 'react';
import {
  prepareProposalInvoice,
  type ProposalInvoiceWorkspace,
} from '../lib/proposal-invoice';

type RecordItem = Record<string, any> & { id: string };

type ProposalInvoiceActionProps = {
  proposal: RecordItem;
  workspace: ProposalInvoiceWorkspace;
  setWorkspace: (update: (previous: any) => any) => void;
  openInvoice: (invoice: RecordItem, mode: 'edit' | 'view') => void;
  issuedDate: string;
  createId: () => string;
  notify?: (message: string) => void;
  defaultDueDays?: number;
};

export function ProposalInvoiceAction({
  proposal,
  workspace,
  setWorkspace,
  openInvoice,
  issuedDate,
  createId,
  notify,
  defaultDueDays,
}: ProposalInvoiceActionProps) {
  const [error, setError] = useState('');
  const linkedInvoice = workspace.invoices.find(
    (invoice) => invoice.sourceProposalId === proposal.id,
  );

  const createOrOpenInvoice = () => {
    setError('');
    const result = prepareProposalInvoice(
      proposal,
      workspace,
      issuedDate,
      createId,
      { defaultDueDays },
    );

    if (result.kind === 'existing') {
      openInvoice(result.invoice, result.invoice.status === 'Draft' ? 'edit' : 'view');
      return;
    }

    if (result.kind === 'missing-client') {
      setError(result.message);
      return;
    }

    setWorkspace((previous) => ({
      ...previous,
      invoices: [result.invoice, ...previous.invoices],
      clients: result.client
        ? [result.client, ...previous.clients]
        : previous.clients,
      proposals: previous.proposals.map((record: RecordItem) =>
        record.id === proposal.id
          ? { ...record, clientId: result.clientId }
          : record,
      ),
      leads:
        result.client && result.leadId
          ? previous.leads.map((record: RecordItem) =>
              record.id === result.leadId ? { ...record, stage: 'Won' } : record,
            )
          : previous.leads,
    }));
    openInvoice(result.invoice, 'edit');
    notify?.('Draft invoice created from the accepted proposal.');
  };

  return (
    <>
      <button
        className="button accent"
        onClick={createOrOpenInvoice}
        data-testid={`button-invoice-from-proposal-${proposal.id}`}
      >
        {linkedInvoice ? 'Open linked invoice' : 'Create draft invoice'}
      </button>
      {error && (
        <p role="alert" className="small-muted" data-testid="proposal-invoice-error">
          {error}
        </p>
      )}
    </>
  );
}
