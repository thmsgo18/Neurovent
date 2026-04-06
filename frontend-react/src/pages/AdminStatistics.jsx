import { useEffect, useState } from "react";
import "../styles/Admin.css";
import { getAdminStats } from "../api/admin";

function StatBlock({ label, value, hint }) {
  return (
    <div className="admin-kpi">
      <p className="admin-kpi-label">{label}</p>
      <p className="admin-kpi-value">{value}</p>
      {hint ? <p className="admin-kpi-hint">{hint}</p> : null}
    </div>
  );
}

export default function AdminStatistics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <div className="admin-empty">Loading platform statistics...</div>
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
              <h1 className="admin-title">Statistics</h1>
              <p className="admin-copy">
                A global view of growth, moderation load, event publishing, and registration activity across the whole platform.
              </p>
            </div>
          </header>

          <section className="admin-section">
            <div className="admin-kpis">
              <StatBlock label="Participants" value={users.total_participants} hint="Total participant accounts" />
              <StatBlock label="Companies" value={users.total_companies} hint="Organization accounts on the platform" />
              <StatBlock label="Admins" value={users.total_admins} hint="Django admin accounts" />
              <StatBlock label="Active Accounts" value={users.active_total} hint="Currently active users across all roles" />
              <StatBlock label="Total Events" value={events.total} hint={`${events.new_this_month} created this month`} />
              <StatBlock label="Event Views" value={events.total_views} hint="Total public event detail views" />
              <StatBlock label="Registrations" value={registrations.total} hint="All registration records" />
              <StatBlock label="New Users" value={users.new_this_month} hint="Accounts created this month" />
            </div>
          </section>

          <div className="admin-grid">
            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">Company Verification</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label="Pending" value={users.company_verification.pending} />
                <StatBlock label="Needs Review" value={users.company_verification.needs_review} />
                <StatBlock label="Verified" value={users.company_verification.verified} />
                <StatBlock label="Rejected" value={users.company_verification.rejected} />
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">Registrations by Status</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label="Confirmed" value={registrations.by_status.confirmed} />
                <StatBlock label="Pending" value={registrations.by_status.pending} />
                <StatBlock label="Waitlist" value={registrations.by_status.waitlist} />
                <StatBlock label="Cancelled" value={registrations.by_status.cancelled} />
              </div>
            </section>
          </div>

          <div className="admin-grid">
            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">Events by Status</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label="Published" value={events.by_status.published} />
                <StatBlock label="Draft" value={events.by_status.draft} />
                <StatBlock label="Cancelled" value={events.by_status.cancelled} />
              </div>
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">Events by Format</h2>
              </div>
              <div className="admin-kpis">
                <StatBlock label="In-Person" value={events.by_format.onsite} />
                <StatBlock label="Online" value={events.by_format.online} />
                <StatBlock label="Hybrid" value={events.by_format.hybrid} />
              </div>
            </section>
          </div>

          <section className="admin-section">
            <div className="admin-section-head">
              <h2 className="admin-section-title">Top Events by Confirmed Registrations</h2>
            </div>
            <div className="admin-top-list">
              {(events.top_5_popular || []).map((item) => (
                <div key={item.id} className="admin-top-item">
                  <div>
                    <strong>{item.title}</strong>
                    <span> {item.format} · {item.status}</span>
                  </div>
                  <span>{item.confirmed_count} confirmed</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
