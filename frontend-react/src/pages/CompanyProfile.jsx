import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Youtube, Linkedin } from "lucide-react";
import { getCompanyProfile } from "../api/companies";
import { normalizeEvent } from "../api/events";

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyProfile(id)
      .then(setCompany)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-dim)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{"// loading..."}</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Organization not found.</p>
      </div>
    );
  }

  const events = (company.events || []).map(normalizeEvent);
  const initials = (company.company_name || "NV").substring(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <main style={{ maxWidth: "900px", margin: "0 auto", width: "100%", padding: "48px 32px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: 0, marginBottom: "24px" }}>
          <ArrowLeft size={15} /> Back
        </button>

        {/* Company header */}
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "40px" }}>
          {company.company_logo ? (
            <img src={company.company_logo} alt={company.company_name} style={{ width: "80px", height: "80px", borderRadius: "16px", objectFit: "cover", border: "1px solid var(--border)" }} />
          ) : (
            <div style={{ width: "80px", height: "80px", borderRadius: "16px", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: "#fff", flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "32px", fontWeight: "800", marginBottom: "8px" }}>{company.company_name}</h1>
            {company.company_description && (
              <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "16px" }}>
                {company.company_description}
              </p>
            )}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {company.website_url && (
                <a href={company.website_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--accent)", textDecoration: "none" }}>
                  <Globe size={14} /> Website
                </a>
              )}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--accent)", textDecoration: "none" }}>
                  <Linkedin size={14} /> LinkedIn
                </a>
              )}
              {company.youtube_url && (
                <a href={company.youtube_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--accent)", textDecoration: "none" }}>
                  <Youtube size={14} /> YouTube
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Events */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>
            Events ({events.length})
          </h2>
          {events.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>No published events yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 24px", cursor: "pointer", transition: "var(--transition)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--surface-high)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>{event.title}</h3>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      {event.city ? `${event.city}, ${event.country}` : event.format === "online" ? "Online" : "TBD"}
                    </span>
                    {event.date_start && (
                      <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        {new Date(event.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontSize: "13px", color: event.is_full ? "var(--error)" : "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
                      {event.is_full ? "Full" : `${event.spots_remaining ?? "?"} spots left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
