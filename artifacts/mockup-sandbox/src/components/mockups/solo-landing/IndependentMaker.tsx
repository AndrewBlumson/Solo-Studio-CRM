import { ArrowDownRight, ArrowRight, BookOpen, Check, FolderKanban, Users, Wallet } from "lucide-react";
import brandMarkUrl from "@/assets/solo-studio-mark.png";

export function IndependentMaker() {
  return (
    <main className="independent-maker">
      <style>{`
        .independent-maker {
          --im-paper: #f4f0e7;
          --im-sheet: #fffdf7;
          --im-ink: #253a32;
          --im-muted: #68756d;
          --im-rule: #d9d4c8;
          --im-leaf: #3b6654;
          --im-clay: #b86348;
          --im-sun: #e6d18b;
          min-height: 100dvh;
          overflow: hidden;
          color: var(--im-ink);
          background:
            radial-gradient(ellipse at 12% 17%, rgba(219, 204, 163, .21), transparent 25rem),
            radial-gradient(ellipse at 96% 49%, rgba(184, 99, 72, .07), transparent 28rem),
            var(--im-paper);
          font-family: "DM Sans", sans-serif;
        }
        .independent-maker * { box-sizing: border-box; }
        .independent-maker a { color: inherit; }
        .im-wrap { width: min(1200px, calc(100% - 64px)); margin: 0 auto; }
        .im-nav {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 1px solid rgba(95, 111, 98, .23);
        }
        .im-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: var(--im-ink);
          text-decoration: none;
          font: 600 20px/1 "Source Serif 4", Georgia, serif;
          letter-spacing: -.5px;
        }
        .im-brand img {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          object-fit: contain;
          background: var(--im-sheet);
        }
        .im-nav-actions { display: flex; align-items: center; gap: 23px; }
        .im-signin {
          color: #495d52;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }
        .im-signin:hover, .im-legal a:hover { text-decoration: underline; text-underline-offset: 4px; }
        .im-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 17px;
          border: 1px solid var(--im-rule);
          border-radius: 4px;
          background: var(--im-sheet);
          color: var(--im-ink);
          font-size: 12px;
          font-weight: 650;
          text-decoration: none;
          transition: transform .18s ease, background .18s ease;
        }
        .im-button:hover { transform: translateY(-2px); background: #f8f4e9; }
        .im-button--primary { background: var(--im-leaf); border-color: var(--im-leaf); color: #fffdf7 !important; }
        .im-button--primary:hover { background: #2f5545; }
        .im-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, .97fr) minmax(400px, 1.03fr);
          gap: clamp(44px, 8vw, 104px);
          align-items: center;
          padding: clamp(64px, 8.5vw, 112px) 0 84px;
        }
        .im-copy { position: relative; z-index: 1; padding-bottom: 6px; }
        .im-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 19px;
          color: var(--im-clay);
          font: 500 10px/1.3 "DM Sans", sans-serif;
          letter-spacing: .17em;
          text-transform: uppercase;
        }
        .im-kicker::before { content: ""; width: 31px; height: 1px; background: currentColor; }
        .im-copy h1 {
          max-width: 610px;
          margin: 0;
          color: var(--im-ink);
          font: 400 clamp(58px, 7.5vw, 96px)/.99 "Source Serif 4", Georgia, serif;
          letter-spacing: -.065em;
        }
        .im-copy h1 em { color: var(--im-leaf); font-weight: 400; }
        .im-lede {
          max-width: 470px;
          margin: 24px 0 27px;
          color: #5d6b62;
          font-size: 15px;
          line-height: 1.78;
        }
        .im-hero-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .im-private {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 23px 0 0;
          color: #64736a;
          font-size: 11px;
        }
        .im-check {
          width: 20px; height: 20px;
          display: grid; place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          color: var(--im-leaf);
          background: #e0e9df;
        }
        .im-sheet-stage {
          position: relative;
          min-height: 490px;
          display: grid;
          align-items: center;
          padding: 16px 10px 24px 28px;
        }
        .im-sheet-stage::before {
          content: "";
          position: absolute;
          inset: 25px 2px 7px 49px;
          border: 1px solid rgba(152, 137, 107, .28);
          background: rgba(226, 217, 195, .44);
          transform: rotate(3.3deg);
        }
        .im-sheet-stage::after {
          content: "";
          position: absolute;
          z-index: 0;
          width: 68px;
          height: 68px;
          right: -6px;
          top: 4px;
          border-radius: 50%;
          background: var(--im-sun);
          opacity: .72;
        }
        .im-notebook {
          position: relative;
          z-index: 1;
          width: 100%;
          padding: 25px 26px 19px;
          border: 1px solid #e2ddcf;
          background:
            linear-gradient(90deg, transparent 0 29px, rgba(184, 99, 72, .18) 29px 30px, transparent 30px),
            repeating-linear-gradient(to bottom, transparent 0 34px, rgba(91, 123, 103, .075) 34px 35px),
            var(--im-sheet);
          box-shadow: 0 24px 62px rgba(49, 60, 49, .11), 0 3px 10px rgba(49, 60, 49, .04);
          transform: rotate(-1.35deg);
          transition: transform .25s ease;
        }
        .im-sheet-stage:hover .im-notebook { transform: rotate(0deg) translateY(-3px); }
        .im-notebook-top, .im-note-title, .im-metrics, .im-work-row, .im-notebook-foot { position: relative; z-index: 1; }
        .im-notebook-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-left: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid #e7e1d5;
        }
        .im-client-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #405448;
          font: 600 12px "Source Serif 4", Georgia, serif;
        }
        .im-client-brand img { width: 26px; height: 26px; border-radius: 7px; background: #fff; }
        .im-week {
          color: #7d887e;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .13em;
        }
        .im-note-title { margin: 22px 0 16px 20px; }
        .im-note-eyebrow {
          margin: 0 0 7px;
          color: var(--im-clay);
          font-size: 9px;
          font-weight: 650;
          letter-spacing: .15em;
          text-transform: uppercase;
        }
        .im-note-title h2 {
          margin: 0;
          color: var(--im-ink);
          font: 400 29px/1.13 "Source Serif 4", Georgia, serif;
          letter-spacing: -.04em;
        }
        .im-note-title p { margin: 6px 0 0; color: #7b847c; font-size: 10px; }
        .im-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin: 0 0 16px 20px;
        }
        .im-metric {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 12px 9px 14px;
          border: 1px solid rgba(218, 212, 199, .9);
          background: rgba(249, 247, 239, .85);
        }
        .im-metric span { color: #788179; font-size: 8px; line-height: 1.3; }
        .im-metric strong { color: #344a3e; font: 400 clamp(15px, 1.8vw, 21px)/1 "Source Serif 4", Georgia, serif; white-space: nowrap; }
        .im-metric i { height: 3px; width: 56%; margin-top: 1px; background: var(--im-leaf); }
        .im-metric:nth-child(2) i { width: 73%; background: var(--im-clay); }
        .im-metric:nth-child(3) i { width: 42%; background: #a8ae8b; }
        .im-work-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 56px;
          margin-left: 20px;
          border-top: 1px solid #e7e1d5;
        }
        .im-work-icon {
          width: 30px; height: 30px;
          display: grid; place-items: center;
          flex: 0 0 auto;
          color: var(--im-leaf);
          background: #e5ebe1;
          border-radius: 8px;
        }
        .im-work-icon--clay { color: var(--im-clay); background: #f3e5dc; }
        .im-work-name { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 3px; }
        .im-work-name strong { color: #3e5147; font-size: 10px; }
        .im-work-name span { overflow: hidden; color: #7d867e; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
        .im-status { color: #63816c; font-size: 8px; font-weight: 650; letter-spacing: .08em; }
        .im-notebook-foot {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin: 0 0 0 20px;
          padding-top: 13px;
          border-top: 1px solid #e7e1d5;
          color: #788179;
          font-size: 9px;
        }
        .im-notebook-foot span { display: inline-flex; align-items: center; gap: 5px; }
        .im-stamp {
          position: absolute;
          z-index: 2;
          right: -6px;
          bottom: 6px;
          width: 92px;
          height: 92px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(59, 102, 84, .45);
          border-radius: 50%;
          color: var(--im-leaf);
          background: rgba(244, 240, 231, .87);
          text-align: center;
          transform: rotate(10deg);
        }
        .im-stamp span { width: 65px; font-size: 8px; font-weight: 650; letter-spacing: .13em; line-height: 1.45; text-transform: uppercase; }
        .im-story {
          position: relative;
          padding: 49px 0 28px;
          border-top: 1px solid var(--im-rule);
        }
        .im-story-heading {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 40px;
          align-items: end;
          padding: 0 0 29px;
        }
        .im-story-heading p {
          max-width: 370px;
          margin: 0 0 6px;
          color: var(--im-clay);
          font-size: 10px;
          font-weight: 650;
          letter-spacing: .15em;
          text-transform: uppercase;
        }
        .im-story-heading h2 {
          max-width: 590px;
          margin: 0;
          color: var(--im-ink);
          font: 400 clamp(34px, 4.2vw, 54px)/1.08 "Source Serif 4", Georgia, serif;
          letter-spacing: -.05em;
        }
        .im-features { border-top: 1px solid var(--im-rule); }
        .im-feature {
          display: grid;
          grid-template-columns: 74px minmax(190px, .8fr) 1.2fr 34px;
          gap: 24px;
          align-items: center;
          min-height: 104px;
          padding: 20px 5px;
          border-bottom: 1px solid var(--im-rule);
        }
        .im-feature-number { color: #9b8f77; font: 400 17px "Source Serif 4", Georgia, serif; }
        .im-feature-title { display: flex; align-items: center; gap: 13px; }
        .im-feature-icon {
          width: 35px; height: 35px;
          display: grid; place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          color: var(--im-leaf);
          background: #e3e9df;
        }
        .im-feature:nth-child(2) .im-feature-icon { color: #a45b44; background: #f1e2d9; }
        .im-feature:nth-child(3) .im-feature-icon { color: #75652f; background: #eee8d1; }
        .im-feature h3 { margin: 0; font: 400 22px/1.2 "Source Serif 4", Georgia, serif; letter-spacing: -.025em; }
        .im-feature p { max-width: 410px; margin: 0; color: #68756d; font-size: 12px; line-height: 1.7; }
        .im-feature-arrow { color: #a0947e; justify-self: end; }
        .im-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          padding: 24px 0 30px;
          color: #737f75;
          font-size: 10px;
        }
        .im-footer-brand { color: #46594d; font: 600 15px "Source Serif 4", Georgia, serif; }
        .im-legal { display: flex; align-items: center; gap: 20px; }
        .im-legal a { color: #496052; text-decoration: none; font-weight: 600; }
        @media (max-width: 880px) {
          .im-hero { grid-template-columns: 1fr; gap: 32px; padding-top: 66px; }
          .im-copy h1 { max-width: 710px; font-size: clamp(58px, 11vw, 88px); }
          .im-sheet-stage { width: min(100%, 590px); min-height: 435px; margin: 0 auto; }
          .im-story-heading { grid-template-columns: .65fr 1.35fr; }
          .im-feature { grid-template-columns: 44px minmax(190px, .9fr) 1.1fr 24px; gap: 15px; }
        }
        @media (max-width: 620px) {
          .im-wrap { width: calc(100% - 38px); }
          .im-nav { min-height: 70px; gap: 12px; }
          .im-brand { gap: 8px; font-size: 18px; }
          .im-brand img { width: 34px; height: 34px; }
          .im-nav-actions { gap: 12px; }
          .im-signin { font-size: 11px; }
          .im-nav-actions .im-button { min-height: 38px; padding: 0 11px; font-size: 10px; }
          .im-nav-actions .im-button svg { display: none; }
          .im-hero { padding: 53px 0 48px; gap: 31px; }
          .im-copy h1 { font-size: clamp(54px, 14vw, 78px); letter-spacing: -.07em; }
          .im-lede { margin: 19px 0 22px; font-size: 14px; line-height: 1.7; }
          .im-hero-actions { align-items: stretch; flex-direction: column; }
          .im-hero-actions .im-button { width: 100%; }
          .im-private { align-items: flex-start; font-size: 10px; line-height: 1.5; }
          .im-sheet-stage { min-height: 377px; padding: 7px 8px 18px 14px; }
          .im-sheet-stage::before { inset: 19px 1px 6px 28px; }
          .im-notebook { padding: 19px 15px 15px; }
          .im-notebook-top, .im-note-title, .im-metrics, .im-work-row, .im-notebook-foot { margin-left: 13px; }
          .im-metrics { gap: 5px; }
          .im-metric { padding: 10px 6px 12px; gap: 6px; }
          .im-metric span { font-size: 7px; }
          .im-metric strong { font-size: 16px; }
          .im-note-title h2 { font-size: 25px; }
          .im-note-title { margin-top: 18px; }
          .im-work-row { min-height: 52px; gap: 7px; }
          .im-work-name span { max-width: 152px; }
          .im-stamp { width: 74px; height: 74px; right: -2px; bottom: -1px; }
          .im-stamp span { width: 54px; font-size: 7px; }
          .im-story { padding: 37px 0 19px; }
          .im-story-heading { display: block; padding-bottom: 22px; }
          .im-story-heading p { margin-bottom: 11px; }
          .im-story-heading h2 { font-size: 39px; }
          .im-feature { grid-template-columns: 29px 1fr 24px; gap: 11px; min-height: auto; padding: 18px 0; }
          .im-feature-number { align-self: start; padding-top: 7px; font-size: 14px; }
          .im-feature-title { gap: 10px; }
          .im-feature h3 { font-size: 19px; }
          .im-feature p { grid-column: 2 / 4; margin-top: -3px; font-size: 11px; }
          .im-feature-arrow { grid-column: 3; grid-row: 1; }
          .im-feature-icon { width: 31px; height: 31px; }
          .im-footer { align-items: flex-start; flex-wrap: wrap; gap: 12px 20px; padding: 19px 0 25px; }
          .im-footer > span:nth-child(2) { order: 3; flex-basis: 100%; }
          .im-legal { gap: 15px; margin-left: auto; }
        }
        @media (prefers-reduced-motion: reduce) {
          .independent-maker *, .independent-maker *::before, .independent-maker *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="im-wrap">
        <header className="im-nav">
          <a href="/" className="im-brand">
            <img src={brandMarkUrl} alt="" />
            <span>Solo Studio</span>
          </a>
          <nav className="im-nav-actions" aria-label="Account">
            <a href="/sign-in" className="im-signin">Sign in</a>
            <a href="/sign-up" className="im-button im-button--primary">Create your workspace <ArrowRight size={14} aria-hidden="true" /></a>
          </nav>
        </header>

        <section className="im-hero" aria-labelledby="im-title">
          <div className="im-copy">
            <p className="im-kicker">A calmer way to run your studio</p>
            <h1 id="im-title">Make space for the <em>work you love.</em></h1>
            <p className="im-lede">Keep clients, projects, proposals, time and invoices together, without losing sight of the creative work behind them.</p>
            <div className="im-hero-actions">
              <a href="/sign-up" className="im-button im-button--primary">Start your private workspace <ArrowRight size={15} aria-hidden="true" /></a>
              <a href="/sign-in" className="im-button">I already have an account</a>
            </div>
            <p className="im-private">
              <span className="im-check"><Check size={13} aria-hidden="true" /></span>
              Your studio records stay private to your account
            </p>
          </div>

          <div className="im-sheet-stage" aria-label="A preview of the Solo Studio dashboard">
            <div className="im-notebook">
              <div className="im-notebook-top">
                <div className="im-client-brand"><img src={brandMarkUrl} alt="" /><span>Fieldnotes Studio</span></div>
                <span className="im-week">THIS WEEK</span>
              </div>
              <div className="im-note-title">
                <p className="im-note-eyebrow">Your studio at a glance</p>
                <h2>Good work, in motion.</h2>
                <p>Everything important, in one clear view.</p>
              </div>
              <div className="im-metrics">
                <div className="im-metric"><span>Active projects</span><strong>03</strong><i aria-hidden="true" /></div>
                <div className="im-metric"><span>To come in</span><strong>£4,800</strong><i aria-hidden="true" /></div>
                <div className="im-metric"><span>Open tasks</span><strong>07</strong><i aria-hidden="true" /></div>
              </div>
              <div className="im-work-row">
                <span className="im-work-icon"><FolderKanban size={15} aria-hidden="true" /></span>
                <div className="im-work-name"><strong>North &amp; Kind</strong><span>Seasonal story · In progress</span></div>
                <span className="im-status">ON TRACK</span>
              </div>
              <div className="im-work-row">
                <span className="im-work-icon im-work-icon--clay"><BookOpen size={15} aria-hidden="true" /></span>
                <div className="im-work-name"><strong>Common Ground</strong><span>Identity system · Completed</span></div>
                <span className="im-status">READY</span>
              </div>
              <div className="im-notebook-foot">
                <span><Users size={13} aria-hidden="true" /> Clients</span>
                <span><Wallet size={13} aria-hidden="true" /> Money</span>
                <span><BookOpen size={13} aria-hidden="true" /> Buildbook</span>
              </div>
            </div>
            <div className="im-stamp" aria-hidden="true"><span>Good work<br />happens here</span></div>
          </div>
        </section>

        <section className="im-story" aria-labelledby="im-story-title">
          <div className="im-story-heading">
            <p>Room for the work</p>
            <h2 id="im-story-title">The practical side, in its place.</h2>
          </div>
          <div className="im-features">
            <article className="im-feature">
              <span className="im-feature-number">01</span>
              <div className="im-feature-title">
                <span className="im-feature-icon"><Users size={17} aria-hidden="true" /></span>
                <h3>Keep good people close</h3>
              </div>
              <p>Track leads, clients and proposals from first conversation to signed work.</p>
              <ArrowDownRight className="im-feature-arrow" size={19} aria-hidden="true" />
            </article>
            <article className="im-feature">
              <span className="im-feature-number">02</span>
              <div className="im-feature-title">
                <span className="im-feature-icon"><FolderKanban size={17} aria-hidden="true" /></span>
                <h3>Keep work moving</h3>
              </div>
              <p>Bring projects, tasks and time together so the next step is easy to see.</p>
              <ArrowDownRight className="im-feature-arrow" size={19} aria-hidden="true" />
            </article>
            <article className="im-feature">
              <span className="im-feature-number">03</span>
              <div className="im-feature-title">
                <span className="im-feature-icon"><Wallet size={17} aria-hidden="true" /></span>
                <h3>Know where you stand</h3>
              </div>
              <p>See invoices, payments and expenses alongside the work they belong to.</p>
              <ArrowDownRight className="im-feature-arrow" size={19} aria-hidden="true" />
            </article>
          </div>
        </section>

        <footer className="im-footer">
          <span className="im-footer-brand">Solo Studio</span>
          <span>Made for independent makers.</span>
          <nav className="im-legal" aria-label="Legal">
            <a href="/privacy" data-testid="link-footer-privacy">Privacy</a>
            <a href="/cookies" data-testid="link-footer-cookies">Cookies</a>
            <a href="/terms" data-testid="link-footer-terms">Terms</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
