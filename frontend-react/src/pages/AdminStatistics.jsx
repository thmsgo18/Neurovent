import { useEffect, useState } from "react";
import "../styles/Admin.css";
import { getAdminStats } from "../api/admin";
import { usePreferences } from "../context/PreferencesContext";

function StatBlock({ label, value, hint }) {
  return (
    <div className="admin-kpi">
      <p className="admin-kpi-label">{label}</p>
      <p className="admin-kpi-value">{value}</p>
      {hint ? <p className="admin-kpi-hint">{hint}</p> : null}
    </div>
  );
}

function translateEventStatus(value, t) {
  const normalized = (value || "").toString().trim().toUpperCase();

  if (normalized === "PUBLISHED") return t("Published");
  if (normalized === "DRAFT") return t("Draft");
  if (normalized === "CANCELLED") return t("Cancelled");
  if (normalized === "UPCOMING") return t("Upcoming");
  if (normalized === "LIVE") return t("Live");
  if (normalized === "PAST") return t("Past");
  return value || t("Unknown");
}

function translateEventFormat(value, t) {
  const normalized = (value || "").toString().trim().toUpperCase();

  if (normalized === "ONSITE" || normalized === "IN-PERSON" || normalized === "IN_PERSON") return t("In-Person");
  if (normalized === "ONLINE") return t("Online");
  if (normalized === "HYBRID") return t("Hybrid");
  return value || t("Unknown");
}

export default function AdminStatistics() {
  const { t } = usePreferences();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <div className="admin-empty">{t("Loading platform statistics...")}</div>
        </div>
      </div>
    );
  }

  const { users, events, registrations } = stats;

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">{t("Statistics")}</h1>
              <p className="admin-copy">
                {t("A global view of growth, moderation load, event publishing, and registration activity across the whole platform.")}
              </p>
            </div>
          </header>

          <section className="admin-section">
            <div className="admin-kpis">
              <StatBlock label={t("Participants")} value={users.total_participants} hint={t("Total participant accounts")} />
              <StatBlock label={t("Companies")} value={users.total_companies} hint={t("Organization accounts on the platform")} />
              <StatBlock label={t("Admins")} value={users.total_admins} hint={t("Django admin accounts")} />
              <StatBlock label={t("Active Accounts")} value={users.active_total} hint={t("Currently active users across all roles")} />
              <StatBlock label={t("Total Events")} value={events.total} hint={t("{{count}} created this month", { count: events.new_this_month })} />
              <StatBlock label={t("Event Views")} value={events.total_views} hint={t("Total public event detail views")} />
              <StatBlock label={t("Registrations")} value={registrations.total} hint={t("All registration records")} />
              <StatBlock label={t("New Users")} value={users.new_this_month} hint={t("Accounts created this month")} />
            </div>
          </section>

          <div className="admin-grid">
            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t("Company Verification")}</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label={t("Pending")} value={users.company_verification.pending} />
                <StatBlock label={t("Needs Review")} value={users.company_verification.needs_review} />
                <StatBlock label={t("Verified")} value={users.company_verification.verified} />
                <StatBlock label={t("Rejected")} value={users.company_verification.rejected} />
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t("Registrations by Status")}</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label={t("Confirmed")} value={registrations.by_status.confirmed} />
                <StatBlock label={t("Pending")} value={registrations.by_status.pending} />
                <StatBlock label={t("Waitlist")} value={registrations.by_status.waitlist} />
                <StatBlock label={t("Cancelled")} value={registrations.by_status.cancelled} />
              </div>
            </section>
          </div>

          <div className="admin-grid">
            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t("Events by Status")}</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label={t("Published")} value={events.by_status.published} />
                <StatBlock label={t("Draft")} value={events.by_status.draft} />
                <StatBlock label={t("Cancelled")} value={events.by_status.cancelled} />
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t("Events by Format")}</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label={t("In-Person")} value={events.by_format.onsite} />
                <StatBlock label={t("Online")} value={events.by_format.online} />
                <StatBlock label={t("Hybrid")} value={events.by_format.hybrid} />
              </div>
            </section>
          </div>

          <section className="admin-section">
            <div className="admin-section-head">
              <h2 className="admin-section-title">{t("Top Events by Confirmed Registrations")}</h2>
            </div>
            <ul className="admin-top-list collection-list collection-list--compact">
              {(events.top_5_popular || []).map((item) => (
                <li key={item.id} className="collection-list__item">
                  <div className="admin-top-item">
                    <div>
                      <strong>{item.title}</strong>
                      <span> {translateEventFormat(item.format, t)} · {translateEventStatus(item.status, t)}</span>
                    </div>
                    <span>{t("{{count}} confirmed", { count: item.confirmed_count })}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
