import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, AlertCircle, CheckCircle } from "lucide-react";
import "../styles/Profile.css";
import { getRole, logout } from "../store/authStore";
import { getMeApi, updateMeApi, changePasswordApi, deleteAccountApi } from "../api/auth";
import { getTags, getTagsSync } from "../api/tags";

// ---- Shared sidebar ----
function ProfileShell({ navItems, activeKey, onNav, topTitle, children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <aside
        style={{
          width: "180px",
          minWidth: "180px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "16px",
        }}
      >
        <Link to="/" style={{ textDecoration: "none", marginBottom: "28px", display: "block" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "16px", color: "var(--text)" }}>
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: activeKey === item.key ? "700" : "500",
                cursor: "pointer",
                background: activeKey === item.key ? "rgba(0,229,255,0.1)" : "transparent",
                color: activeKey === item.key ? "var(--accent)" : "var(--text-dim)",
                transition: "var(--transition)",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            fontSize: "11px",
            padding: "8px 12px",
            borderRadius: "8px",
            transition: "var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--error)";
            e.currentTarget.style.background = "rgba(255,77,77,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-dim)";
            e.currentTarget.style.background = "none";
          }}
        >
          <LogOut size={13} />
          Log out
        </button>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            height: "52px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            flexShrink: 0,
            background: "rgba(12,12,20,0.8)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "700" }}>{topTitle}</h3>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---- USER PROFILE ----
function UserProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    university: "",
    field: "",
  });
  const [allTags, setAllTags] = useState(() => getTagsSync() || []); // [{id, name}]
  const [selectedTagIds, setSelectedTagIds] = useState([]); // [1, 2, 3]
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState(null); // null | "ok" | error string
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getMeApi().then((me) => {
      setForm({
        firstName: me.first_name || "",
        lastName: me.last_name || "",
        email: me.email || "",
        university: me.employer_name || "",
        field: "",
      });
      setSelectedTagIds((me.tags || []).map((t) => (typeof t === "object" ? t.id : t)));
    }).catch(console.error);
    if (allTags.length === 0) getTags().then(setAllTags).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateMeApi({
        first_name: form.firstName,
        last_name: form.lastName,
        employer_name: form.university,
        tag_ids: selectedTagIds,
      });
    } catch (err) {
      console.error(err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwStatus(null);
    if (pwForm.new !== pwForm.confirm) {
      setPwStatus("Passwords do not match.");
      return;
    }
    try {
      await changePasswordApi(pwForm.old, pwForm.new, pwForm.confirm);
      setPwStatus("ok");
      setPwForm({ old: "", new: "", confirm: "" });
    } catch (err) {
      setPwStatus(err.message || "Failed to change password.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteLoading(true);
    try {
      await deleteAccountApi();
      logout();
      navigate("/");
    } catch (err) {
      alert(err.message || "Failed to delete account.");
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const navItems = [
    { key: "console", label: "Console" },
    { key: "settings", label: "Settings" },
  ];

  const handleNav = (key) => {
    if (key === "console") navigate("/dashboard");
  };

  const initials = form.firstName && form.lastName
    ? (form.firstName.charAt(0) + form.lastName.charAt(0)).toUpperCase()
    : "?";

  return (
    <ProfileShell
      navItems={navItems}
      activeKey="settings"
      onNav={handleNav}
      topTitle="Profile Information"
    >
      <form onSubmit={handleSave} style={{ maxWidth: "560px" }}>
        {/* Avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "800",
              color: "#000",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "4px" }}>
              {form.firstName} {form.lastName}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{form.email}</p>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">First Name</label>
            <input
              type="text"
              className="input"
              style={{ height: "44px" }}
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Last Name</label>
            <input
              type="text"
              className="input"
              style={{ height: "44px" }}
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">University</label>
            <input
              type="text"
              className="input"
              style={{ height: "44px" }}
              value={form.university}
              onChange={(e) => set("university", e.target.value)}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Research Field</label>
            <input
              type="text"
              className="input"
              style={{ height: "44px" }}
              value={form.field}
              onChange={(e) => set("field", e.target.value)}
            />
          </div>
        </div>

        {/* Research interests */}
        <div style={{ marginBottom: "32px" }}>
          <label className="form-label">Research Interests</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {allTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelectedTagIds((prev) =>
                      selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    )
                  }
                  style={{
                    padding: "5px 14px",
                    borderRadius: "100px",
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: selected ? "rgba(0,229,255,0.1)" : "transparent",
                    color: selected ? "var(--accent)" : "var(--text-dim)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    transition: "var(--transition)",
                  }}
                >
                  {tag.name} {selected ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: "12px 28px", fontSize: "14px" }}
        >
          {saved ? "Saved ✓" : "Save Academic Profile"}
        </button>
      </form>

      {/* Password change */}
      <div
        style={{
          maxWidth: "560px",
          marginTop: "40px",
          paddingTop: "32px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "20px" }}>Change Password</h3>
        <form onSubmit={handlePasswordChange}>
          {pwStatus === "ok" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0,255,149,0.08)",
                border: "1px solid rgba(0,255,149,0.2)",
                color: "var(--success)",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <CheckCircle size={15} />
              Password updated successfully.
            </div>
          )}
          {pwStatus && pwStatus !== "ok" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255,77,77,0.08)",
                border: "1px solid rgba(255,77,77,0.2)",
                color: "var(--error)",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={15} />
              {pwStatus}
            </div>
          )}
          <div className="form-field">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="input"
              style={{ height: "44px" }}
              placeholder="••••••••"
              value={pwForm.old}
              onChange={(e) => setPwForm((f) => ({ ...f, old: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input"
                style={{ height: "44px" }}
                placeholder="••••••••"
                value={pwForm.new}
                onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
                required
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                style={{ height: "44px" }}
                placeholder="••••••••"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ marginTop: "20px", padding: "10px 24px", fontSize: "13px" }}
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div style={{ maxWidth: "560px", marginTop: "40px", paddingTop: "32px", borderTop: "1px solid rgba(255,77,77,0.2)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--error)", marginBottom: "8px" }}>Danger Zone</h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.5" }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
          style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid rgba(255,77,77,0.4)", background: deleteConfirm ? "rgba(255,77,77,0.15)" : "rgba(255,77,77,0.06)", color: "var(--error)", fontSize: "13px", fontWeight: "600", cursor: deleteLoading ? "not-allowed" : "pointer" }}
        >
          {deleteLoading ? "Deleting..." : deleteConfirm ? "Confirm — delete my account" : "Delete My Account"}
        </button>
        {deleteConfirm && (
          <button onClick={() => setDeleteConfirm(false)} style={{ marginLeft: "12px", background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", cursor: "pointer" }}>
            Cancel
          </button>
        )}
      </div>
    </ProfileShell>
  );
}

// ---- ORG PROFILE ----
function OrgProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    description: "",
    website_url: "",
    youtube_url: "",
    linkedin_url: "",
    twitter_url: "",
    instagram_url: "",
    facebook_url: "",
  });
  const [allTags, setAllTags] = useState(() => getTagsSync() || []);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getMeApi().then((me) => {
      setForm({
        name: me.company_name || "",
        email: me.recovery_email || "",
        description: me.company_description || "",
        website_url: me.website_url || "",
        youtube_url: me.youtube_url || "",
        linkedin_url: me.linkedin_url || "",
        twitter_url: me.twitter_url || "",
        instagram_url: me.instagram_url || "",
        facebook_url: me.facebook_url || "",
      });
      setSelectedTagIds((me.tags || []).map((t) => (typeof t === "object" ? t.id : t)));
    }).catch(console.error);
    if (allTags.length === 0) getTags().then(setAllTags).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");
    try {
      await updateMeApi({
        company_name: form.name,
        company_description: form.description,
        website_url: form.website_url,
        youtube_url: form.youtube_url,
        linkedin_url: form.linkedin_url,
        twitter_url: form.twitter_url,
        instagram_url: form.instagram_url,
        facebook_url: form.facebook_url,
        tag_ids: selectedTagIds,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err.message || "Failed to save.");
    }
  };

  const navItems = [
    { key: "events", label: "Events List" },
    { key: "lab", label: "Lab Profile" },
  ];

  const handleNav = (key) => {
    if (key === "events") navigate("/dashboard");
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteLoading(true);
    try {
      await deleteAccountApi();
      logout();
      navigate("/");
    } catch (err) {
      alert(err.message || "Failed to delete account.");
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const initials = form.name.substring(0, 2).toUpperCase();

  return (
    <ProfileShell
      navItems={navItems}
      activeKey="lab"
      onNav={handleNav}
      topTitle="Organization Settings"
    >
      <form onSubmit={handleSave} style={{ maxWidth: "560px" }}>
        {/* Org logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "16px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: "800",
              color: "#000",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "4px" }}>{form.name}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{form.email}</p>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Organization Name</label>
          <input
            type="text"
            className="input"
            style={{ height: "44px" }}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Contact Email</label>
          <input
            type="email"
            className="input"
            style={{ height: "44px" }}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Lab Description</label>
          <textarea
            className="input"
            style={{ height: "90px", resize: "vertical" }}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {/* Links */}
        <div className="form-field">
          <label className="form-label">Website</label>
          <input type="url" className="input" style={{ height: "44px" }} placeholder="https://yourlab.edu" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">LinkedIn</label>
            <input type="url" className="input" style={{ height: "44px" }} placeholder="https://linkedin.com/..." value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">YouTube</label>
            <input type="url" className="input" style={{ height: "44px" }} placeholder="https://youtube.com/..." value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "20px" }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Twitter / X</label>
            <input type="url" className="input" style={{ height: "44px" }} placeholder="https://x.com/..." value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Instagram</label>
            <input type="url" className="input" style={{ height: "44px" }} placeholder="https://instagram.com/..." value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Facebook</label>
            <input type="url" className="input" style={{ height: "44px" }} placeholder="https://facebook.com/..." value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} />
          </div>
        </div>

        {saveError && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", color: "var(--error)", padding: "12px 14px", borderRadius: "10px", fontSize: "13px", marginTop: "20px" }}>
            <AlertCircle size={15} />
            {saveError}
          </div>
        )}

        {/* Research domains */}
        <div style={{ marginBottom: "32px" }}>
          <label className="form-label">Managed Research Domains</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {allTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelectedTagIds((prev) =>
                      selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    )
                  }
                  style={{
                    padding: "5px 14px",
                    borderRadius: "100px",
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: selected ? "rgba(0,229,255,0.1)" : "transparent",
                    color: selected ? "var(--accent)" : "var(--text-dim)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "var(--transition)",
                  }}
                >
                  {tag.name} {selected ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: "12px 28px", fontSize: "14px" }}
        >
          {saved ? "Saved!" : "Update Lab Identity"}
        </button>
      </form>

      {/* Danger zone */}
      <div style={{ maxWidth: "560px", marginTop: "40px", paddingTop: "32px", borderTop: "1px solid rgba(255,77,77,0.2)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--error)", marginBottom: "8px" }}>Danger Zone</h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.5" }}>
          Permanently delete this organization account. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
          style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid rgba(255,77,77,0.4)", background: deleteConfirm ? "rgba(255,77,77,0.15)" : "rgba(255,77,77,0.06)", color: "var(--error)", fontSize: "13px", fontWeight: "600", cursor: deleteLoading ? "not-allowed" : "pointer" }}
        >
          {deleteLoading ? "Deleting..." : deleteConfirm ? "Confirm — delete this account" : "Delete Organization Account"}
        </button>
        {deleteConfirm && (
          <button onClick={() => setDeleteConfirm(false)} style={{ marginLeft: "12px", background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", cursor: "pointer" }}>
            Cancel
          </button>
        )}
      </div>
    </ProfileShell>
  );
}

// ---- MAIN EXPORT ----
export default function Profile() {
  const role = getRole();
  if (role === "COMPANY" || role === "ADMIN") {
    return <OrgProfile />;
  }
  return <UserProfile />;
}
