import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Users, BarChart2, Lock } from "lucide-react";
import { isAuthed } from "../store/authStore";
import { usePreferences } from "../context/PreferencesContext";
import PageShell from "../components/PageShell";
import "../styles/Home.css";

const STATS = [
  { value: "120+", label: "Events published" },
  { value: "2 400+", label: "Participants registered" },
  { value: "38", label: "Partner organizations" },
  { value: "12", label: "Countries" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse events", desc: "Filter by format, tags, city or date. Find workshops, conferences and seminars that match your research." },
  { step: "02", title: "Register in one click", desc: "Instant confirmation or manual validation depending on the organizer. You get notified by email at every step." },
  { step: "03", title: "Attend & connect", desc: "Join in person or online. Access the full address and link once confirmed." },
];

const FOR_ORGANIZATIONS = [
  { Icon: Zap, title: "Publish in minutes", desc: "Create your event with title, description, tags, format and capacity. It goes live immediately." },
  { Icon: Users, title: "Manage registrations", desc: "Approve or reject participants individually. Auto-confirm mode available for open events." },
  { Icon: BarChart2, title: "Track attendance", desc: "Real-time stats: confirmed, pending, waitlist. Export the full list as CSV anytime." },
  { Icon: Lock, title: "Control visibility", desc: "Choose when to reveal the full address or online link — before or after confirmation." },
];

export default function Home() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const authed = isAuthed();
  const statsRef = useRef(null);

  // Stats: counter animation on scroll into view
  useEffect(() => {
    const container = statsRef.current;
    if (!container) return;
    const items = container.querySelectorAll(".home-stat-value");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const raw = el.dataset.target || "";
          const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
          const suffix = raw.replace(/[0-9.]/g, "");
          if (isNaN(num)) return;
          let start = 0;
          const duration = 1200;
          const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = (Math.floor(eased * num)).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <PageShell className="home-page">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-text">
          <h1 className="home-title">
            {t("THE FUTURE OF")}
            <br />
            <span className="home-title-accent">
              {t("RESEARCH")}
              <br />
              {t("EVENTS.")}
            </span>
          </h1>
          <p className="home-subtitle">
            {t("Connect with global scientists. Host and join world-class conferences in AI, ML and Neuroscience.")}
          </p>
          <div className="home-hero-cta">
            <button className="btn btn-primary" onClick={() => navigate("/events")}>
              {t("Explore Events")}
            </button>
            {!authed && (
              <button className="btn btn-ghost home-cta-btn" onClick={() => navigate("/register")}>
                {t("Create Account")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="home-stats" ref={statsRef}>
        {STATS.map((s) => (
          <div key={s.label} className="home-stat-item">
            <p className="home-stat-value" data-target={s.value}>{s.value}</p>
            <p className="home-stat-label">{t(s.label)}</p>
          </div>
        ))}
      </div>

      {/* Preview cards */}
      <div className="home-preview">
        <div className="home-preview-grid">
            {[
            { label: t("Upcoming"), tone: "accent", text: t("Workshop FL & Privacy — Paris") },
            { label: t("Live"), tone: "secondary", text: t("Multi-Agent Systems Practice") },
            { label: t("May 20"), tone: "dim", text: t("ML Security Conference — Lyon") },
          ].map((item, i) => (
            <div key={i} className="card card-hover home-preview-card" onClick={() => navigate("/events")}>
              <span className={`home-preview-label home-preview-label--${item.tone}`}>{item.label}</span>
              <p className="home-preview-text">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="home-section">
        <div className="home-section-inner">
          <p className="home-section-eyebrow">{t("For participants")}</p>
          <h2 className="home-section-title">{t("How it works")}</h2>
          <div className="home-steps">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="home-step">
                <span className="home-step-number">{s.step}</span>
                <h3 className="home-step-title">{t(s.title)}</h3>
                <p className="home-step-desc">{t(s.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Organizations */}
      <section className="home-section home-section-alt">
        <div className="home-section-inner">
          <p className="home-section-eyebrow home-section-eyebrow--secondary">{t("For organizations")}</p>
          <h2 className="home-section-title">{t("Everything you need to organize research events")}</h2>
          <div className="home-features">
            {FOR_ORGANIZATIONS.map(({ Icon, title, desc }) => (
              <div key={title} className="home-feature-card">
                <div className="home-feature-icon">
                  <Icon size={22} color="var(--accent)" strokeWidth={1.8} />
                </div>
                <h3 className="home-feature-title">{t(title)}</h3>
                <p className="home-feature-desc">{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!authed && (
        <section className="home-cta">
          <div className="home-section-inner home-section-inner--centered">
            <h2 className="home-section-title home-section-title--compact">
              {t("Ready to join the community?")}
            </h2>
            <p className="home-cta-copy">
              {t("Register as a participant to discover and attend events,")}<br />{t("or create an organization account to publish your own.")}
            </p>
            <div className="home-cta-actions">
              <Link to="/register" className="btn btn-primary">
                {t("Register as Participant")}
              </Link>
              <Link to="/login" className="btn btn-ghost home-cta-btn">
                {t("Organization Sign In")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <p>{t("© 2026 Neurovent — Scientific Event Platform")}</p>
        <div className="home-footer-links">
          <Link to="/events" className="home-footer-link">{t("Events")}</Link>
          <Link to="/login" className="home-footer-link">{t("Sign In")}</Link>
          <Link to="/register" className="home-footer-link">{t("Register")}</Link>
        </div>
      </footer>

    </PageShell>
  );
}
