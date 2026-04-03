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
    <div className="profile-page">
      <aside className="profile-sidebar">
        <Link to="/" className="profile-sidebar-logo">
          <span className="profile-sidebar-brand">
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </span>
        </Link>

        <nav className="profile-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              className="profile-nav-btn"
              style={{
                fontWeight: activeKey === item.key ? "700" : "500",
                background: activeKey === item.key ? "rgba(0,229,255,0.1)" : "transparent",
                color: activeKey === item.key ? "var(--accent)" : "var(--text-dim)",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="profile-logout-btn"
        >
          <LogOut size={13} />
          Log out
        </button>
      </aside>

      <div className="profile-main">
        <div className="profile-topbar">
          <h3>{topTitle}</h3>
        </div>
        <div className="profile-content">
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
      <form onSubmit={handleSave} className="profile-form profile-card">
        <div className="profile-avatar-row">
          <div className="profile-avatar profile-avatar-circle">
            {initials}
          </div>
          <div>
            <h2 className="profile-name">
              {form.firstName} {form.lastName}
            </h2>
            <p className="profile-email">{form.email}</p>
          </div>
        </div>

        <div className="profile-form-row">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">First Name</label>
            <input
              type="text"
              className="input"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Last Name</label>
            <input
              type="text"
              className="input"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="profile-form-row">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">University</label>
            <input
              type="text"
              className="input"
              value={form.university}
              onChange={(e) => set("university", e.target.value)}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Research Field</label>
            <input
              type="text"
              className="input"
              value={form.field}
              onChange={(e) => set("field", e.target.value)}
            />
          </div>
        </div>

        {/* Research interests */}
        <div style={{ marginBottom: "32px" }}>
          <label className="form-label">Research Interests</label>
          <div className="profile-tags-wrap">
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
                  className="profile-tag-btn"
                  style={{
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: selected ? "rgba(0,229,255,0.1)" : "transparent",
                    color: selected ? "var(--accent)" : "var(--text-dim)",
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
        >
          {saved ? "Saved ✓" : "Save Academic Profile"}
        </button>
      </form>

      <div className="profile-danger-zone" style={{ borderTopColor: "var(--border)" }}>
        <h3 className="profile-danger-title" style={{ color: "var(--text)" }}>Change Password</h3>
        <form onSubmit={handlePasswordChange}>
          {pwStatus === "ok" && (
            <div className="profile-feedback profile-feedback--success">
              <CheckCircle size={15} />
              Password updated successfully.
            </div>
          )}
          {pwStatus && pwStatus !== "ok" && (
            <div className="profile-feedback profile-feedback--error">
              <AlertCircle size={15} />
              {pwStatus}
            </div>
          )}
          <div className="form-field">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={pwForm.old}
              onChange={(e) => setPwForm((f) => ({ ...f, old: e.target.value }))}
              required
            />
          </div>
          <div className="profile-form-row">
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input"
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
            style={{ marginTop: "20px" }}
          >
            Update Password
          </button>
        </form>
      </div>

      <div className="profile-danger-zone">
        <h3 className="profile-danger-title">Danger Zone</h3>
        <p className="profile-danger-copy">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <div className="profile-danger-actions">
          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="profile-danger-btn"
            style={{ background: deleteConfirm ? "rgba(255,77,77,0.15)" : "rgba(255,77,77,0.06)", cursor: deleteLoading ? "not-allowed" : "pointer" }}
          >
            {deleteLoading ? "Deleting..." : deleteConfirm ? "Confirm — delete my account" : "Delete My Account"}
          </button>
          {deleteConfirm && (
            <button onClick={() => setDeleteConfirm(false)} className="profile-cancel-btn">
              Cancel
            </button>
          )}
        </div>
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
      <form onSubmit={handleSave} className="profile-form profile-card">
        <div className="profile-avatar-row">
          <div className="profile-avatar profile-avatar-square">
            {initials}
          </div>
          <div>
            <h2 className="profile-name">{form.name}</h2>
            <p className="profile-email">{form.email}</p>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Organization Name</label>
          <input
            type="text"
            className="input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Contact Email</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Lab Description</label>
          <textarea
            className="input"
            style={{ minHeight: "110px", resize: "vertical" }}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {/* Links */}
        <div className="form-field">
          <label className="form-label">Website</label>
          <input type="url" className="input" placeholder="https://lab.institution.edu" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} />
        </div>
        <div className="profile-form-row">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">LinkedIn</label>
            <input type="url" className="input" placeholder="https://linkedin.com/company/lab" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">YouTube</label>
            <input type="url" className="input" placeholder="https://youtube.com/@your-channel" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
          </div>
        </div>
        <div className="profile-form-row profile-form-row--triple" style={{ marginTop: "20px" }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Twitter / X</label>
            <input type="url" className="input" placeholder="https://x.com/your-handle" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Instagram</label>
            <input type="url" className="input" placeholder="https://instagram.com/your-page" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Facebook</label>
            <input type="url" className="input" placeholder="https://facebook.com/your-page" value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} />
          </div>
        </div>

        {saveError && (
          <div className="profile-feedback profile-feedback--error" style={{ marginTop: "20px" }}>
            <AlertCircle size={15} />
            {saveError}
          </div>
        )}

        {/* Research domains */}
        <div style={{ marginBottom: "32px" }}>
          <label className="form-label">Managed Research Domains</label>
          <div className="profile-tags-wrap">
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
                  className="profile-tag-btn"
                  style={{
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: selected ? "rgba(0,229,255,0.1)" : "transparent",
                    color: selected ? "var(--accent)" : "var(--text-dim)",
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
        >
          {saved ? "Saved!" : "Update Lab Identity"}
        </button>
      </form>

      <div className="profile-danger-zone">
        <h3 className="profile-danger-title">Danger Zone</h3>
        <p className="profile-danger-copy">
          Permanently delete this organization account. This action cannot be undone.
        </p>
        <div className="profile-danger-actions">
          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="profile-danger-btn"
            style={{ background: deleteConfirm ? "rgba(255,77,77,0.15)" : "rgba(255,77,77,0.06)", cursor: deleteLoading ? "not-allowed" : "pointer" }}
          >
            {deleteLoading ? "Deleting..." : deleteConfirm ? "Confirm — delete this account" : "Delete Organization Account"}
          </button>
          {deleteConfirm && (
            <button onClick={() => setDeleteConfirm(false)} className="profile-cancel-btn">
              Cancel
            </button>
          )}
        </div>
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
