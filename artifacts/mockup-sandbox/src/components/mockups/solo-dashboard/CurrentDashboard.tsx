import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
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
  attentionForDay,
  attentionCountsByDay,
  attentionItems,
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
  weekEndKey,
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

function keepPreviewLocal(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

export function CurrentDashboard() {
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
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
  const collected = demoStore.invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((total, invoice) => total + Number(invoice.amountPence || 0), 0);
  const outstanding = demoStore.invoices
    .filter((invoice) => ["Sent", "Overdue"].includes(invoice.status))
    .reduce((total, invoice) => total + Number(invoice.amountPence || 0), 0);
  const expenses = demoStore.expenses
    .filter((expense) => String(expense.date || "").startsWith(todayKey.slice(0, 7)))
    .reduce((total, expense) => total + Number(expense.amountPence || 0), 0);
  const greeting = today.getHours() < 12 ? "morning" : today.getHours() < 18 ? "afternoon" : "evening";

  return (
    <div className="dashboard-mockup">
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
                <div className="eyebrow">
                  This week · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(today)}
                </div>
                <h1>Good {greeting}.</h1>
                <p className="subtitle">A clear view of what is moving in your studio.</p>
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

            <div className="grid stats-grid">
              <Stat label="Collected" value={demoMoney(collected)} note="Paid invoices, all time" icon={ArrowDownRight} />
              <Stat
                label="To come in"
                value={demoMoney(outstanding)}
                note={`${demoStore.invoices.filter((invoice) => ["Sent", "Overdue"].includes(invoice.status)).length} invoices awaiting payment`}
                icon={ArrowUpRight}
              />
              <Stat
                label="Active projects"
                value={String(dashboardMetrics.activeProjects).padStart(2, "0")}
                note={`${dashboardMetrics.openTasks} open tasks`}
                icon={FolderKanban}
              />
              <Stat label="Studio outgoings" value={demoMoney(expenses)} note="Expenses this month" icon={Wallet} />
            </div>

            <div className="grid dashboard-grid">
              <div>
                <div className="card">
                  <div className="card-heading">
                    <div>
                      <div className="eyebrow">Week at a glance</div>
                      <h2 className="card-title">Make room for the work</h2>
                    </div>
                    <span className="card-meta">{demoDate(weekDayKeys[0])} to {demoDate(weekDayKeys[6])}</span>
                  </div>
                  <div className="week-band" aria-label="Choose a day to see what needs attention">
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
                          aria-label={`${weekday} ${demoDate(dayKey)}, ${dueCount} ${dueCount === 1 ? "item" : "items"} due`}
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
                  <p className="small-muted" style={{ margin: "-7px 0 15px" }}>
                    Choose a day to filter the list below. Overdue items and records needing a date stay visible.
                  </p>
                  <div className="card-heading" style={{ marginBottom: 4 }}>
                    <span className="card-meta">Time logged this week</span>
                    <strong style={{ font: "500 15px var(--app-font-mono)" }}>
                      {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m <span className="card-meta">/ 30h focus goal</span>
                    </strong>
                  </div>
                  <div className="progress-track" aria-label={`${Math.round(weekPercent)} per cent of weekly focus goal`}>
                    <div className="progress-fill" style={{ width: `${weekPercent}%` }} />
                  </div>
                </div>

                <div className="card section" data-testid="section-needs-attention">
                  <div className="card-heading">
                    <div>
                      <div className="eyebrow">Needs attention</div>
                      <h2 className="card-title">Keep the work moving</h2>
                      <div className="card-meta">
                        Overdue or undated items, plus items due {selectedDayLabel}
                      </div>
                    </div>
                    <span className={`badge ${dayAttentionItems.some((item) => item.severity === 0) ? "bad" : dayAttentionItems.length ? "warn" : "good"}`}>
                      {dayAttentionItems.length ? `${dayAttentionItems.length} ${dayAttentionItems.length === 1 ? "item" : "items"}` : "All clear"}
                    </span>
                  </div>
                  {visibleAttentionItems.length ? (
                    <>
                      <div role="list" aria-label="Items that need attention">
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
                            <div className="activity-row" key={item.id} role="listitem">
                              <div className="activity-mark"><Icon size={15} aria-hidden="true" /></div>
                              <div className="row-main">
                                <div className="row-title">{item.title}</div>
                                <div className="row-sub">{item.category}{context ? ` · ${context}` : ""}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <span className={`badge ${item.severity === 0 ? "bad" : "warn"}`}>{item.badge}</span>
                                <button className="button small" type="button">Open</button>
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
                    <div className="empty">
                      <div className="empty-mark"><CheckSquare size={18} aria-hidden="true" /></div>
                      <h3>All clear for {selectedDayLabel}</h3>
                      <p>Nothing is due on this day, and there are no overdue or undated items. Choose another day to check the rest of the week.</p>
                      <button className="button small" type="button"><Plus size={13} aria-hidden="true" /> Add a task</button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="card">
                  <div className="card-heading">
                    <div>
                      <div className="eyebrow">Activity</div>
                      <h2 className="card-title">Money in motion</h2>
                    </div>
                    <a href="/money" onClick={keepPreviewLocal} className="button small ghost">
                      View money <ArrowRight size={13} aria-hidden="true" />
                    </a>
                  </div>
                  {upcomingInvoices.length ? (
                    upcomingInvoices.map((invoice) => (
                      <div className="list-row" key={invoice.id}>
                        <div className="activity-mark"><FileText size={15} aria-hidden="true" /></div>
                        <div className="row-main">
                          <div className="row-title">{invoice.number} · {demoClientName(invoice.clientId)}</div>
                          <div className="row-sub">Due {demoDate(invoice.dueDate)} <span className="badge warn">Sent</span></div>
                        </div>
                        <div className="row-end">{demoMoney(invoice.amountPence)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty">
                      <div className="empty-mark"><FileText size={18} aria-hidden="true" /></div>
                      <h3>No payments expected beyond this week</h3>
                      <p>Invoices due soon, overdue or missing a due date appear in Needs attention.</p>
                      <button className="button small" type="button"><Plus size={13} aria-hidden="true" /> Create an invoice</button>
                    </div>
                  )}
                  <div className="activity-row">
                    <div className="activity-mark"><Activity size={15} aria-hidden="true" /></div>
                    <div className="row-main">
                      <div className="row-title">{dashboardMetrics.pipelineConversations} conversations in pipeline</div>
                      <div className="row-sub">Potential value across live leads</div>
                    </div>
                    <a href="/pipeline" onClick={keepPreviewLocal} className="button small">Review</a>
                  </div>
                </div>

                <div className="card section" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: 0 }}>
                  <div className="eyebrow" style={{ color: "#e7a17e" }}>A note from your desk</div>
                  <h2 className="card-title" style={{ fontSize: 22 }}>The small things add up.</h2>
                  <p style={{ fontSize: 12, lineHeight: 1.7, opacity: .78, marginBottom: 0 }}>
                    Log a little time, follow up with a good lead, and keep the studio moving at your own pace.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: React.ElementType }) {
  return (
    <div className="card stat-card" data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      <Icon size={17} style={{ position: "absolute", right: 17, bottom: 17, color: "hsl(var(--accent))" }} aria-hidden="true" />
    </div>
  );
}
