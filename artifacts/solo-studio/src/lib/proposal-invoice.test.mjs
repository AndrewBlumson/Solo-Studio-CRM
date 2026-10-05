import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRecordOutput,
  prepareProposalInvoice,
} from './proposal-invoice.ts';

const proposal = {
  id: 'proposal-1',
  title: 'Brand and website',
  clientId: 'client-1',
  leadId: '',
  amountPence: 287500,
};

const baseWorkspace = () => ({
  invoices: [
    { id: 'invoice-104', number: 'SS-104', clientId: 'client-1' },
    { id: 'invoice-103', number: 'SS-103', clientId: 'client-1' },
  ],
  clients: [{ id: 'client-1', name: 'Alex Morgan' }],
  leads: [],
});

test('creates one correctly linked draft using the next invoice number', () => {
  const workspace = baseWorkspace();
  const result = prepareProposalInvoice(
    proposal,
    workspace,
    '2026-10-05',
    () => 'new-id',
  );

  assert.equal(result.kind, 'created');
  assert.deepEqual(result.invoice, {
    id: 'new-id',
    number: 'SS-105',
    clientId: 'client-1',
    projectId: '',
    amountPence: 287500,
    issuedDate: '2026-10-05',
    dueDate: '',
    status: 'Draft',
    paidDate: '',
    sourceProposalId: 'proposal-1',
  });
  assert.equal(workspace.invoices.length, 2, 'planning a draft does not mutate the workspace');
});

test('repeating the action returns the same invoice and editing keeps its proposal link', () => {
  const workspace = baseWorkspace();
  const first = prepareProposalInvoice(
    proposal,
    workspace,
    '2026-10-05',
    () => 'invoice-from-proposal',
  );
  assert.equal(first.kind, 'created');

  const savedWorkspace = {
    ...workspace,
    invoices: [first.invoice, ...workspace.invoices],
  };
  const repeated = prepareProposalInvoice(
    proposal,
    savedWorkspace,
    '2026-10-05',
    () => assert.fail('A repeated action must not generate another invoice'),
  );
  assert.equal(repeated.kind, 'existing');
  assert.equal(repeated.invoice, first.invoice);

  const edited = buildRecordOutput(
    'invoices',
    repeated.invoice,
    { number: 'SS-105', amountPence: 300000, status: 'Draft' },
    () => assert.fail('Editing an invoice must keep its id'),
  );
  assert.equal(edited.id, first.invoice.id);
  assert.equal(edited.sourceProposalId, proposal.id);
  assert.equal(edited.amountPence, 300000);
});

test('editing a record keeps its creation date and other stored metadata', () => {
  const saved = buildRecordOutput(
    'clients',
    {
      id: 'client-a',
      name: 'Alex Morgan',
      createdAt: '2026-10-05',
      importedFrom: 'legacy backup',
    },
    { name: 'Alex Morgan', notes: 'Updated notes' },
    () => assert.fail('Editing must keep the existing record id'),
  );

  assert.equal(saved.id, 'client-a');
  assert.equal(saved.createdAt, '2026-10-05');
  assert.equal(saved.importedFrom, 'legacy backup');
});

test('reports a missing usable client or lead without creating a partial invoice', () => {
  const workspace = {
    invoices: [],
    clients: [],
    leads: [{ id: 'lead-1', name: '   ' }],
  };
  const result = prepareProposalInvoice(
    { ...proposal, clientId: 'missing-client', leadId: 'lead-1' },
    workspace,
    '2026-10-05',
    () => assert.fail('No identifiers should be generated without a usable client'),
  );

  assert.deepEqual(result, {
    kind: 'missing-client',
    message: 'Link this proposal to a client or lead before drafting an invoice.',
  });
  assert.deepEqual(workspace, {
    invoices: [],
    clients: [],
    leads: [{ id: 'lead-1', name: '   ' }],
  });
});
