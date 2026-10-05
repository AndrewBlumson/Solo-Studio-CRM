import { ArrowRight, BookOpen, Check, FolderKanban, LayoutDashboard, Users, Wallet } from "lucide-react";
import brandMarkUrl from "@/assets/solo-studio-mark.png";

export function WorkingStudio() {
  return (
    <main className="working-studio">
      <style>{`
        .working-studio {
          --ws-ink: #263d34;
          --ws-muted: #66746b;
          --ws-line: #dce2d8;
          --ws-paper: #f5f5ed;
          --ws-card: #fffef9;
          --ws-green: #345d4d;
          --ws-clay: #b66f53;
          min-height: 100dvh;
          overflow: hidden;
          color: var(--ws-ink);
          background: var(--ws-paper);
          font-family: "DM Sans", sans-serif;
        }
        .working-studio *, .working-studio *::before, .working-studio *::after { box-sizing: border-box; }
        .ws-wrap { width: min(1240px, 100%); margin: 0 auto; padding-inline: clamp(20px, 5vw, 72px); }
        .ws-header {
          min-height: 77px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
          border-bottom: 1px solid var(--ws-line);
        }
        .ws-brand { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 10px; color: var(--ws-ink); text-decoration: none; white-space: nowrap; }
        .ws-brand img { display: block; width: 37px; height: 37px; object-fit: contain; background: #fff; border-radius: 10px; }
        .ws-brand span { font: 600 20px/1 "Lora", Georgia, serif; letter-spacing: -.55px; }
        .ws-nav { display: flex; flex: 0 0 auto; align-items: center; gap: 25px; }
        .ws-nav a { color: var(--ws-ink); font-size: 12px; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .ws-nav a:hover, .ws-footer a:hover { text-decoration: underline; text-underline-offset: 4px; }
        .ws-nav .ws-nav-cta {
          display: inline-flex; align-items: center; gap: 9px; padding: 11px 15px;
          color: #fffdf7; background: var(--ws-green); border-radius: 7px;
        }
        .ws-intro { padding-top: clamp(34px, 5vw, 61px); }
        .ws-intro-row { display: flex; justify-content: space-between; align-items: end; gap: 30px; }
        .ws-kicker {
          margin: 0 0 11px; color: var(--ws-clay); font: 500 10px/1.2 "DM Mono", monospace;
          letter-spacing: 1.4px; text-transform: uppercase;
        }
        .ws-intro h1 {
          max-width: 700px; margin: 0; font: 500 clamp(37px, 5.2vw, 62px)/1.04 "Lora", Georgia, serif;
          letter-spacing: -2.3px;
        }
        .ws-intro-copy { max-width: 430px; margin: 15px 0 0; color: var(--ws-muted); font-size: 14px; line-height: 1.65; }
        .ws-intro-action {
          flex: 0 0 auto; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 3px;
          padding: 14px 18px; color: #fffdf7; background: var(--ws-green); border-radius: 7px;
          font-size: 12px; font-weight: 650; text-decoration: none; transition: transform .18s ease;
        }
        .ws-intro-action:hover, .ws-nav-cta:hover { transform: translateY(-2px); }
        .ws-product { padding-top: 35px; }
        .ws-product-caption { display: flex; align-items: center; gap: 9px; margin: 0 0 10px 2px; color: #748078; font: 500 9px "DM Mono", monospace; letter-spacing: 1px; text-transform: uppercase; }
        .ws-product-caption::before { content: ""; width: 18px; height: 1px; background: var(--ws-clay); }
        .ws-dashboard {
          display: grid; grid-template-columns: 176px minmax(0, 1fr); min-height: 418px; overflow: hidden;
          background: var(--ws-card); border: 1px solid #d9ded5; border-radius: 12px;
          box-shadow: 0 16px 48px rgba(48, 68, 55, .09), 0 2px 7px rgba(48, 68, 55, .04);
        }
        .ws-side {
          padding: 18px 13px; background: #f0f2e9; border-right: 1px solid #e1e5dc;
          display: flex; flex-direction: column;
        }
        .ws-side-brand { display: flex; align-items: center; gap: 8px; padding: 0 5px 17px; border-bottom: 1px solid #dfe4da; }
        .ws-side-brand img { width: 25px; height: 25px; object-fit: contain; background: white; border-radius: 7px; }
        .ws-side-brand span { font: 600 11px "Lora", Georgia, serif; color: #34483d; }
        .ws-side-label { margin: 18px 7px 9px; color: #929b90; font: 500 8px "DM Mono", monospace; letter-spacing: 1px; }
        .ws-side-link { display: flex; align-items: center; gap: 9px; min-height: 32px; padding: 0 8px; color: #6e7a70; font-size: 10px; text-decoration: none; border-radius: 6px; }
        .ws-side-link.active { color: #345d4d; background: #e1e9df; font-weight: 650; }
        .ws-side-bottom { margin-top: auto; padding: 12px 6px 0; border-top: 1px solid #dfe4da; color: #889188; font-size: 9px; }
        .ws-workspace { min-width: 0; padding: 23px clamp(16px, 3.4vw, 38px) 20px; }
        .ws-dash-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .ws-dash-date { color: #818c82; font: 500 8px "DM Mono", monospace; letter-spacing: 1px; }
        .ws-dash-head h2 { margin: 5px 0 0; font: 500 25px/1.2 "Lora", Georgia, serif; letter-spacing: -.6px; }
        .ws-avatar { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid #e2e4db; border-radius: 50%; color: #486352; background: #edf0e8; font: 600 9px "DM Mono", monospace; }
        .ws-dash-subtitle { margin: 5px 0 18px; color: #899188; font-size: 10px; }
        .ws-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .ws-stat { position: relative; min-height: 83px; display: flex; flex-direction: column; gap: 9px; padding: 13px 14px 16px; border: 1px solid #e6e8df; border-radius: 7px; background: #fbfaf5; overflow: hidden; }
        .ws-stat span { color: #7c867d; font-size: 9px; }
        .ws-stat strong { color: #314a3d; font: 500 21px/1 "Lora", Georgia, serif; }
        .ws-stat::after { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; content: ""; background: #73917a; }
        .ws-stat:nth-child(2)::after { width: 74%; background: #bf8062; }
        .ws-stat:nth-child(3)::after { width: 44%; background: #afb99c; }
        .ws-section-title { display: flex; align-items: center; justify-content: space-between; margin: 21px 0 7px; }
        .ws-section-title h3 { margin: 0; font: 500 15px "Lora", Georgia, serif; }
        .ws-section-title span { color: #849087; font-size: 9px; }
        .ws-record { display: flex; align-items: center; gap: 11px; min-height: 58px; border-top: 1px solid #eceee7; }
        .ws-record-icon { display: grid; place-items: center; flex: 0 0 30px; height: 30px; border-radius: 8px; color: #456957; background: #e9efe7; }
        .ws-record-icon.clay { color: #ad694f; background: #f5e9e1; }
        .ws-record-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
        .ws-record-copy strong { color: #43564a; font-size: 10px; }
        .ws-record-copy span { color: #838c83; font-size: 9px; }
        .ws-status { color: #62816d; font: 500 8px "DM Mono", monospace; letter-spacing: .5px; white-space: nowrap; }
        .ws-dash-bottom { display: flex; align-items: center; gap: 22px; padding-top: 12px; border-top: 1px solid #eceee7; }
        .ws-dash-bottom span { display: inline-flex; align-items: center; gap: 6px; color: #78837a; font-size: 9px; }
        .ws-trust { display: flex; align-items: center; gap: 9px; margin: 15px 2px 0; color: #61736a; font-size: 10px; }
        .ws-trust-mark { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; color: #426852; background: #e2ebe1; }
        .ws-features { display: grid; grid-template-columns: 1.1fr 1.1fr 1.1fr .9fr; gap: 24px; padding-top: 48px; padding-bottom: 47px; }
        .ws-feature { padding-top: 14px; border-top: 1px solid #d5ddd3; }
        .ws-feature-index { color: #af765e; font: 500 9px "DM Mono", monospace; letter-spacing: .7px; }
        .ws-feature h2 { margin: 9px 0 7px; font: 500 18px/1.25 "Lora", Georgia, serif; letter-spacing: -.25px; }
        .ws-feature p { max-width: 260px; margin: 0; color: #68766d; font-size: 10px; line-height: 1.65; }
        .ws-endcap { display: flex; flex-direction: column; justify-content: space-between; padding: 14px 0 0 19px; border-top: 1px solid #d5ddd3; border-left: 1px solid #d5ddd3; }
        .ws-endcap p { margin: 0; color: #53685b; font: 500 18px/1.4 "Lora", Georgia, serif; }
        .ws-endcap a { display: inline-flex; align-items: center; gap: 7px; color: var(--ws-green); font-size: 10px; font-weight: 700; text-decoration: none; }
        .ws-footer { min-height: 63px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid var(--ws-line); color: #79857d; font-size: 9px; }
        .ws-footer-brand { color: #4b6154; font: 600 11px "Lora", Georgia, serif; }
        .ws-legal { display: flex; align-items: center; gap: 19px; }
        .ws-legal a { color: #486252; font-weight: 600; text-decoration: none; }
        .working-studio a:focus-visible { outline: 3px solid #bd7758; outline-offset: 3px; border-radius: 4px; }
        @media (max-width: 850px) {
          .ws-intro-row { align-items: flex-start; flex-direction: column; }
          .ws-intro-action { margin-top: 17px; }
          .ws-features { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ws-endcap { grid-column: 1 / -1; min-height: 88px; flex-direction: row; align-items: center; padding: 15px 0 0; border-left: 0; }
        }
        @media (max-width: 650px) {
          .ws-header { min-height: 66px; gap: 10px; }
          .ws-brand span { font-size: 16px; }
          .ws-nav { gap: 8px; }
          .ws-nav .ws-nav-cta { gap: 5px; padding: 9px 8px; font-size: 9px; }
          .ws-intro { padding-top: 34px; }
          .ws-intro h1 { font-size: clamp(38px, 10vw, 54px); letter-spacing: -1.7px; }
          .ws-intro-copy { font-size: 13px; }
          .ws-product { padding-top: 28px; }
          .ws-dashboard { grid-template-columns: 1fr; }
          .ws-side { display: none; }
          .ws-workspace { padding: 18px 14px 16px; }
          .ws-dash-head h2 { font-size: 22px; }
          .ws-stats { gap: 6px; }
          .ws-stat { min-height: 76px; padding: 11px 8px 14px; }
          .ws-stat span { font-size: 8px; }
          .ws-stat strong { font-size: clamp(15px, 4.2vw, 20px); }
          .ws-record { gap: 8px; }
          .ws-record-copy strong { font-size: 9px; }
          .ws-record-copy span { font-size: 8px; }
          .ws-status { font-size: 7px; }
          .ws-dash-bottom { justify-content: space-between; gap: 7px; }
          .ws-dash-bottom span { font-size: 8px; }
          .ws-features { grid-template-columns: 1fr; gap: 17px; padding-top: 36px; padding-bottom: 35px; }
          .ws-feature { padding-top: 12px; }
          .ws-feature h2 { margin-top: 7px; }
          .ws-feature p { max-width: 360px; font-size: 11px; }
          .ws-endcap { grid-column: auto; min-height: 100px; align-items: flex-start; flex-direction: column; gap: 12px; }
          .ws-footer { align-items: flex-start; flex-direction: column; padding-top: 15px; padding-bottom: 17px; }
          .ws-legal { gap: 18px; }
        }
        @media (max-width: 390px) {
          .ws-wrap { padding-inline: 15px; }
          .ws-header { gap: 6px; }
          .ws-brand img { width: 31px; height: 31px; }
          .ws-brand span { font-size: 14px; }
          .ws-nav { gap: 6px; }
          .ws-nav .ws-nav-cta { gap: 3px; padding: 8px 6px; font-size: 8px; }
          .ws-nav .ws-nav-cta svg { width: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ws-intro-action, .ws-nav-cta { transition: none; }
        }
      `}</style>
      <header className="ws-header ws-wrap">
        <a href="/" className="ws-brand" aria-label="Solo Studio home">
          <img src={brandMarkUrl} alt="" />
          <span>Solo Studio</span>
        </a>
        <nav className="ws-nav" aria-label="Account">
          <a href="/sign-in">Sign in</a>
          <a href="/sign-up" className="ws-nav-cta">Create your workspace <ArrowRight size={14} /></a>
        </nav>
      </header>

      <section className="ws-intro ws-wrap" aria-labelledby="ws-title">
        <div className="ws-intro-row">
          <div>
            <p className="ws-kicker">A calmer way to run your studio</p>
            <h1 id="ws-title">Make space for the work you love.</h1>
            <p className="ws-intro-copy">Keep clients, projects, proposals, time and invoices together, without losing sight of the creative work behind them.</p>
          </div>
          <a href="/sign-up" className="ws-intro-action">Start your private workspace <ArrowRight size={15} /></a>
        </div>
      </section>

      <section className="ws-product ws-wrap" aria-label="A preview of the Solo Studio dashboard">
        <p className="ws-product-caption">Your studio at a glance</p>
        <div className="ws-dashboard">
          <aside className="ws-side" aria-label="Workspace sections preview">
            <div className="ws-side-brand"><img src={brandMarkUrl} alt="" /><span>Fieldnotes Studio</span></div>
            <p className="ws-side-label">WORKSPACE</p>
            <span className="ws-side-link active"><LayoutDashboard size={13} /> Overview</span>
            <span className="ws-side-link"><Users size={13} /> Clients</span>
            <span className="ws-side-link"><FolderKanban size={13} /> Projects</span>
            <span className="ws-side-link"><Wallet size={13} /> Money</span>
            <span className="ws-side-link"><BookOpen size={13} /> Buildbook</span>
            <span className="ws-side-bottom">THIS WEEK</span>
          </aside>
          <div className="ws-workspace">
            <div className="ws-dash-head">
              <div>
                <span className="ws-dash-date">MONDAY, 12 MAY</span>
                <h2>Good work, in motion.</h2>
              </div>
              <span className="ws-avatar" aria-label="Fieldnotes Studio">FS</span>
            </div>
            <p className="ws-dash-subtitle">Everything important, in one clear view.</p>
            <div className="ws-stats">
              <div className="ws-stat"><span>Active projects</span><strong>03</strong></div>
              <div className="ws-stat"><span>To come in</span><strong>£4,800</strong></div>
              <div className="ws-stat"><span>Open tasks</span><strong>07</strong></div>
            </div>
            <div className="ws-section-title"><h3>Current work</h3><span>View projects</span></div>
            <div className="ws-record">
              <span className="ws-record-icon"><FolderKanban size={15} /></span>
              <div className="ws-record-copy"><strong>North &amp; Kind</strong><span>Seasonal story · In progress</span></div>
              <span className="ws-status">ON TRACK</span>
            </div>
            <div className="ws-record">
              <span className="ws-record-icon clay"><BookOpen size={15} /></span>
              <div className="ws-record-copy"><strong>Common Ground</strong><span>Identity system · Completed</span></div>
              <span className="ws-status">READY</span>
            </div>
            <div className="ws-dash-bottom">
              <span><Users size={13} /> Clients</span>
              <span><Wallet size={13} /> Money</span>
              <span><BookOpen size={13} /> Buildbook</span>
            </div>
          </div>
        </div>
        <div className="ws-trust"><span className="ws-trust-mark"><Check size={12} /></span>Your studio records stay private to your account</div>
      </section>

      <section className="ws-features ws-wrap" aria-label="What you can do with Solo Studio">
        <article className="ws-feature">
          <span className="ws-feature-index">01 / PEOPLE</span>
          <h2>Keep good people close</h2>
          <p>Track leads, clients and proposals from first conversation to signed work.</p>
        </article>
        <article className="ws-feature">
          <span className="ws-feature-index">02 / PROJECTS</span>
          <h2>Keep work moving</h2>
          <p>Bring projects, tasks and time together so the next step is easy to see.</p>
        </article>
        <article className="ws-feature">
          <span className="ws-feature-index">03 / FINANCES</span>
          <h2>Know where you stand</h2>
          <p>See invoices, payments and expenses alongside the work they belong to.</p>
        </article>
        <div className="ws-endcap">
          <p>Made for independent makers.</p>
          <a href="/sign-up">Create your workspace <ArrowRight size={13} /></a>
        </div>
      </section>

      <footer className="ws-footer ws-wrap">
        <span className="ws-footer-brand">Solo Studio</span>
        <nav className="ws-legal" aria-label="Legal">
          <a href="/privacy" data-testid="link-footer-privacy">Privacy</a>
          <a href="/cookies" data-testid="link-footer-cookies">Cookies</a>
          <a href="/terms" data-testid="link-footer-terms">Terms</a>
        </nav>
      </footer>
    </main>
  );
}
