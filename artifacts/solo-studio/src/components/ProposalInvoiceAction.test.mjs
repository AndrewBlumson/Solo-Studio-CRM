import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { buildRecordOutput } from '../lib/proposal-invoice.ts';

const browser = new Window({ url: 'http://localhost/' });
Object.defineProperties(globalThis, {
  window: { configurable: true, value: browser },
  document: { configurable: true, value: browser.document },
  navigator: { configurable: true, value: browser.navigator },
  HTMLElement: { configurable: true, value: browser.HTMLElement },
  Node: { configurable: true, value: browser.Node },
  Event: { configurable: true, value: browser.Event },
  MouseEvent: { configurable: true, value: browser.MouseEvent },
  getComputedStyle: {
    configurable: true,
    value: browser.getComputedStyle.bind(browser),
  },
  IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
});

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  plugins: [react()],
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
const { ProposalInvoiceAction } = await vite.ssrLoadModule(
  '/src/components/ProposalInvoiceAction.tsx',
);

let root;
let container;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  if (root) {
    await React.act(async () => root.unmount());
    root = undefined;
  }
  container?.remove();
});

after(async () => {
  await vite.close();
  await browser.happyDOM.abort();
});

const proposal = {
  id: 'proposal-1',
  title: 'Brand and website',
  status: 'Accepted',
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
  proposals: [proposal],
});

async function renderAction(props) {
  await React.act(async () => {
    root.render(React.createElement(ProposalInvoiceAction, props));
  });
}

async function clickAction() {
  const button = container.querySelector(
    '[data-testid="button-invoice-from-proposal-proposal-1"]',
  );
  assert.ok(button, 'the accepted proposal invoice action is visible');
  await React.act(async () => {
    button.dispatchEvent(new browser.MouseEvent('click', { bubbles: true }));
  });
}

test('the accepted proposal screen opens one draft for editing and preserves its proposal link', async () => {
  let workspace = baseWorkspace();
  let opened;
  let generatedIds = 0;
  const props = {
    proposal,
    workspace,
    setWorkspace: (update) => {
      workspace = update(workspace);
    },
    openInvoice: (invoice, mode) => {
      opened = { invoice, mode };
    },
    issuedDate: '2026-10-05',
    createId: () => {
      generatedIds += 1;
      return 'invoice-from-proposal';
    },
  };

  await renderAction(props);
  assert.equal(
    container.querySelector('button').textContent,
    'Create draft invoice',
  );
  await clickAction();

  assert.equal(opened.mode, 'edit');
  assert.equal(opened.invoice.status, 'Draft');
  assert.equal(opened.invoice.sourceProposalId, proposal.id);
  assert.equal(workspace.invoices.length, 3);
  assert.equal(workspace.invoices[0].id, opened.invoice.id);

  await renderAction({ ...props, workspace });
  assert.equal(
    container.querySelector('button').textContent,
    'Open linked invoice',
  );
  await clickAction();

  assert.equal(opened.mode, 'edit');
  assert.equal(opened.invoice.id, 'invoice-from-proposal');
  assert.equal(workspace.invoices.length, 3);
  assert.equal(generatedIds, 1, 'reopening the draft does not create an invoice');

  const edited = buildRecordOutput(
    'invoices',
    opened.invoice,
    { number: 'SS-105', amountPence: 300000, status: 'Draft' },
    () => assert.fail('Editing an invoice must keep its id'),
  );
  assert.equal(edited.sourceProposalId, proposal.id);
  assert.equal(edited.amountPence, 300000);
});

test('an unusable client and lead show an error without adding workspace records', async () => {
  const invalidProposal = {
    ...proposal,
    clientId: 'deleted-client',
    leadId: 'lead-without-name',
  };
  const workspace = {
    invoices: [],
    clients: [],
    leads: [{ id: 'lead-without-name', name: '   ' }],
    proposals: [invalidProposal],
  };
  const originalWorkspace = structuredClone(workspace);

  await renderAction({
    proposal: invalidProposal,
    workspace,
    setWorkspace: () => assert.fail('Invalid proposals must not change the workspace'),
    openInvoice: () => assert.fail('Invalid proposals must not open an invoice'),
    issuedDate: '2026-10-05',
    createId: () => assert.fail('Invalid proposals must not generate record ids'),
  });
  await clickAction();

  assert.equal(
    container.querySelector('[role="alert"]')?.textContent,
    'Link this proposal to a client or lead before drafting an invoice.',
  );
  assert.deepEqual(workspace, originalWorkspace);
});
