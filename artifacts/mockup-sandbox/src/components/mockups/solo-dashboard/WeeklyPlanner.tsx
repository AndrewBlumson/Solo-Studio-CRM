import { useState, type MouseEvent } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from "lucide-react";
import brandMarkUrl from "@/assets/solo-studio-mark.png";
import {
  attentionCountsByDay,
  attentionForDay,
  dashboardMetrics,
  demoClientName,
  demoDate,
  demoMoney,
  demoStore,
  today,
  todayKey,
  upcomingInvoices,
  weekDays,
  weekDayKeys,
  weekMinutes,
} from "./dashboard-data";
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

function keepPreviewLocal(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

const destinationForEntity: Record<string, string> = {
  tasks: "/projects",
  projects: "/projects",
  leads: "/pipeline",
  proposals: "/pipeline",
  invoices: "/money",
  expenses: "/money",
  clients: "/clients",
  timeEntries: "/projects",
};

function formatWeekRange() {
  const first = weekDays[0];
  const last = weekDays[6];
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" });
  const startMonth = month.format(first);
  const endMonth = month.format(last);
  return startMonth === endMonth
    ? `${first.getDate()}–${last.getDate()} ${startMonth}`
    : `${first.getDate()} ${startMonth} – ${last.getDate()} ${endMonth}`;
}

export function WeeklyPlanner() {
  const firstPlannedDayKey = weekDayKeys.find((dayKey) => dayKey > todayKey && (attentionCountsByDay[dayKey] ?? 0) > 0);
  const [selectedDayKey, setSelectedDayKey] = useState(firstPlannedDayKey ?? todayKey);
  const activeDayKey = weekDayKeys.includes(selectedDayKey) ? selectedDayKey : todayKey;
  const selectedDay = weekDays[weekDayKeys.indexOf(activeDayKey)] ?? today;
  const dayAttentionItems = attentionForDay(activeDayKey);
  const visibleAttentionItems = dayAttentionItems.slice(0, 6);
  const selectedDayLabel = selectedDay.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const weekPercent = Math.min(100, (weekMinutes / (30 * 60)) * 100);
  const greeting = today.getHours() < 12 ? "morning" : today.getHours() < 18 ? "afternoon" : "evening";
  const awaitingCount = demoStore.invoices.filter((invoice) => ["Sent", "Overdue"].includes(invoice.status)).length;

  return (
    <div className="dashboard-mockup weekly-planner">
      <style>{`
        .weekly-planner { --planner-line: hsl(var(--border)); --planner-paper: hsl(var(--card)); }
        .weekly-planner .page { max-width: 1440px; padding-top: 30px; }
        .weekly-planner .topbar { position: sticky; top: 0; z-index: 5; backdrop-filter: blur(12px); }
        .weekly-planner .page-heading { align-items: flex-start; margin-bottom: 22px; }
        .weekly-planner .page-heading h1 { font-size: clamp(32px, 4vw, 45px); }
        .weekly-planner .planner-kicker { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: hsl(var(--accent)); text-transform: uppercase; letter-spacing: 1.35px; font: 500 10px var(--app-font-mono); }
        .weekly-planner .planner-kicker:before { content: ""; width: 21px; height: 1px; background: currentColor; }
        .weekly-planner .week-date { color: hsl(var(--muted-foreground)); font: 500 11px var(--app-font-mono); }
        .weekly-planner .planner-grid { display: grid; grid-template-columns: minmax(0, 1.72fr) minmax(250px, .78fr); gap: 19px; align-items: start; }
        .weekly-planner .planner-main { min-width: 0; }
        .weekly-planner .week-surface { padding: 21px 22px 18px; border-color: hsl(var(--card-border)); background: hsl(var(--card)); box-shadow: 0 5px 22px hsl(var(--foreground) / .035); }
        .weekly-planner .surface-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 17px; }
        .weekly-planner .surface-top .eyebrow { margin-bottom: 6px; }
        .weekly-planner .surface-top .card-title { font-size: 22px; }
        .weekly-planner .week-band { gap: 7px; margin: 0; }
        .weekly-planner .week-day { min-height: 91px; padding: 11px 5px 8px; border: 1px solid hsl(var(--border) / .68); border-radius: 11px; background: hsl(var(--background) / .64); font-size: 10px; }
        .weekly-planner .week-day:hover { border-color: hsl(var(--primary) / .5); background: hsl(var(--secondary) / .65); }
        .weekly-planner .week-day.today { border-color: hsl(var(--primary)); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
        .weekly-planner .week-day.selected:not(.today) { border-color: hsl(var(--primary)); background: hsl(var(--primary) / .09); color: hsl(var(--foreground)); box-shadow: inset 0 0 0 1px hsl(var(--primary) / .08); }
        .weekly-planner .week-day b { margin-top: 7px; font-size: 17px; }
        .weekly-planner .week-day-count { min-width: 18px; height: 17px; margin-top: 7px; font-size: 9px; }
        .weekly-planner .week-day-count.empty { display: inline-flex; visibility: hidden; }
        .weekly-planner .week-help { margin: 12px 0 0; color: hsl(var(--muted-foreground)); font-size: 11px; line-height: 1.5; }
        .weekly-planner .agenda-card { margin-top: 15px; padding: 22px 23px 20px; }
        .weekly-planner .agenda-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 6px; }
        .weekly-planner .agenda-heading .eyebrow { margin-bottom: 7px; }
        .weekly-planner .agenda-heading .card-title { font-size: 24px; }
        .weekly-planner .agenda-caption { margin-top: 6px; color: hsl(var(--muted-foreground)); font-size: 11px; line-height: 1.5; }
        .weekly-planner .agenda-list { margin-top: 16px; }
        .weekly-planner .planner-item { display: flex; align-items: center; gap: 13px; padding: 14px 0; border-top: 1px solid hsl(var(--border) / .8); }
        .weekly-planner .item-rail { align-self: stretch; width: 3px; min-height: 36px; flex: none; border-radius: 9px; background: hsl(var(--accent) / .58); }
        .weekly-planner .planner-item.overdue .item-rail { background: hsl(var(--destructive)); }
        .weekly-planner .item-icon { width: 34px; height: 34px; flex: none; display: grid; place-items: center; border-radius: 10px; background: hsl(var(--secondary)); color: hsl(var(--primary)); }
        .weekly-planner .item-content { min-width: 0; flex: 1; }
        .weekly-planner .item-type { margin-bottom: 4px; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: .8px; font: 500 9px var(--app-font-mono); }
        .weekly-planner .item-title { font-size: 13px; font-weight: 600; line-height: 1.35; }
        .weekly-planner .item-context { margin-top: 4px; color: hsl(var(--muted-foreground)); font-size: 10px; line-height: 1.4; }
        .weekly-planner .item-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
        .weekly-planner .item-actions .button { min-height: 31px; }
        .weekly-planner .empty-planner { padding: 32px 18px 26px; border-top: 1px solid hsl(var(--border)); text-align: center; }
        .weekly-planner .empty-planner h3 { margin: 0 0 7px; font: 500 20px var(--app-font-serif); }
        .weekly-planner .empty-planner p { max-width: 400px; margin: 0 auto 15px; color: hsl(var(--muted-foreground)); font-size: 11px; line-height: 1.6; }
        .weekly-planner .desk-rail { display: grid; gap: 13px; }
        .weekly-planner .rail-card { padding: 18px; }
        .weekly-planner .rail-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 13px; }
        .weekly-planner .rail-heading .eyebrow { margin-bottom: 5px; }
        .weekly-planner .rail-heading .card-title { font-size: 19px; }
        .weekly-planner .invoice-entry { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid hsl(var(--border)); }
        .weekly-planner .invoice-entry:first-of-type { border-top: 0; }
        .weekly-planner .invoice-entry .row-title { font-size: 11px; }
        .weekly-planner .invoice-entry .row-sub { font-size: 10px; }
        .weekly-planner .rail-amount { white-space: nowrap; font: 500 11px var(--app-font-mono); }
        .weekly-planner .pipeline-line { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding-top: 13px; border-top: 1px solid hsl(var(--border)); }
        .weekly-planner .pipeline-line .row-title { font-size: 11px; }
        .weekly-planner .context-label { color: hsl(var(--muted-foreground)); font-size: 10px; }
        .weekly-planner .metric-list { display: grid; gap: 0; }
        .weekly-planner .metric-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid hsl(var(--border)); }
        .weekly-planner .metric-line:first-child { border-top: 0; }
        .weekly-planner .metric-line span { color: hsl(var(--muted-foreground)); font-size: 10px; }
        .weekly-planner .metric-line strong { text-align: right; font: 500 13px var(--app-font-mono); }
        .weekly-planner .metric-line small { display: block; margin-top: 3px; color: hsl(var(--muted-foreground)); font: 400 9px var(--app-font-sans); }
        .weekly-planner .time-card { position: relative; overflow: hidden; border-color: hsl(var(--primary)); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
        .weekly-planner .time-card:after { position: absolute; right: -34px; bottom: -59px; width: 132px; height: 132px; border: 1px solid hsl(var(--primary-foreground) / .12); border-radius: 50%; box-shadow: 0 0 0 16px hsl(var(--primary-foreground) / .035), 0 0 0 32px hsl(var(--primary-foreground) / .025); content: ""; pointer-events: none; }
        .weekly-planner .time-card .eyebrow { color: #e7a17e; }
        .weekly-planner .time-card .card-title { font-size: 18px; color: inherit; }
        .weekly-planner .time-stat { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 16px; }
        .weekly-planner .time-stat strong { font: 500 22px var(--app-font-serif); }
        .weekly-planner .time-stat span { color: hsl(var(--primary-foreground) / .66); font-size: 10px; }
        .weekly-planner .time-card .progress-track { background: hsl(var(--primary-foreground) / .18); }
        .weekly-planner .time-card .progress-fill { background: #e7a17e; }
        .weekly-planner .starter-notice { margin-bottom: 18px; }
        .weekly-planner .dashboard-mockup a:focus-visible, .weekly-planner button:focus-visible { outline: 3px solid hsl(var(--accent) / .65); outline-offset: 3px; }
        @media (max-width: 1000px) {
          .weekly-planner .planner-grid { grid-template-columns: minmax(0, 1.4fr) minmax(225px, .8fr); gap: 13px; }
          .weekly-planner .week-surface, .weekly-planner .agenda-card { padding-left: 17px; padding-right: 17px; }
        }
        @media (max-width: 760px) {
          .weekly-planner .planner-grid { grid-template-columns: 1fr; }
          .weekly-planner .desk-rail { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
          .weekly-planner .time-card { grid-column: 1 / -1; }
          .weekly-planner .page-heading { gap: 16px; }
        }
        @media (max-width: 700px) {
          .weekly-planner .page { padding: 25px 15px 38px; }
          .weekly-planner .page-heading { align-items: flex-start; }
          .weekly-planner .page-heading > .button { width: auto; align-self: stretch; }
          .weekly-planner .starter-notice { align-items: flex-start; }
          .weekly-planner .week-surface { padding: 17px 13px 14px; }
          .weekly-planner .surface-top { align-items: flex-start; }
          .weekly-planner .week-band { gap: 4px; }
          .weekly-planner .week-day { min-height: 79px; padding: 9px 1px 6px; font-size: 9px; }
          .weekly-planner .week-day b { font-size: 15px; }
          .weekly-planner .agenda-card { padding: 18px 15px; }
          .weekly-planner .planner-item { gap: 9px; }
          .weekly-planner .item-actions { flex-direction: column; align-items: flex-end; }
          .weekly-planner .item-actions .badge { font-size: 8px; }
        }
        @media (max-width: 430px) {
          .weekly-planner .topbar { padding: 0 11px; }
          .weekly-planner .account-actions { gap: 0; }
          .weekly-planner .save-pill { padding: 5px 7px; font-size: 8px; }
          .weekly-planner .page-heading { flex-direction: row; align-items: flex-end; gap: 9px; }
          .weekly-planner .page-heading h1 { font-size: 31px; }
          .weekly-planner .page-heading > .button { padding: 8px 9px; font-size: 10px; white-space: nowrap; }
          .weekly-planner .page-heading > .button { align-self: flex-end; height: fit-content; min-height: 34px; }
          .weekly-planner .subtitle { max-width: 225px; font-size: 11px; line-height: 1.45; }
          .weekly-planner .week-date { max-width: 92px; text-align: right; font-size: 9px; }
          .weekly-planner .agenda-heading .card-title { font-size: 21px; }
          .weekly-planner .desk-rail { grid-template-columns: 1fr; }
          .weekly-planner .time-card { grid-column: auto; }
          .weekly-planner .item-icon { width: 30px; height: 30px; }
          .weekly-planner .item-title { font-size: 12px; }
          .weekly-planner .item-actions .button { padding: 5px 8px; }
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
              <a
                key={path}
                href={path}
                onClick={keepPreviewLocal}
                className={`nav-link ${path === "/user-portal" ? "active" : ""}`}
                aria-current={path === "/user-portal" ? "page" : undefined}
              >
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
              <span className="save-pill" aria-live="polite">
                <i className="save-dot" aria-hidden="true" />
                Saved to your account
              </span>
              <span className="account-name">Your account</span>
              <button className="button small" type="button">Sign out</button>
            </div>
          </header>

          <section className="page">
            <div className="page-heading">
              <div>
                <div className="planner-kicker">Your week, in view</div>
                <h1>Good {greeting}.</h1>
                <p className="subtitle">Choose what to move forward, one day at a time.</p>
              </div>
              <a className="button primary" href="/pipeline" onClick={keepPreviewLocal}>
                <Plus size={15} aria-hidden="true" />
                Add a lead
              </a>
            </div>

            <div className="card starter-notice" data-testid="notice-demo-first-run">
              <div className="activity-mark" style={{ background: "hsl(var(--accent))", color: "white" }}>
                <BookOpen size={15} aria-hidden="true" />
              </div>
              <div className="row-main">
                <div className="row-title">Your private starter workspace is ready</div>
                <div className="row-sub">
                  Sample leads, client work, invoices and a finished case study are ready to explore. Changes are saved to your account only.
                </div>
              </div>
            </div>

            <div className="planner-grid">
              <div className="planner-main">
                <section className="card week-surface" aria-labelledby="week-surface-title">
                  <div className="surface-top">
                    <div>
                      <div className="eyebrow">The working week</div>
                      <h2 className="card-title" id="week-surface-title">A little structure, plenty of room</h2>
                    </div>
                    <span className="week-date">{formatWeekRange()}</span>
                  </div>
                  <div className="week-band" role="group" aria-label="Choose a day to see its actions">
                    {weekDays.map((day, index) => {
                      const dayKey = weekDayKeys[index];
                      const dueCount = attentionCountsByDay[dayKey] ?? 0;
                      const weekday = day.toLocaleDateString("en-GB", { weekday: "long" });
                      return (
                        <button
                          type="button"
                          className={`week-day ${dayKey === todayKey ? "today" : ""} ${dayKey === activeDayKey ? "selected" : ""}`}
                          key={dayKey}
                          onClick={() => setSelectedDayKey(dayKey)}
                          aria-label={`${weekday} ${demoDate(dayKey)}, ${dueCount} ${dueCount === 1 ? "dated item" : "dated items"} due`}
                          aria-current={dayKey === todayKey ? "date" : undefined}
                          aria-pressed={dayKey === activeDayKey}
                        >
                          {day.toLocaleDateString("en-GB", { weekday: "short" })}
                          <b>{day.getDate()}</b>
                          <span className={`week-day-count ${dueCount ? "" : "empty"}`} aria-hidden="true">
                            {dueCount || "\u00a0"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="week-help">Select a day to bring its dated work into focus. Overdue and undated items stay in view.</p>
                </section>

                <section className="card agenda-card" data-testid="section-needs-attention" aria-labelledby="agenda-title">
                  <div className="agenda-heading">
                    <div>
                      <div className="eyebrow">On the desk · {selectedDay.toLocaleDateString("en-GB", { weekday: "long" })}</div>
                      <h2 className="card-title" id="agenda-title">{selectedDayLabel}</h2>
                      <div className="agenda-caption">A short list of things to keep moving today.</div>
                    </div>
                    <span className={`badge ${dayAttentionItems.some((item) => item.severity === 0) ? "bad" : dayAttentionItems.length ? "warn" : "good"}`} aria-live="polite">
                      {dayAttentionItems.length ? `${dayAttentionItems.length} ${dayAttentionItems.length === 1 ? "item" : "items"}` : "All clear"}
                    </span>
                  </div>
                  {visibleAttentionItems.length ? (
                    <>
                      <div className="agenda-list" role="list" aria-label={`Work needing attention for ${selectedDayLabel}`}>
                        {visibleAttentionItems.map((item) => {
                          const Icon = item.entity === "tasks"
                            ? CheckSquare
                            : item.entity === "projects"
                              ? FolderKanban
                              : item.entity === "leads"
                                ? Activity
                                : item.entity === "invoices"
                                  ? Wallet
                                  : FileText;
                          const context = [item.context, item.dateText].filter((value) => value && value !== "—").join(" · ");
                          return (
                            <div className={`planner-item ${item.severity === 0 ? "overdue" : ""}`} key={item.id} role="listitem">
                              <span className="item-rail" aria-hidden="true" />
                              <span className="item-icon"><Icon size={16} aria-hidden="true" /></span>
                              <div className="item-content">
                                <div className="item-type">{item.category}</div>
                                <div className="item-title">{item.title}</div>
                                <div className="item-context">{context || "No additional details"}</div>
                              </div>
                              <div className="item-actions">
                                <span className={`badge ${item.severity === 0 ? "bad" : "warn"}`}>{item.badge}</span>
                                <a
                                  className="button small"
                                  href={destinationForEntity[item.entity] ?? "/user-portal"}
                                  onClick={keepPreviewLocal}
                                  aria-label={`Open ${item.category.toLowerCase()}: ${item.title}`}
                                >
                                  Open <ArrowRight size={12} aria-hidden="true" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {dayAttentionItems.length > visibleAttentionItems.length && (
                        <div className="small-muted" style={{ marginTop: 10 }}>
                          Showing the 6 most urgent of {dayAttentionItems.length}. The rest remain in their workspace sections.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-planner">
                      <div className="empty-mark"><CheckSquare size={18} aria-hidden="true" /></div>
                      <h3>All clear for {selectedDayLabel}</h3>
                      <p>Nothing is due on this day, and there are no overdue or undated items. Choose another day to check the rest of the week.</p>
                    </div>
                  )}
                </section>
              </div>

              <aside className="desk-rail" aria-label="Studio context">
                <section className="card rail-card">
                  <div className="rail-heading">
                    <div>
                      <div className="eyebrow">Cash on the horizon</div>
                      <h2 className="card-title">Money in motion</h2>
                    </div>
                    <a href="/money" onClick={keepPreviewLocal} className="button small ghost" aria-label="View money">
                      Money <ArrowRight size={13} aria-hidden="true" />
                    </a>
                  </div>
                  {upcomingInvoices.length ? (
                    upcomingInvoices.map((invoice) => (
                      <div className="invoice-entry" key={invoice.id}>
                        <div className="activity-mark"><FileText size={15} aria-hidden="true" /></div>
                        <div className="row-main">
                          <div className="row-title">{invoice.number} · {demoClientName(invoice.clientId)}</div>
                          <div className="row-sub">Due {demoDate(invoice.dueDate)} <span className="badge warn">Sent</span></div>
                        </div>
                        <div className="rail-amount">{demoMoney(invoice.amountPence)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="small-muted">No payments expected beyond this week.</div>
                  )}
                  <div className="pipeline-line">
                    <div className="activity-mark"><Activity size={15} aria-hidden="true" /></div>
                    <div className="row-main">
                      <div className="row-title">{dashboardMetrics.pipelineConversations} conversations in pipeline</div>
                      <div className="context-label">Potential value across live leads</div>
                    </div>
                    <a href="/pipeline" onClick={keepPreviewLocal} className="button small">Review</a>
                  </div>
                </section>

                <section className="card rail-card" aria-label="Studio totals">
                  <div className="rail-heading">
                    <div>
                      <div className="eyebrow">Wider picture</div>
                      <h2 className="card-title">Studio totals</h2>
                    </div>
                  </div>
                  <div className="metric-list">
                    <div className="metric-line">
                      <span>Collected</span>
                      <strong>{demoMoney(dashboardMetrics.collected)}<small>Paid invoices, all time</small></strong>
                    </div>
                    <div className="metric-line">
                      <span>To come in</span>
                      <strong>{demoMoney(dashboardMetrics.outstanding)}<small>{awaitingCount} invoices awaiting payment</small></strong>
                    </div>
                    <div className="metric-line">
                      <span>Active projects</span>
                      <strong>{String(dashboardMetrics.activeProjects).padStart(2, "0")}<small>{dashboardMetrics.openTasks} open tasks</small></strong>
                    </div>
                    <div className="metric-line">
                      <span>Studio outgoings</span>
                      <strong>{demoMoney(dashboardMetrics.expenses)}<small>Expenses this month</small></strong>
                    </div>
                  </div>
                </section>

                <section className="card rail-card time-card">
                  <div className="eyebrow">Time, at your pace</div>
                  <h2 className="card-title">Focus logged this week</h2>
                  <div className="time-stat">
                    <strong>{Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m</strong>
                    <span>of 30h focus goal</span>
                  </div>
                  <div className="progress-track" role="progressbar" aria-label="Weekly focus goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(weekPercent)}>
                    <div className="progress-fill" style={{ width: `${weekPercent}%` }} />
                  </div>
                </section>
              </aside>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
