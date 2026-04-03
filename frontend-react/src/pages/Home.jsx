import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Users, BarChart2, Lock } from "lucide-react";
import { isAuthed } from "../store/authStore";
import "../styles/Home.css";

const STATS = [
  { value: "120+", label: "Events published" },
  { value: "2 400+", label: "Researchers registered" },
  { value: "38", label: "Partner labs" },
  { value: "12", label: "Countries" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse events", desc: "Filter by format, tags, city or date. Find workshops, conferences and seminars that match your research." },
  { step: "02", title: "Register in one click", desc: "Instant confirmation or manual validation depending on the organizer. You get notified by email at every step." },
  { step: "03", title: "Attend & connect", desc: "Join in person or online. Access the full address and link once confirmed." },
];

const FOR_LABS = [
  { Icon: Zap, title: "Publish in minutes", desc: "Create your event with title, description, tags, format and capacity. It goes live immediately." },
  { Icon: Users, title: "Manage registrations", desc: "Approve or reject participants individually. Auto-confirm mode available for open events." },
  { Icon: BarChart2, title: "Track attendance", desc: "Real-time stats: confirmed, pending, waitlist. Export the full list as CSV anytime." },
  { Icon: Lock, title: "Control visibility", desc: "Choose when to reveal the full address or online link — before or after confirmation." },
];

export default function Home() {
  const navigate = useNavigate();
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
    <div className="home-page">
      {/* Hero */}
      <main className="home-hero">
        <div className="home-hero-text">
          <h1 className="home-title">
            THE FUTURE OF
            <br />
            <span className="home-title-accent">
              RESEARCH
              <br />
              EVENTS.
            </span>
          </h1>
          <p className="home-subtitle">
            Connect with global scientists. Host and join world-class conferences in AI, ML and Neuroscience.
          </p>
          <div className="home-hero-cta">
            <button className="btn btn-primary" onClick={() => navigate("/events")}>
              Explore Events
            </button>
            {!authed && (
              <button className="btn btn-ghost" onClick={() => navigate("/register")} style={{ border: "1px solid var(--border-strong)" }}>
                Create Account
              </button>
            )}
          </div>
        </div>

      </main>

      {/* Stats bar */}
      <div className="home-stats" ref={statsRef}>
        {STATS.map((s) => (
          <div key={s.label} className="home-stat-item">
            <p className="home-stat-value" data-target={s.value}>{s.value}</p>
            <p className="home-stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Preview cards */}
      <div className="home-preview">
        <div className="home-preview-grid">
          {[
            { label: "Upcoming", color: "var(--accent)", text: "Workshop FL & Privacy — Paris" },
            { label: "Live", color: "var(--secondary)", text: "Multi-Agent Systems Practice" },
            { label: "May 20", color: "var(--text-dim)", text: "ML Security Conference — Lyon" },
          ].map((item, i) => (
            <div key={i} className="card card-hover home-preview-card" onClick={() => navigate("/events")}>
              <span className="home-preview-label" style={{ color: item.color }}>{item.label}</span>
              <p className="home-preview-text">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="home-section">
        <div className="home-section-inner">
          <p className="home-section-eyebrow">For researchers</p>
          <h2 className="home-section-title">How it works</h2>
          <div className="home-steps">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="home-step">
                <span className="home-step-number">{s.step}</span>
                <h3 className="home-step-title">{s.title}</h3>
                <p className="home-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Labs */}
      <section className="home-section home-section-alt">
        <div className="home-section-inner">
          <p className="home-section-eyebrow" style={{ color: "var(--secondary)" }}>For labs &amp; organizations</p>
          <h2 className="home-section-title">Everything you need to organize research events</h2>
          <div className="home-features">
            {FOR_LABS.map(({ Icon, title, desc }) => (
              <div key={title} className="home-feature-card">
                <div className="home-feature-icon">
                  <Icon size={22} color="var(--accent)" strokeWidth={1.8} />
                </div>
                <h3 className="home-feature-title">{title}</h3>
                <p className="home-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!authed && (
        <section className="home-cta">
          <div className="home-section-inner" style={{ textAlign: "center" }}>
            <h2 className="home-section-title" style={{ marginBottom: "16px", maxWidth: "unset" }}>
              Ready to join the community?
            </h2>
            <p className="home-cta-copy">
              Register as a researcher to discover and attend events,<br />or create a lab account to publish your own.
            </p>
            <div className="home-cta-actions">
              <Link to="/register" className="btn btn-primary">
                Register as Researcher
              </Link>
              <Link to="/login" className="btn btn-ghost" style={{ border: "1px solid var(--border-strong)" }}>
                Lab Sign In
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <p>© 2026 Neurovent — Scientific Event Platform</p>
        <div className="home-footer-links">
          <Link to="/events" className="home-footer-link">Events</Link>
          <Link to="/login" className="home-footer-link">Sign In</Link>
          <Link to="/register" className="home-footer-link">Register</Link>
        </div>
      </footer>

    </div>
  );
}
