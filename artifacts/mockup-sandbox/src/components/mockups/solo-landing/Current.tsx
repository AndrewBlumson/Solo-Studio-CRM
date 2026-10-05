import { useEffect } from "react";
import { ArrowRight, BookOpen, Check, FolderKanban, Users, Wallet } from "lucide-react";
import brandMarkUrl from "@/assets/solo-studio-mark.png";
import "./_group.css";

export function Current() {
  useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.media = "print";
    fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap";
    fontLink.onload = () => { fontLink.media = "all"; };
    document.head.append(fontLink);
    return () => fontLink.remove();
  }, []);

  return (
    <main className="marketing-shell">
      <header className="marketing-nav">
        <a href="/" className="marketing-brand">
          <img src={brandMarkUrl} alt="" />
          <span>Solo Studio</span>
        </a>
        <nav className="marketing-actions" aria-label="Account">
          <a href="/sign-in" className="marketing-signin">Sign in</a>
          <a href="/sign-up" className="button primary">Create your workspace <ArrowRight size={15} /></a>
        </nav>
      </header>
      <section className="home-hero">
        <div className="home-copy">
          <div className="eyebrow">A calmer way to run your studio</div>
          <h1>Make space for the work you love.</h1>
          <p>Keep clients, projects, proposals, time and invoices together, without losing sight of the creative work behind them.</p>
          <div className="home-actions">
            <a href="/sign-up" className="button primary">Start your private workspace <ArrowRight size={15} /></a>
            <a href="/sign-in" className="button">I already have an account</a>
          </div>
          <div className="home-private">
            <span className="home-check"><Check size={13} /></span>
            Your studio records stay private to your account
          </div>
        </div>
        <div className="home-preview" aria-label="A preview of the Solo Studio dashboard">
          <div className="home-preview-top">
            <div className="home-preview-brand"><img src={brandMarkUrl} alt="" /> <span>Fieldnotes Studio</span></div>
            <span className="home-preview-label">THIS WEEK</span>
          </div>
          <div className="home-preview-heading">
            <div className="eyebrow">Your studio at a glance</div>
            <h2>Good work, in motion.</h2>
            <p>Everything important, in one clear view.</p>
          </div>
          <div className="home-preview-stats">
            <div><span>Active projects</span><strong>03</strong><i className="preview-bar preview-bar-green" /></div>
            <div><span>To come in</span><strong>£4,800</strong><i className="preview-bar preview-bar-clay" /></div>
            <div><span>Open tasks</span><strong>07</strong><i className="preview-bar preview-bar-soft" /></div>
          </div>
          <div className="home-preview-work">
            <span className="home-preview-icon"><FolderKanban size={16} /></span>
            <div><strong>North &amp; Kind</strong><span>Seasonal story · In progress</span></div>
            <span className="preview-status">ON TRACK</span>
          </div>
          <div className="home-preview-work">
            <span className="home-preview-icon home-preview-icon-clay"><BookOpen size={16} /></span>
            <div><strong>Common Ground</strong><span>Identity system · Completed</span></div>
            <span className="preview-status">READY</span>
          </div>
          <div className="home-preview-foot">
            <span><Users size={14} /> Clients</span>
            <span><Wallet size={14} /> Money</span>
            <span><BookOpen size={14} /> Buildbook</span>
          </div>
        </div>
      </section>
      <section className="home-features">
        <div>
          <span className="feature-icon"><Users size={17} /></span>
          <h2>Keep good people close</h2>
          <p>Track leads, clients and proposals from first conversation to signed work.</p>
        </div>
        <div>
          <span className="feature-icon"><FolderKanban size={17} /></span>
          <h2>Keep work moving</h2>
          <p>Bring projects, tasks and time together so the next step is easy to see.</p>
        </div>
        <div>
          <span className="feature-icon"><Wallet size={17} /></span>
          <h2>Know where you stand</h2>
          <p>See invoices, payments and expenses alongside the work they belong to.</p>
        </div>
      </section>
      <footer className="marketing-footer">
        <span>Solo Studio</span>
        <span>Made for independent makers.</span>
        <nav aria-label="Legal" className="marketing-legal-links">
          <a href="/privacy" data-testid="link-footer-privacy">Privacy</a>
          <a href="/cookies" data-testid="link-footer-cookies">Cookies</a>
          <a href="/terms" data-testid="link-footer-terms">Terms</a>
        </nav>
      </footer>
    </main>
  );
}
