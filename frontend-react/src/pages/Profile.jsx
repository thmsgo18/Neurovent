import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, ChevronDown } from "lucide-react";
import "../styles/Profile.css";
import { getRole, logout } from "../store/authStore";
import { getMeApi, updateMeApi, changePasswordApi, deleteAccountApi } from "../api/auth";
import { getTags, getTagsSync } from "../api/tags";
import { usePreferences } from "../context/PreferencesContext";

// ---- Shared shell ----
function ProfileShell({ children }) {
  return (
    <div className="profile-page">
      <div className="profile-main profile-main--centered">
        <div className="profile-content profile-content--centered">
          <div className="profile-stack">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function useUnsavedChangesGuard(isDirty) {
  const navigate = useNavigate();
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleDocumentClick = (event) => {
      if (allowNavigationRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const targetUrl = new URL(anchor.href, window.location.origin);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) return;

      event.preventDefault();
      setPendingNavigation(() => () => {
        allowNavigationRef.current = true;
        navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isDirty, navigate]);

  const requestNavigation = (target) => {
    if (!isDirty) {
      navigate(target);
      return;
    }

    setPendingNavigation(() => () => {
      allowNavigationRef.current = true;
      navigate(target);
    });
  };

  return { pendingNavigation, setPendingNavigation, requestNavigation };
}

// ---- USER PROFILE ----
function UserProfile() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    profileType: "STUDENT",
    schoolName: "",
    studyLevel: "",
    professionalCompanyName: "",
    jobTitle: "",
    jobStartedAt: "",
    avatarUrl: "",
    bio: "",
    favoriteDomain: "",
    websiteUrl: "",
    githubUrl: "",
    linkedinUrl: "",
  });
  const [allTags, setAllTags] = useState(() => getTagsSync() || []); // [{id, name}]
  const [selectedTagIds, setSelectedTagIds] = useState([]); // [1, 2, 3]
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState(null); // null | "ok" | error string
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  useEffect(() => {
    getMeApi().then((me) => {
      const nextForm = {
        firstName: me.first_name || "",
        lastName: me.last_name || "",
        email: me.email || "",
        profileType: me.participant_profile_type || "STUDENT",
        schoolName: me.school_name || "",
        studyLevel: me.study_level || "",
        professionalCompanyName: me.professional_company_name || "",
        jobTitle: me.job_title || "",
        jobStartedAt: me.job_started_at || "",
        avatarUrl: me.participant_avatar_url || "",
        bio: me.participant_bio || "",
        favoriteDomain: me.favorite_domain || "",
        websiteUrl: me.personal_website_url || "",
        githubUrl: me.github_url || "",
        linkedinUrl: me.participant_linkedin_url || "",
      };
      const nextTagIds = (me.tags || []).map((t) => (typeof t === "object" ? t.id : t));
      setForm(nextForm);
      setSelectedTagIds(nextTagIds);
      setInitialSnapshot(JSON.stringify({
        form: nextForm,
        selectedTagIds: nextTagIds,
        pwForm: { old: "", new: "", confirm: "" },
      }));
    }).catch(console.error);
    if (allTags.length === 0) getTags().then(setAllTags).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const currentSnapshot = useMemo(() => JSON.stringify({ form, selectedTagIds, pwForm }), [form, selectedTagIds, pwForm]);
  const hasUnsavedChanges = initialSnapshot !== null && currentSnapshot !== initialSnapshot;
  const { pendingNavigation, setPendingNavigation } = useUnsavedChangesGuard(hasUnsavedChanges);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateMeApi({
        first_name: form.firstName,
        last_name: form.lastName,
        participant_profile_type: form.profileType,
        school_name: form.profileType === "STUDENT" ? form.schoolName : "",
        study_level: form.profileType === "STUDENT" ? form.studyLevel : "",
        professional_company_name: form.profileType === "PROFESSIONAL" ? form.professionalCompanyName : "",
        job_title: form.profileType === "PROFESSIONAL" ? form.jobTitle : "",
        job_started_at: form.profileType === "PROFESSIONAL" && form.jobStartedAt ? form.jobStartedAt : null,
        participant_avatar_url: form.avatarUrl,
        participant_bio: form.bio,
        favorite_domain: form.favoriteDomain,
        personal_website_url: form.websiteUrl,
        github_url: form.githubUrl,
        participant_linkedin_url: form.linkedinUrl,
        employer_name: form.profileType === "STUDENT" ? form.schoolName : form.professionalCompanyName,
        tag_ids: selectedTagIds,
      });
      setInitialSnapshot(JSON.stringify({ form, selectedTagIds, pwForm }));
      navigate("/profile");
    } catch (err) {
      console.error(err);
      return;
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwStatus(null);
    if (pwForm.new !== pwForm.confirm) {
      setPwStatus(t("Passwords do not match."));
      return;
    }
    try {
      await changePasswordApi(pwForm.old, pwForm.new, pwForm.confirm);
      setPwStatus("ok");
      const clearedPwForm = { old: "", new: "", confirm: "" };
      setPwForm(clearedPwForm);
      setInitialSnapshot(JSON.stringify({ form, selectedTagIds, pwForm: clearedPwForm }));
    } catch (err) {
      setPwStatus(err.message || t("Failed to change password."));
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
      alert(err.message || t("Failed to delete account."));
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const initials = form.firstName && form.lastName
    ? (form.firstName.charAt(0) + form.lastName.charAt(0)).toUpperCase()
    : "?";

  return (
    <ProfileShell>
      <form onSubmit={handleSave} className="profile-form profile-card">
        <div className="profile-avatar-row">
          {form.avatarUrl ? (
            <img
              src={form.avatarUrl}
              alt={`${form.firstName} ${form.lastName}`}
              className="profile-image-avatar profile-image-avatar--circle profile-image-avatar--photo"
            />
          ) : (
            <div className="profile-avatar profile-avatar-circle">
              {initials}
            </div>
          )}
          <div>
            <h2 className="profile-name">
              {form.firstName} {form.lastName}
            </h2>
            <p className="profile-email">{form.email}</p>
          </div>
        </div>

        <div className="profile-form-row">
          <div className="form-field form-field--flush">
            <label className="form-label">{t("First Name")}</label>
            <input
              type="text"
              className="input"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Last Name")}</label>
            <input
              type="text"
              className="input"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">{t("Profile Type")}</label>
          <div className="profile-type-switch">
            {[
              { key: "STUDENT", label: t("Student") },
              { key: "PROFESSIONAL", label: t("Professional") },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`profile-type-option${form.profileType === option.key ? " profile-type-option--active" : ""}`}
                onClick={() => set("profileType", option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {form.profileType === "STUDENT" ? (
          <div className="profile-form-row">
            <div className="form-field form-field--flush">
              <label className="form-label">{t("School")}</label>
              <input
                type="text"
                className="input"
                value={form.schoolName}
                onChange={(e) => set("schoolName", e.target.value)}
              />
            </div>
            <div className="form-field form-field--flush">
              <label className="form-label">{t("Study Level")}</label>
              <input
                type="text"
                className="input"
                placeholder={t("Master 2, PhD, Postdoc...")}
                value={form.studyLevel}
                onChange={(e) => set("studyLevel", e.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="profile-form-row">
              <div className="form-field form-field--flush">
                <label className="form-label">{t("Company")}</label>
                <input
                  type="text"
                  className="input"
                  value={form.professionalCompanyName}
                  onChange={(e) => set("professionalCompanyName", e.target.value)}
                />
              </div>
              <div className="form-field form-field--flush">
                <label className="form-label">{t("Job Title")}</label>
                <input
                  type="text"
                  className="input"
                  value={form.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">{t("In This Company Since")}</label>
              <input
                type="date"
                className="input"
                value={form.jobStartedAt}
                onChange={(e) => set("jobStartedAt", e.target.value)}
              />
            </div>
          </>
        )}

        <div className="profile-form-row">
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Avatar URL")}</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={form.avatarUrl}
              onChange={(e) => set("avatarUrl", e.target.value)}
            />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Favorite Domain")}</label>
            <div className="profile-domain-select-shell">
              <select className="input profile-domain-select" value={form.favoriteDomain} onChange={(e) => set("favoriteDomain", e.target.value)}>
                <option value="">{t("Select a domain")}</option>
                {allTags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <span className="profile-domain-select-chevron" aria-hidden="true">
                <ChevronDown size={18} />
              </span>
            </div>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">{t("Bio")}</label>
          <textarea
            className="input profile-textarea profile-textarea--md"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </div>

        <div className="profile-form-row profile-form-row--triple">
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Personal Website")}</label>
            <input type="url" className="input" placeholder="https://..." value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("GitHub")}</label>
            <input type="url" className="input" placeholder="https://github.com/..." value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("LinkedIn")}</label>
            <input type="url" className="input" placeholder="https://linkedin.com/in/..." value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
          </div>
        </div>

        {/* Research interests */}
        <div className="profile-section">
          <label className="form-label">{t("Research Interests")}</label>
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
                  className={`profile-tag-btn${selected ? " profile-tag-btn--selected" : ""}`}
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
          {t("Save Profile")}
        </button>
      </form>

      <div className="profile-danger-zone profile-danger-zone--neutral">
        <h3 className="profile-danger-title profile-danger-title--neutral">{t("Change Password")}</h3>
        <form onSubmit={handlePasswordChange}>
          {pwStatus === "ok" && (
            <div className="profile-feedback profile-feedback--success">
              <CheckCircle size={15} />
              {t("Password updated successfully.")}
            </div>
          )}
          {pwStatus && pwStatus !== "ok" && (
            <div className="profile-feedback profile-feedback--error">
              <AlertCircle size={15} />
              {pwStatus}
            </div>
          )}
          <div className="form-field">
            <label className="form-label">{t("Current Password")}</label>
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
            <div className="form-field form-field--flush">
              <label className="form-label">{t("New Password")}</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={pwForm.new}
                onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
                required
              />
            </div>
            <div className="form-field form-field--flush">
              <label className="form-label">{t("Confirm New Password")}</label>
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
            className="btn btn-secondary form-field--spaced"
          >
            {t("Update Password")}
          </button>
        </form>
      </div>

      <div className="profile-danger-zone">
        <h3 className="profile-danger-title">{t("Danger Zone")}</h3>
        <p className="profile-danger-copy">
          {t("Permanently delete your account and all associated data. This action cannot be undone.")}
        </p>
        <div className="profile-danger-actions">
          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className={`profile-danger-btn ${deleteConfirm ? "profile-danger-btn--confirm" : "profile-danger-btn--idle"}`}
          >
            {deleteLoading ? t("Deleting...") : deleteConfirm ? t("Confirm — delete my account") : t("Delete My Account")}
          </button>
          {deleteConfirm && (
            <button onClick={() => setDeleteConfirm(false)} className="profile-cancel-btn">
              {t("Cancel")}
            </button>
          )}
        </div>
      </div>

      {pendingNavigation && (
        <div className="create-event-leave-backdrop" onClick={() => setPendingNavigation(null)}>
          <div className="create-event-leave-modal" onClick={(e) => e.stopPropagation()}>
            <p className="create-event-leave-eyebrow">{t("Unsaved changes")}</p>
            <h2 className="create-event-leave-title">{t("Your profile is not saved yet")}</h2>
            <p className="create-event-leave-copy">
              {t("If you leave this page now, your latest profile changes will be lost.")}
            </p>
            <div className="create-event-leave-actions">
              <button className="btn btn-secondary" onClick={() => setPendingNavigation(null)}>
                {t("Stay here")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const proceed = pendingNavigation;
                  setPendingNavigation(null);
                  proceed?.();
                }}
              >
                {t("Leave without saving")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  );
}

// ---- ORG PROFILE ----
function OrgProfile() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [form, setForm] = useState({
    name: "",
    email: "",
    logoUrl: "",
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
  const [saveError, setSaveError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  useEffect(() => {
    getMeApi().then((me) => {
      const nextForm = {
        name: me.company_name || "",
        email: me.recovery_email || "",
        logoUrl: me.company_logo_url || "",
        description: me.company_description || "",
        website_url: me.website_url || "",
        youtube_url: me.youtube_url || "",
        linkedin_url: me.linkedin_url || "",
        twitter_url: me.twitter_url || "",
        instagram_url: me.instagram_url || "",
        facebook_url: me.facebook_url || "",
      };
      const nextTagIds = (me.tags || []).map((t) => (typeof t === "object" ? t.id : t));
      setForm(nextForm);
      setSelectedTagIds(nextTagIds);
      setInitialSnapshot(JSON.stringify({ form: nextForm, selectedTagIds: nextTagIds }));
    }).catch(console.error);
    if (allTags.length === 0) getTags().then(setAllTags).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const currentSnapshot = useMemo(() => JSON.stringify({ form, selectedTagIds }), [form, selectedTagIds]);
  const hasUnsavedChanges = initialSnapshot !== null && currentSnapshot !== initialSnapshot;
  const { pendingNavigation, setPendingNavigation } = useUnsavedChangesGuard(hasUnsavedChanges);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");
    try {
      await updateMeApi({
        company_name: form.name,
        company_description: form.description,
        company_logo_url: form.logoUrl,
        website_url: form.website_url,
        youtube_url: form.youtube_url,
        linkedin_url: form.linkedin_url,
        twitter_url: form.twitter_url,
        instagram_url: form.instagram_url,
        facebook_url: form.facebook_url,
        tag_ids: selectedTagIds,
      });
      setInitialSnapshot(JSON.stringify({ form, selectedTagIds }));
      navigate("/profile");
    } catch (err) {
      setSaveError(err.message || t("Failed to save."));
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
      alert(err.message || t("Failed to delete account."));
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const initials = form.name.substring(0, 2).toUpperCase();

  return (
    <ProfileShell>
      <form onSubmit={handleSave} className="profile-form profile-card">
        <div className="profile-avatar-row">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt={form.name}
              className="profile-image-avatar profile-image-avatar--square profile-image-avatar--logo"
            />
          ) : (
            <div className="profile-avatar profile-avatar-square">
              {initials}
            </div>
          )}
          <div>
            <h2 className="profile-name">{form.name}</h2>
            <p className="profile-email">{form.email}</p>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">{t("Organization Name")}</label>
          <input
            type="text"
            className="input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">{t("Contact Email")}</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">{t("Logo URL")}</label>
          <input
            type="url"
            className="input"
            placeholder="https://..."
            value={form.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">{t("Organization Description")}</label>
          <textarea
            className="input profile-textarea profile-textarea--sm"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {/* Links */}
        <div className="form-field">
          <label className="form-label">{t("Website")}</label>
          <input type="url" className="input" placeholder="https://organization.example.com" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} />
        </div>
        <div className="profile-form-row">
          <div className="form-field form-field--flush">
            <label className="form-label">{t("LinkedIn")}</label>
            <input type="url" className="input" placeholder="https://linkedin.com/company/organization" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("YouTube")}</label>
            <input type="url" className="input" placeholder="https://youtube.com/@your-channel" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
          </div>
        </div>
        <div className="profile-form-row profile-form-row--triple profile-form-row--spaced">
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Twitter / X")}</label>
            <input type="url" className="input" placeholder="https://x.com/your-handle" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Instagram")}</label>
            <input type="url" className="input" placeholder="https://instagram.com/your-page" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
          </div>
          <div className="form-field form-field--flush">
            <label className="form-label">{t("Facebook")}</label>
            <input type="url" className="input" placeholder="https://facebook.com/your-page" value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} />
          </div>
        </div>

        {saveError && (
          <div className="profile-feedback profile-feedback--error profile-feedback--spaced">
            <AlertCircle size={15} />
            {saveError}
          </div>
        )}

        {/* Research domains */}
        <div className="profile-section">
          <label className="form-label">{t("Managed Research Domains")}</label>
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
                  className={`profile-tag-btn${selected ? " profile-tag-btn--selected" : ""}`}
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
          {t("Update Organization Identity")}
        </button>
      </form>

      <div className="profile-danger-zone">
        <h3 className="profile-danger-title">{t("Danger Zone")}</h3>
        <p className="profile-danger-copy">
          {t("Permanently delete this organization account. This action cannot be undone.")}
        </p>
        <div className="profile-danger-actions">
          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className={`profile-danger-btn ${deleteConfirm ? "profile-danger-btn--confirm" : "profile-danger-btn--idle"}`}
          >
            {deleteLoading ? t("Deleting...") : deleteConfirm ? t("Confirm — delete this account") : t("Delete Organization Account")}
          </button>
          {deleteConfirm && (
            <button onClick={() => setDeleteConfirm(false)} className="profile-cancel-btn">
              {t("Cancel")}
            </button>
          )}
        </div>
      </div>

      {pendingNavigation && (
        <div className="create-event-leave-backdrop" onClick={() => setPendingNavigation(null)}>
          <div className="create-event-leave-modal" onClick={(e) => e.stopPropagation()}>
            <p className="create-event-leave-eyebrow">{t("Unsaved changes")}</p>
            <h2 className="create-event-leave-title">{t("Your profile is not saved yet")}</h2>
            <p className="create-event-leave-copy">
              {t("If you leave this page now, your latest profile changes will be lost.")}
            </p>
            <div className="create-event-leave-actions">
              <button className="btn btn-secondary" onClick={() => setPendingNavigation(null)}>
                {t("Stay here")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const proceed = pendingNavigation;
                  setPendingNavigation(null);
                  proceed?.();
                }}
              >
                {t("Leave without saving")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  );
}

// ---- MAIN EXPORT ----
export default function Profile() {
  const role = getRole();
  if (role === "ADMIN") {
    return <Navigate to="/admin/participants" replace />;
  }
  if (role === "COMPANY") {
    return <OrgProfile />;
  }
  return <UserProfile />;
}
