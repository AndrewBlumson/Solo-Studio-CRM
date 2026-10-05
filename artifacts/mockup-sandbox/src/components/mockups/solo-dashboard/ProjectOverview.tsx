import { Activity, ArrowRight, ArrowUpRight, BookOpen, Check, CheckSquare, FileText, FolderKanban, LayoutDashboard, Plus, Settings as SettingsIcon, Users, Wallet } from "lucide-react";
import brandMarkUrl from "@/assets/solo-studio-mark.png";
import { dashboardMetrics, demoClientName, demoDate, demoMoney, demoStore, monthPrefix, today } from "./dashboard-data";
import "./_group.css";

const navigation = [
  { path: "/user-portal", label: "Overview", icon: LayoutDashboard },
  { path: "/pipeline", label: "Pipeline", icon: ArrowUpRight },
  { path: "/clients", label: "Clients", icon: Users },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/money", label: "Money", icon: Wallet },
  { path: "/buildbook", label: "Buildbook", icon: BookOpen },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

function keepPreviewLocal(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

const activeProject = demoStore.projects.find((project) => project.status === "In progress")!;
const completedProject = demoStore.projects.find((project) => project.status === "Completed")!;
const activeTasks = demoStore.tasks.filter((task) => task.projectId === activeProject.id && !task.completed);
const completedTasks = demoStore.tasks.filter((task) => task.projectId === completedProject.id && task.completed);
const { collected, outstanding, expenses } = dashboardMetrics;
const greeting = today.getHours() < 12 ? "morning" : today.getHours() < 18 ? "afternoon" : "evening";
const activeInvoices = demoStore.invoices.filter((invoice) => ["Sent", "Overdue"].includes(invoice.status));
const paidInvoices = demoStore.invoices.filter((invoice) => invoice.status === "Paid");

export function ProjectOverview() {
  return (
    <div className="dashboard-mockup project-overview">
      <style>{`
        .project-overview { --po-paper: #f3f0e7; --po-card: #fbfaf5; --po-line: #ddd8ca; --po-ink: #253d36; --po-muted: #727a70; --po-green: #24453b; --po-green-soft: #e7ede5; --po-clay: #bd6948; --po-sand: #e9dfce; overflow-x: hidden; }
        .project-overview .app-shell { background: var(--po-paper); }
        .project-overview .po-page { max-width: 1440px; margin: 0 auto; padding: 34px clamp(20px, 4vw, 56px) 64px; animation: arrive .35s ease both; }
        .project-overview .po-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 27px; }
        .project-overview .po-heading .eyebrow { margin-bottom: 10px; }
        .project-overview .po-heading h1 { font-size: clamp(32px, 4vw, 43px); }
        .project-overview .po-subtitle { margin: 9px 0 0; color: hsl(var(--muted-foreground)); font-size: 13px; }
        .project-overview .po-intro-note { display: flex; align-items: center; gap: 10px; margin: 0 0 21px; padding: 11px 14px; border: 1px solid #e4d4c2; border-radius: 11px; background: #f2e8dc; }
        .project-overview .po-intro-note .activity-mark { width: 28px; height: 28px; background: var(--po-clay); color: #fffaf1; }
        .project-overview .po-intro-note .row-title { color: var(--po-ink); }
        .project-overview .po-intro-note .row-sub { line-height: 1.45; }
        .project-overview .po-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 13px; }
        .project-overview .po-section-head h2 { margin: 0; font: 500 24px/1.1 var(--app-font-serif); letter-spacing: -.45px; color: var(--po-ink); }
        .project-overview .po-section-head .eyebrow { margin-bottom: 7px; }
        .project-overview .po-section-date { color: var(--po-muted); font: 500 10px var(--app-font-mono); white-space: nowrap; }
        .project-overview .po-project-layout { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(250px, .8fr); gap: 14px; align-items: stretch; }
        .project-overview .po-active-project { position: relative; min-width: 0; overflow: hidden; padding: clamp(20px, 2.5vw, 31px); border: 1px solid #284d40; border-radius: 17px; background: var(--po-green); color: #f5f1e7; box-shadow: 0 10px 24px hsl(165 24% 20% / .12); }
        .project-overview .po-active-project::after { position: absolute; right: -78px; bottom: -135px; width: 290px; height: 290px; border: 1px solid #ffffff18; border-radius: 50%; box-shadow: 0 0 0 25px #ffffff08, 0 0 0 52px #ffffff06; content: ""; pointer-events: none; }
        .project-overview .po-active-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
        .project-overview .po-index { color: #d9b69e; font: 500 10px var(--app-font-mono); letter-spacing: 1.2px; text-transform: uppercase; }
        .project-overview .po-status { padding: 6px 9px; border: 1px solid #ffffff3b; border-radius: 99px; color: #f4eee3; font: 500 9px var(--app-font-mono); }
        .project-overview .po-project-name { position: relative; z-index: 1; max-width: 650px; margin: 0; color: #fff9ef; font: 500 clamp(27px, 3.3vw, 39px)/1.08 var(--app-font-serif); letter-spacing: -.9px; }
        .project-overview .po-client { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; margin-top: 12px; color: #d8e1d8; font-size: 12px; }
        .project-overview .po-client-mark { display: grid; width: 24px; height: 24px; place-items: center; border: 1px solid #ffffff4a; border-radius: 50%; color: #f5c6a8; font: 500 10px var(--app-font-mono); }
        .project-overview .po-description { position: relative; z-index: 1; max-width: 540px; margin: 19px 0 24px; color: #d7e0d8; font-size: 13px; line-height: 1.65; }
        .project-overview .po-project-foot { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 9px 24px; padding-top: 17px; border-top: 1px solid #ffffff28; }
        .project-overview .po-foot-label { display: block; margin-bottom: 5px; color: #bdcfc2; font: 500 9px var(--app-font-mono); letter-spacing: .8px; text-transform: uppercase; }
        .project-overview .po-foot-value { color: #fff9ef; font-size: 12px; font-weight: 600; }
        .project-overview .po-tasks { min-width: 0; padding: 20px 19px; border: 1px solid var(--po-line); border-radius: 17px; background: var(--po-card); }
        .project-overview .po-tasks-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 13px; border-bottom: 1px solid var(--po-line); }
        .project-overview .po-tasks-header h3 { margin: 0; color: var(--po-ink); font: 500 18px var(--app-font-serif); }
        .project-overview .po-task-count { color: var(--po-clay); font: 500 10px var(--app-font-mono); }
        .project-overview .po-task { display: grid; grid-template-columns: 24px minmax(0,1fr); gap: 10px; padding: 14px 0; border-bottom: 1px solid #e9e5dc; }
        .project-overview .po-task:last-child { padding-bottom: 1px; border-bottom: 0; }
        .project-overview .po-task-icon { display: grid; width: 23px; height: 23px; place-items: center; border: 1px solid #d5cdbd; border-radius: 7px; color: var(--po-green); }
        .project-overview .po-task-title { color: var(--po-ink); font-size: 11px; font-weight: 600; line-height: 1.4; }
        .project-overview .po-task-detail { display: flex; flex-wrap: wrap; gap: 6px 9px; margin-top: 5px; color: var(--po-muted); font-size: 10px; }
        .project-overview .po-priority { color: var(--po-clay); font-weight: 600; }
        .project-overview .po-completed { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 15px; margin-top: 15px; padding: 15px 18px; border: 1px solid #d6ded3; border-radius: 13px; background: #e9eee6; }
        .project-overview .po-completed-main { display: flex; min-width: 0; align-items: center; gap: 13px; }
        .project-overview .po-completed-mark { display: grid; width: 35px; height: 35px; flex: none; place-items: center; border-radius: 11px; background: #d7e3d5; color: #456d4b; }
        .project-overview .po-completed .eyebrow { margin-bottom: 4px; color: #66816a; font-size: 9px; }
        .project-overview .po-completed-title { color: var(--po-ink); font: 500 17px var(--app-font-serif); }
        .project-overview .po-completed-client { margin-top: 3px; color: var(--po-muted); font-size: 10px; }
        .project-overview .po-completed-description { margin-top: 7px; color: #66736b; font-size: 10px; line-height: 1.45; }
        .project-overview .po-completed-meta { text-align: right; }
        .project-overview .po-completed-meta .po-status { display: inline-block; border-color: #c1d1bf; color: #526b54; }
        .project-overview .po-completed-date { margin-top: 6px; color: var(--po-muted); font: 10px var(--app-font-mono); }
        .project-overview .po-lower { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(230px, .72fr); gap: 14px; margin-top: 23px; }
        .project-overview .po-money-panel, .project-overview .po-pipeline-panel { min-width: 0; padding: 19px; border: 1px solid var(--po-line); border-radius: 15px; background: var(--po-card); }
        .project-overview .po-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .project-overview .po-panel-head h2 { margin: 0; color: var(--po-ink); font: 500 19px var(--app-font-serif); }
        .project-overview .po-finance-metrics { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); border-top: 1px solid var(--po-line); border-bottom: 1px solid var(--po-line); }
        .project-overview .po-finance-metric { min-width: 0; padding: 13px 11px 14px 0; }
        .project-overview .po-finance-metric + .po-finance-metric { padding-left: 14px; border-left: 1px solid var(--po-line); }
        .project-overview .po-finance-label { color: var(--po-muted); font: 500 9px var(--app-font-mono); letter-spacing: .5px; text-transform: uppercase; }
        .project-overview .po-finance-value { margin-top: 7px; color: var(--po-ink); font: 500 clamp(16px, 1.8vw, 21px) var(--app-font-serif); white-space: nowrap; }
        .project-overview .po-finance-note { margin-top: 3px; color: var(--po-muted); font-size: 9px; line-height: 1.4; }
        .project-overview .po-invoice-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 0 18px; }
        .project-overview .po-invoice { display: flex; min-width: 0; align-items: center; gap: 9px; padding-top: 12px; }
        .project-overview .po-invoice-mark { display: grid; width: 28px; height: 28px; flex: none; place-items: center; border-radius: 8px; background: #f0e6d8; color: #8c6048; }
        .project-overview .po-invoice-main { min-width: 0; flex: 1; }
        .project-overview .po-invoice-title { overflow: hidden; color: var(--po-ink); text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 600; }
        .project-overview .po-invoice-sub { margin-top: 3px; color: var(--po-muted); font-size: 9px; }
        .project-overview .po-invoice-amount { color: var(--po-ink); white-space: nowrap; font: 500 10px var(--app-font-mono); }
        .project-overview .po-pipeline-panel { display: flex; flex-direction: column; justify-content: space-between; background: #eee5d7; border-color: #ded2c0; }
        .project-overview .po-pipeline-count { display: flex; align-items: baseline; gap: 8px; margin: 9px 0 4px; color: var(--po-green); font: 500 34px var(--app-font-serif); }
        .project-overview .po-pipeline-count span { color: var(--po-muted); font: 11px var(--app-font-sans); }
        .project-overview .po-pipeline-copy { margin: 0 0 15px; color: #66736b; font-size: 11px; line-height: 1.5; }
        .project-overview .po-nav-link:focus-visible, .project-overview a:focus-visible { outline: 3px solid hsl(var(--sidebar-primary)); outline-offset: 3px; border-radius: 5px; }
        @media (max-width: 950px) {
          .project-overview .po-project-layout { grid-template-columns: minmax(0, 1.25fr) minmax(220px, .8fr); }
          .project-overview .po-lower { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .project-overview .po-page { padding: 25px 17px 42px; }
          .project-overview .po-heading { align-items: flex-start; flex-direction: column; gap: 17px; margin-bottom: 22px; }
          .project-overview .po-heading > .button { width: 100%; justify-content: center; }
          .project-overview .po-intro-note { align-items: flex-start; padding: 11px; }
          .project-overview .po-section-head { align-items: flex-start; flex-direction: column; gap: 6px; }
          .project-overview .po-project-layout { grid-template-columns: 1fr; }
          .project-overview .po-active-project { padding: 21px 19px; }
          .project-overview .po-description { margin: 16px 0 20px; }
          .project-overview .po-tasks { padding: 17px; }
          .project-overview .po-completed { grid-template-columns: 1fr; gap: 10px; }
          .project-overview .po-completed-meta { display: flex; align-items: center; justify-content: space-between; text-align: left; }
          .project-overview .po-completed-date { margin-top: 0; }
          .project-overview .po-lower { margin-top: 19px; }
          .project-overview .po-finance-metric { padding-right: 5px; }
          .project-overview .po-finance-metric + .po-finance-metric { padding-left: 8px; }
          .project-overview .po-finance-label { font-size: 8px; letter-spacing: 0; }
          .project-overview .po-finance-value { font-size: clamp(15px, 4.4vw, 19px); }
          .project-overview .po-invoice-list { grid-template-columns: 1fr; }
        }
        @media (max-width: 390px) {
          .project-overview .po-finance-value { font-size: 14px; }
          .project-overview .po-money-panel { padding: 15px 13px; }
        }
      `}</style>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <img className="brand-image" src={brandMarkUrl} alt="" />
            <span>solo studio</span>
          </div>
          <div className="nav-label">Your workspace</div>
          <nav className="studio-nav" aria-label="Workspace navigation">
            {navigation.map(({ path, label, icon: Icon }) => (
              <a key={path} href={path} onClick={keepPreviewLocal} className={`nav-link po-nav-link ${path === "/user-portal" ? "active" : ""}`} aria-current={path === "/user-portal" ? "page" : undefined}>
                <Icon className="nav-icon" aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="side-foot">
            <strong>Fieldnotes Studio</strong>
            One desk. All the moving parts.
            <br />
            Private to your account.
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <span className="crumb">Studio / Overview</span>
            <div className="account-actions">
              <span className="save-pill" aria-live="polite"><i className="save-dot" aria-hidden="true" />Saved to your account</span>
              <span className="account-name">Your account</span>
              <button className="button small" type="button">Sign out</button>
            </div>
          </header>

          <section className="po-page">
            <div className="po-heading">
              <div>
                <div className="eyebrow">This week · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(today)}</div>
                <h1>Good {greeting}.</h1>
                <p className="po-subtitle">Your client work, and what comes next.</p>
              </div>
              <a className="button primary" href="/pipeline" onClick={keepPreviewLocal}><Plus size={15} aria-hidden="true" />Add a lead</a>
            </div>

            <div className="po-intro-note" data-testid="notice-demo-first-run">
              <div className="activity-mark"><BookOpen size={14} aria-hidden="true" /></div>
              <div className="row-main">
                <div className="row-title">Your private starter workspace is ready</div>
                <div className="row-sub">Sample leads, client work, invoices and a finished case study are ready to explore. Changes are saved to your account only.</div>
              </div>
            </div>

            <div className="po-section-head">
              <div>
                <div className="eyebrow">Client work · {dashboardMetrics.activeProjects} active project · {dashboardMetrics.openTasks} open tasks</div>
                <h2>Projects on your desk</h2>
              </div>
              <a href="/projects" onClick={keepPreviewLocal} className="button small ghost">All projects <ArrowRight size={13} aria-hidden="true" /></a>
            </div>

            <div className="po-project-layout">
              <article className="po-active-project" aria-labelledby="project-north-title">
                <div className="po-active-top">
                  <span className="po-index">Current engagement</span>
                  <span className="po-status">{activeProject.status}</span>
                </div>
                <h3 className="po-project-name" id="project-north-title">{activeProject.title}</h3>
                <div className="po-client"><span className="po-client-mark" aria-hidden="true">N</span><span>{demoClientName(activeProject.clientId)}</span><span aria-hidden="true">·</span><span>{demoStore.clients.find((client) => client.id === activeProject.clientId)?.name}</span></div>
                <p className="po-description">{activeProject.description}</p>
                <div className="po-project-foot">
                  <div><span className="po-foot-label">Due date</span><span className="po-foot-value">{demoDate(activeProject.dueDate)}</span></div>
                  <div><span className="po-foot-label">Open tasks</span><span className="po-foot-value">{activeTasks.length} to move forward</span></div>
                  <div><span className="po-foot-label">Project budget</span><span className="po-foot-value">{demoMoney(activeProject.budgetPence)}</span></div>
                </div>
              </article>

              <section className="po-tasks" aria-labelledby="north-tasks-heading">
                <div className="po-tasks-header">
                  <h3 id="north-tasks-heading">Next up</h3>
                  <span className="po-task-count">{activeTasks.length} open tasks</span>
                </div>
                {activeTasks.map((task) => (
                  <div className="po-task" key={task.id}>
                    <span className="po-task-icon" aria-hidden="true"><CheckSquare size={13} /></span>
                    <div>
                      <div className="po-task-title">{task.title}</div>
                      <div className="po-task-detail"><span>Due {demoDate(task.dueDate)}</span><span className="po-priority">{task.priority} priority</span></div>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <article className="po-completed" aria-label={`Completed project: ${completedProject.title}`}>
              <div className="po-completed-main">
                <span className="po-completed-mark"><Check size={17} aria-hidden="true" /></span>
                <div className="row-main">
                  <div className="eyebrow">Finished work</div>
                  <div className="po-completed-title">{completedProject.title}</div>
                  <div className="po-completed-client">{demoClientName(completedProject.clientId)} · {demoStore.clients.find((client) => client.id === completedProject.clientId)?.name}</div>
                  <div className="po-completed-description">{completedProject.description}</div>
                  {completedTasks.map((task) => <div className="po-completed-client" key={task.id}>Completed: {task.title} · {demoDate(task.dueDate)}</div>)}
                </div>
              </div>
              <div className="po-completed-meta">
                <span className="po-status">{completedProject.status}</span>
                <div className="po-completed-date">Due {demoDate(completedProject.dueDate)}</div>
              </div>
            </article>

            <div className="po-lower">
              <section className="po-money-panel" aria-labelledby="money-heading">
                <div className="po-panel-head">
                  <div><div className="eyebrow">Supporting context</div><h2 id="money-heading">Money in motion</h2></div>
                  <a href="/money" onClick={keepPreviewLocal} className="button small ghost">View money <ArrowRight size={13} aria-hidden="true" /></a>
                </div>
                <div className="po-finance-metrics">
                  <div className="po-finance-metric"><div className="po-finance-label">Collected</div><div className="po-finance-value">{demoMoney(collected)}</div><div className="po-finance-note">Paid invoices, all time</div></div>
                  <div className="po-finance-metric"><div className="po-finance-label">To come in</div><div className="po-finance-value">{demoMoney(outstanding)}</div><div className="po-finance-note">{activeInvoices.length} {activeInvoices.length === 1 ? "invoice" : "invoices"} awaiting payment</div></div>
                  <div className="po-finance-metric"><div className="po-finance-label">Studio outgoings</div><div className="po-finance-value">{demoMoney(expenses)}</div><div className="po-finance-note">Expenses this month</div></div>
                </div>
                <div className="po-invoice-list" aria-label="Invoice activity">
                  {[...activeInvoices, ...paidInvoices].map((invoice) => (
                    <div className="po-invoice" key={invoice.id}>
                      <span className="po-invoice-mark"><FileText size={14} aria-hidden="true" /></span>
                      <div className="po-invoice-main">
                        <div className="po-invoice-title">{invoice.number} · {demoClientName(invoice.clientId)}</div>
                        <div className="po-invoice-sub">{invoice.status === "Paid" ? `Paid ${demoDate(invoice.paidDate)}` : `Due ${demoDate(invoice.dueDate)}`} · {invoice.status}</div>
                      </div>
                      <span className="po-invoice-amount">{demoMoney(invoice.amountPence)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="po-pipeline-panel" aria-labelledby="pipeline-heading">
                <div>
                  <div className="eyebrow">On the horizon</div>
                  <div className="po-panel-head" style={{ marginBottom: 0 }}><h2 id="pipeline-heading">Pipeline</h2><Activity size={17} aria-hidden="true" color="hsl(var(--accent))" /></div>
                  <div className="po-pipeline-count">{dashboardMetrics.pipelineConversations}<span>conversations</span></div>
                  <p className="po-pipeline-copy">Live leads, alongside the client work already underway.</p>
                </div>
                <a href="/pipeline" onClick={keepPreviewLocal} className="button small">Review pipeline <ArrowRight size={13} aria-hidden="true" /></a>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
