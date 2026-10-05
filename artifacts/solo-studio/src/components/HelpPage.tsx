import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Download,
  FolderKanban,
  HelpCircle,
  Info,
  Mail,
  Search,
  ShieldCheck,
  Settings,
  Wallet,
  Users,
  type LucideIcon,
} from 'lucide-react';

type HelpSection = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  content: ReactNode;
};

type CalloutTone = 'info' | 'warning' | 'critical';

function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: CalloutTone;
  title: string;
  children: ReactNode;
}) {
  const Icon = tone === 'info' ? Info : AlertTriangle;

  return (
    <div className={`help-callout ${tone}`}>
      <Icon size={17} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function StatusLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="help-status-line">
      <span className="badge">{label}</span>
      <span>{children}</span>
    </div>
  );
}

const helpSections: HelpSection[] = [
  {
    id: 'overview',
    title: 'Start here',
    description: 'A quick map of Solo Studio and where your information lives',
    icon: BookOpen,
    content: (
      <div className="help-content">
        <p>
          <strong>Solo Studio</strong> brings client work, projects, money and
          follow-ups into one workspace for freelancers and small businesses.
          Use the navigation to move between Overview, Pipeline, Clients,
          Projects, Money and Settings. Help is available from the sidebar too.
        </p>
        <div className="help-content-grid">
          <div className="help-note">
            <h3>Private workspace</h3>
            <p>
              Your leads, clients, projects and financial records belong to your
              signed-in account. Other accounts using the same Remix have their
              own private workspace.
            </p>
          </div>
          <div className="help-note">
            <h3>Shared company identity</h3>
            <p>
              The public legal profile in Settings is separate from your
              workspace. It is shared by everyone using this Remix and appears
              on its public legal pages.
            </p>
          </div>
        </div>
        <h3>What you can do</h3>
        <ul>
          <li>Track leads and proposals, then turn accepted work into projects.</li>
          <li>Keep clients, tasks, time entries, invoices and expenses together.</li>
          <li>Optionally analyse a connected Gmail or Outlook mailbox for follow-ups.</li>
          <li>Personalise the studio, export records and back up your workspace.</li>
        </ul>
        <Callout tone="warning" title="You are starting with sample records">
          The starter workspace contains example leads, clients, invoices and
          other records. Replace them with your own details. Resetting starter
          data later replaces all changes in your account.
        </Callout>
      </div>
    ),
  },
  {
    id: 'dashboard',
    title: 'Overview and weekly dashboard',
    description: 'See the work that needs attention and how the week is going',
    icon: CalendarDays,
    content: (
      <div className="help-content">
        <p>
          <strong>Overview</strong> gives you a weekly view of deadlines,
          follow-ups and money due. The summary cards show paid invoices,
          outstanding invoices, active projects and this month’s expenses.
        </p>
        <h3>Check a day</h3>
        <ol>
          <li>Select a day in <strong>Week at a glance</strong>.</li>
          <li>Read <strong>Needs attention</strong> for overdue items and items due that day.</li>
          <li>Select <strong>Open</strong> beside an item to edit its record.</li>
        </ol>
        <p>
          Items without a date and overdue items stay visible when you change
          days. The list shows up to six of the most urgent items. Any others
          remain in their workspace section.
        </p>
        <div className="help-note">
          <h3>Time logged this week</h3>
          <p>
            The progress bar compares time entries with a 30-hour focus goal.
            This is a planning reference, not a billable-hours target.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'records',
    title: 'Create, find and update records',
    description: 'The same basic steps work across most lists',
    icon: Search,
    content: (
      <div className="help-content">
        <h3>Add a record</h3>
        <ol>
          <li>Open the relevant page from the sidebar.</li>
          <li>Select its <strong>Add</strong> or <strong>New</strong> button.</li>
          <li>Complete the fields. Fields marked with an asterisk are required.</li>
          <li>Select <strong>Create record</strong>. The new record appears in the list.</li>
        </ol>
        <h3>Find or change a record</h3>
        <ul>
          <li>Use the search box to find matching records on the current tab.</li>
          <li>Select <strong>View</strong> to read the details, then <strong>Edit</strong> to change them.</li>
          <li>Select <strong>Save changes</strong> to keep an edit, or <strong>Cancel</strong> to leave the form.</li>
          <li>Use a status selector in a table or Pipeline card when you only need to change a status.</li>
        </ul>
        <Callout tone="critical" title="Deleting cannot be undone">
          Select <strong>Delete</strong> only when you are sure. Solo Studio asks
          you to confirm before removing a record. Download a backup first if
          you may need the information later.
        </Callout>
      </div>
    ),
  },
  {
    id: 'pipeline',
    title: 'Pipeline: leads and proposals',
    description: 'Track conversations and move opportunities towards agreed work',
    icon: ArrowUpRight,
    content: (
      <div className="help-content">
        <p>
          Open <strong>Pipeline</strong>, then choose <strong>Leads</strong> or{' '}
          <strong>Proposals</strong>. Add a record from the page, search the
          current list, or change its stage on a card.
        </p>
        <div className="help-content-grid">
          <div className="help-note">
            <h3>Lead stages</h3>
            <p>New, Qualified, Proposal sent, Won and Lost.</p>
          </div>
          <div className="help-note">
            <h3>Proposal statuses</h3>
            <p>Draft, Sent, Accepted, Declined and Expired.</p>
          </div>
        </div>
        <h3>Move a card</h3>
        <ul>
          <li>Drag it to another column on a computer.</li>
          <li>On a touch screen, use the stage selector on the card.</li>
        </ul>
        <h3>Turn an opportunity into work</h3>
        <ol>
          <li>
            On a lead, select <strong>Convert to client + project</strong>. Solo
            Studio creates both records and marks the lead Won.
          </li>
          <li>
            On a proposal, select <strong>Accept &amp; create project</strong>.
            Link it to a lead or client first. Solo Studio creates the project
            and marks the proposal Accepted.
          </li>
          <li>
            Open an accepted proposal to create a linked draft invoice when you
            are ready.
          </li>
        </ol>
        <Callout tone="info" title="These actions organise your records">
          They do not send a proposal, publish anything or collect payment.
        </Callout>
      </div>
    ),
  },
  {
    id: 'clients',
    title: 'Clients',
    description: 'Keep contact details and related client work together',
    icon: Users,
    content: (
      <div className="help-content">
        <p>
          On <strong>Clients</strong>, add a contact name and any useful company,
          email, phone or notes. Select <strong>Create record</strong> to save
          the client.
        </p>
        <p>
          Use the tabs to switch between <strong>Clients</strong>,{' '}
          <strong>Proposals</strong> and <strong>Invoices</strong>. When adding
          a proposal or invoice, choose the client in its <strong>Client</strong>{' '}
          field to connect the records.
        </p>
        <p>
          Search works on the selected tab. Use <strong>View</strong> or{' '}
          <strong>Edit</strong> on a client row to read or update the details.
        </p>
      </div>
    ),
  },
  {
    id: 'projects',
    title: 'Projects, tasks and time',
    description: 'Plan client work and keep track of the time you spend',
    icon: FolderKanban,
    content: (
      <div className="help-content">
        <p>
          The <strong>Projects</strong> tab shows each project’s client, status,
          due date, budget, task progress and logged time. Open a project to
          view its details or edit its dates, budget and description.
        </p>
        <h3>Add tasks</h3>
        <ol>
          <li>Open the <strong>Tasks</strong> tab and select <strong>Add task</strong>.</li>
          <li>Choose a project, enter a task name, then set its due date and priority if useful.</li>
          <li>Select <strong>Create record</strong>. Use <strong>Mark done</strong> when the task is complete.</li>
        </ol>
        <h3>Log time</h3>
        <ol>
          <li>Open the <strong>Time entries</strong> tab and select <strong>Add time entry</strong>.</li>
          <li>Choose a project, then enter the date, minutes and an optional task or note.</li>
          <li>Select <strong>Create record</strong>. The entry appears in the project and weekly totals.</li>
        </ol>
        <div className="help-note">
          <h3>Project statuses</h3>
          <p>Planning, In progress, On hold, Completed and Archived.</p>
        </div>
        <Callout tone="info" title="Logging time does not create a charge">
          Your default hourly rate is a personal reference. Time entries are not
          automatically added to invoices.
        </Callout>
      </div>
    ),
  },
  {
    id: 'money',
    title: 'Money: invoices and expenses',
    description: 'Record what you expect to receive and what you spend',
    icon: Wallet,
    content: (
      <div className="help-content">
        <p>
          Open <strong>Money</strong> and switch between <strong>Invoices</strong>{' '}
          and <strong>Expenses</strong>. Use <strong>Add invoice</strong> or{' '}
          <strong>Add expense</strong> to create a record. Both lists have search
          and a CSV download button.
        </p>
        <h3>Invoice statuses</h3>
        <div className="help-status-list">
          <StatusLine label="Draft">Prepared, not yet marked as sent.</StatusLine>
          <StatusLine label="Sent">Recorded as sent, with payment still due.</StatusLine>
          <StatusLine label="Paid">Marked as paid in Solo Studio.</StatusLine>
          <StatusLine label="Overdue">Marked as overdue.</StatusLine>
          <StatusLine label="Void">Kept as a void invoice record.</StatusLine>
        </div>
        <p>
          You can change the status from the table. Selecting Paid there also
          records today as the paid date. You can edit the paid date in the
          invoice form.
        </p>
        <h3>Export and limits</h3>
        <p>
          <strong>Download invoices CSV</strong> or <strong>Download expenses CSV</strong>{' '}
          exports all records of that type, including records outside the
          current search. Open the file in Excel, Numbers or Google Sheets.
        </p>
        <Callout tone="warning" title="Invoices are records, not payment tools">
          Solo Studio does not send invoices, process payments or contact clients
          for you. Update payment status yourself after checking your records.
        </Callout>
      </div>
    ),
  },
  {
    id: 'settings',
    title: 'Settings, appearance and legal pages',
    description: 'Set up your studio and the company details shown publicly',
    icon: Settings,
    content: (
      <div className="help-content">
        <h3>Your business profile</h3>
        <p>
          In <strong>Settings</strong>, set your business name and default hourly
          rate, then select <strong>Save preferences</strong>. The rate is for
          your reference when logging work. It does not create invoice charges.
        </p>
        <h3>Choose an appearance</h3>
        <p>
          Select one of the four colour themes, then choose a font pairing.
          Your choice applies across the studio and is saved to your account.
        </p>
        <h3>Company identity for public legal pages</h3>
        <p>
          Complete the registered name, trading name, country, registered
          address, privacy contact email and website, then select{' '}
          <strong>Save company identity</strong>. These details are shared across
          this Remix and are separate from private workspace records.
        </p>
        <Callout tone="info" title="The first account to save becomes the profile manager">
          Other accounts using the same Remix can view the saved company
          identity, but only its manager can change it.
        </Callout>
        <Callout tone="warning" title="Review legal templates before use">
          Open the Privacy, Cookies and Terms links in Settings and check them
          for your business and country. They are templates, not legal advice.
        </Callout>
      </div>
    ),
  },
  {
    id: 'mailbox',
    title: 'Mailbox insights: Gmail and Outlook',
    description: 'Optionally find contacts and conversations that may need a follow-up',
    icon: Mail,
    content: (
      <div className="help-content">
        <h3>Connect a mailbox</h3>
        <ol>
          <li>In <strong>Settings</strong>, find <strong>Mailbox insights</strong>.</li>
          <li>
            If the provider says <strong>Setup needed</strong>, the person
            running the Remix must complete its one-time setup. Expand{' '}
            <strong>Show the Gmail setup steps</strong> or{' '}
            <strong>Show the Outlook setup steps</strong> there, then use{' '}
            <strong>Check setup</strong>.
          </li>
          <li>Select <strong>Connect Gmail</strong> or <strong>Connect Outlook</strong> and authorise read-only access to your mailbox.</li>
        </ol>
        <h3>Review possible follow-ups</h3>
        <ol>
          <li>Select <strong>Analyse whole mailbox</strong>. You can stop an analysis while it is running.</li>
          <li>Review the suggested contacts and conversation signals.</li>
          <li>Select <strong>Add as lead</strong> only for a contact you want to keep in your workspace.</li>
        </ol>
        <p>
          Suggested contacts are not saved unless you add them. An added lead
          includes its contact details and a short note with selected
          conversation details.
        </p>
        <Callout tone="warning" title="Mailbox access is read-only">
          Message content is analysed in memory and is not saved. Disconnecting
          removes Solo Studio’s saved access token. To revoke provider consent
          too, remove Solo Studio from your Google or Microsoft account’s
          connected apps.
        </Callout>
        <Callout tone="critical" title="Keep credentials in Replit Secrets">
          The Remix maintainer should enter provider credentials in Replit
          Secrets, not in Solo Studio or this guide. Each person connects their
          own mailbox.
        </Callout>
      </div>
    ),
  },
  {
    id: 'privacy-and-saving',
    title: 'Privacy, saving and changes in another tab',
    description: 'Understand where your records go and what the save notices mean',
    icon: ShieldCheck,
    content: (
      <div className="help-content">
        <p>
          Your records are saved to the account you signed in with and are kept
          separate from other accounts. The top bar shows the current save
          state.
        </p>
        <div className="help-status-list">
          <StatusLine label="Saving to your account">A recent change is being saved.</StatusLine>
          <StatusLine label="Saved to your account">The latest change has been saved.</StatusLine>
          <StatusLine label="Changes not saved">Check your connection and select <strong>Retry save</strong>.</StatusLine>
          <StatusLine label="Another tab saved newer changes">This tab is behind and needs a merge or refresh.</StatusLine>
        </div>
        <h3>Resolve a newer-change warning</h3>
        <ol>
          <li>Select <strong>Merge my changes</strong> to combine edits that do not overlap.</li>
          <li>
            If a merge cannot be completed, select <strong>Download unsaved changes</strong>{' '}
            before choosing <strong>Load latest version</strong>.
          </li>
          <li>Re-enter any edits you still need after loading the latest workspace.</li>
        </ol>
        <Callout tone="warning" title="Loading the latest version replaces this tab’s unsaved view">
          Download your unsaved changes first if you are not sure which version
          to keep.
        </Callout>
      </div>
    ),
  },
  {
    id: 'backups',
    title: 'Back up, restore or reset your workspace',
    description: 'Keep a copy of your work before replacing records',
    icon: Download,
    content: (
      <div className="help-content">
        <h3>Download a backup</h3>
        <ol>
          <li>Open <strong>Settings</strong> and find <strong>Your data</strong>.</li>
          <li>Select <strong>Download a backup</strong> and keep the JSON file somewhere safe.</li>
        </ol>
        <h3>Restore a backup</h3>
        <ol>
          <li>Select <strong>Choose backup file</strong> and pick a Solo Studio JSON backup.</li>
          <li>Check the file name, export date and record count in the preview.</li>
          <li>Select <strong>Restore this backup</strong> only when you are ready to replace the current workspace.</li>
        </ol>
        <Callout tone="critical" title="Restore replaces this account’s entire workspace">
          It cannot be undone. Download a fresh backup first if you may need the
          current records. Files over 10 MB are not accepted.
        </Callout>
        <Callout tone="critical" title="Reset starter data also replaces your changes">
          <strong>Reset starter data</strong> restores the original example
          workspace for your account. It does not merge with your current
          records. Download a backup before using it.
        </Callout>
      </div>
    ),
  },
  {
    id: 'remix',
    title: 'Set up your own Remix',
    description: 'What to check when you create a separate copy in Replit',
    icon: BriefcaseBusiness,
    content: (
      <div className="help-content">
        <p>
          Choose <strong>Remix this App</strong> on the Replit project page to
          create a separate copy. Your Remix has its own database and sign-in
          setup. Changes in it do not change the original app.
        </p>
        <h3>Before you use it for your business</h3>
        <ol>
          <li>Replace the sample records with your own leads, clients and work.</li>
          <li>Set your business name and default hourly rate in Settings.</li>
          <li>Enter and review the company identity used by the public legal pages.</li>
          <li>Change the logo or app name in code if you are rebranding.</li>
          <li>Set up Gmail or Outlook only if you want mailbox insights.</li>
        </ol>
        <Callout tone="warning" title="Check local requirements">
          Solo Studio uses pounds sterling and UK date formatting. If your
          business operates elsewhere, adapt currency, date display and legal
          wording before relying on the app.
        </Callout>
      </div>
    ),
  },
];

function HelpSectionCard({
  section,
  isOpen,
  onToggle,
}: {
  section: HelpSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  const triggerId = `help-trigger-${section.id}`;
  const panelId = `help-panel-${section.id}`;
  const descriptionId = `help-description-${section.id}`;

  return (
    <article className="card help-section">
      <h2 className="help-section-heading">
        <button
          id={triggerId}
          type="button"
          className="help-section-trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-describedby={descriptionId}
          onClick={onToggle}
          data-testid={`help-trigger-${section.id}`}
        >
          <span className="help-section-icon" aria-hidden="true">
            <Icon size={19} />
          </span>
          <span className="help-section-copy">
            <span className="help-section-title">{section.title}</span>
            <span id={descriptionId} className="help-section-description">
              {section.description}
            </span>
          </span>
          <ChevronDown
            className={`help-section-chevron ${isOpen ? 'open' : ''}`}
            size={18}
            aria-hidden="true"
          />
        </button>
      </h2>
      <div
        id={panelId}
        className="help-section-panel"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        data-testid={`help-panel-${section.id}`}
      >
        <div className="help-section-content">{section.content}</div>
      </div>
    </article>
  );
}

export default function HelpPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(['overview']),
  );

  const toggleSection = (id: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="page help-page">
      <div className="page-heading help-heading">
        <div>
          <div className="eyebrow">A hand with the day-to-day</div>
          <h1>Help &amp; User Guide</h1>
          <p className="subtitle">
            Clear steps for using Solo Studio, from your first lead to a full
            workspace backup.
          </p>
        </div>
        <div className="help-heading-mark" aria-hidden="true">
          <HelpCircle size={23} />
        </div>
      </div>

      <div className="help-toolbar">
        <p className="small-muted">
          {helpSections.length} short guides. Open the sections you need.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button small"
            onClick={() =>
              setOpenSections(new Set(helpSections.map((section) => section.id)))
            }
            data-testid="button-help-expand-all"
          >
            Expand all
          </button>
          <button
            type="button"
            className="button small"
            onClick={() => setOpenSections(new Set())}
            data-testid="button-help-collapse-all"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="help-section-list">
        {helpSections.map((section) => (
          <HelpSectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      <footer className="card help-footer">
        <span className="help-footer-icon" aria-hidden="true">
          <CircleHelp size={18} />
        </span>
        <div>
          <strong>Still stuck?</strong>
          <p>
            For mailbox setup, return to Settings and use the provider’s{' '}
            <strong>Check setup</strong> button. If the workspace will not save,
            check the notice in the top bar before leaving the page.
          </p>
        </div>
      </footer>
    </section>
  );
}
