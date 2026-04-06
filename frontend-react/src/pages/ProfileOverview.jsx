import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Globe,
  Linkedin,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  Pencil,
  BadgeCheck,
  Sparkles,
  Rocket,
  CalendarClock,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import "../styles/Profile.css";
import { getRole } from "../store/authStore";
import { getMeApi } from "../api/auth";
import { getMyRegistrations } from "../api/registrations";
import { getMyEventsApi } from "../api/events";
import { usePreferences } from "../context/PreferencesContext";

function ProfileOverviewShell({ children }) {
  return (
    <div className="profile-page">
      <div className="profile-main profile-main--centered">
        <div className="profile-content profile-content--centered">
          <div className="profile-stack profile-stack--overview">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ProfileOverviewHeader({ initials, title, subtitle, actionLabel, onAction, square = false, imageUrl = "", showAction = true }) {
  return (
    <section className="profile-overview-hero profile-card">
      <div className="profile-avatar-row profile-avatar-row--overview">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`profile-image-avatar ${square ? "profile-image-avatar--square profile-image-avatar--logo" : "profile-image-avatar--circle profile-image-avatar--photo"}`}
          />
        ) : (
          <div className={`profile-avatar ${square ? "profile-avatar-square" : "profile-avatar-circle"}`}>
            {initials}
          </div>
        )}
        <div className="profile-overview-copy">
          <h1 className="profile-name profile-name--overview">{title}</h1>
          <p className="profile-email profile-email--overview">{subtitle}</p>
        </div>
        {showAction ? (
          <button type="button" className="btn btn-primary profile-overview-edit-btn" onClick={onAction}>
            <Pencil size={15} />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function InfoGrid({ items }) {
  const { t } = usePreferences();
  return (
    <section className="profile-card profile-overview-card">
      <div className="profile-overview-grid">
        {items.map((item) => (
          item.onClick ? (
            <button
              key={item.label}
              type="button"
              className="profile-overview-item profile-overview-item--interactive"
              onClick={item.onClick}
            >
              <p className="profile-overview-label">{t(item.label)}</p>
              <p className="profile-overview-value">{item.value || t("Not provided")}</p>
              {item.hint ? <p className="profile-overview-hint">{t(item.hint)}</p> : null}
            </button>
          ) : (
            <div key={item.label} className="profile-overview-item">
              <p className="profile-overview-label">{t(item.label)}</p>
              <p className="profile-overview-value">{item.value || t("Not provided")}</p>
            </div>
          )
        ))}
      </div>
    </section>
  );
}

function TagsCard({ title, tags }) {
  const { t } = usePreferences();
  return (
    <section className="profile-card profile-overview-card">
      <h2 className="profile-overview-section-title">{t(title)}</h2>
      {tags.length ? (
        <div className="profile-tags-wrap">
          {tags.map((tag) => (
            <span key={typeof tag === "object" ? tag.id : tag} className="profile-tag-btn profile-tag-btn--static">
              {typeof tag === "object" ? tag.name : tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="profile-overview-empty">{t("No topics selected yet.")}</p>
      )}
    </section>
  );
}

function BadgeCard({ badges }) {
  const { t } = usePreferences();
  return (
    <section className="profile-card profile-overview-card">
      <h2 className="profile-overview-section-title">{t("Missions Accomplished")}</h2>
      <div className="profile-badges-grid">
        {badges.map((badge) => (
          <div
            key={badge.key}
            className={`profile-badge-card profile-badge-card--${badge.tone} ${badge.earned ? "profile-badge-card--earned" : "profile-badge-card--locked"} ${badge.near ? "profile-badge-card--near" : ""}`}
          >
            <span
              className={`profile-badge-status ${
                badge.earned
                  ? "profile-badge-status--earned"
                  : badge.near
                    ? "profile-badge-status--near"
                    : "profile-badge-status--locked"
              }`}
            >
              {badge.earned ? t("Completed") : badge.near ? t("Almost there") : t("Locked")}
            </span>
            <div className="profile-badge-icon">
              <badge.icon size={18} />
            </div>
            <div className="profile-badge-copy">
              <p className="profile-badge-title">{t(badge.title)}</p>
              <p className="profile-badge-description">{t(badge.description)}</p>
              {!badge.earned && badge.progress ? <p className="profile-badge-progress">{t(badge.progress)}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatTenure(startDate, t) {
  if (!startDate) return "";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const months = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  );
  if (months < 12) {
    return t("{{count}} month{{suffix}}", { count: months || 1, suffix: months === 1 ? "" : "s" });
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (!remainingMonths) {
    return t("{{count}} year{{suffix}}", { count: years, suffix: years === 1 ? "" : "s" });
  }
  return t("{{years}} year{{yearSuffix}} {{months}} month{{monthSuffix}}", {
    years,
    yearSuffix: years === 1 ? "" : "s",
    months: remainingMonths,
    monthSuffix: remainingMonths === 1 ? "" : "s",
  });
}

function LinksCard({ links, title = "Links" }) {
  const { t } = usePreferences();
  const visibleLinks = links.filter((link) => link.href);

  return (
    <section className="profile-card profile-overview-card">
      <h2 className="profile-overview-section-title">{t(title)}</h2>
      {visibleLinks.length ? (
        <div className="profile-overview-links">
          {visibleLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`profile-overview-link${link.tone ? ` profile-overview-link--${link.tone}` : ""}`}
              target="_blank"
              rel="noreferrer"
            >
              <link.icon size={16} />
              {t(link.label)}
            </a>
          ))}
        </div>
      ) : (
        <p className="profile-overview-empty">{t("No public links added yet.")}</p>
      )}
    </section>
  );
}

export function ParticipantProfileOverviewContent({
  participant,
  registrations = [],
  showEditButton = true,
  showBadges = true,
  onEdit,
  subtitle,
  wrapInShell = true,
}) {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const firstName = participant.first_name || "";
  const lastName = participant.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || t("Participant");
  const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : "PT";
  const registrationStats = participant.registration_stats || {};
  const hasRegistrationList = registrations.length > 0;
  const confirmedCount = hasRegistrationList
    ? registrations.filter((reg) => reg.status === "CONFIRMED").length
    : registrationStats.confirmed || 0;
  const totalRegistrations = hasRegistrationList
    ? registrations.length
    : registrationStats.total || 0;
  const waitlistCount = hasRegistrationList
    ? registrations.filter((reg) => reg.status === "WAITLIST").length
    : registrationStats.waitlist || 0;
  const interestCount = (participant.tags || []).length;
  const participantBadges = [
    {
      key: "first-registration",
      earned: totalRegistrations > 0,
      near: false,
      title: totalRegistrations > 0 ? "First registration unlocked" : "Ready for first registration",
      description: totalRegistrations > 0 ? "You have already joined your first Neurovent experience." : "Register for your first event to unlock this mission.",
      progress: `${Math.min(totalRegistrations, 1)} / 1 event`,
      icon: Rocket,
      tone: totalRegistrations > 0 ? "accent" : "muted",
    },
    {
      key: "confirmed-regular",
      earned: confirmedCount >= 3,
      near: confirmedCount > 0 && confirmedCount < 3,
      title: confirmedCount >= 3 ? "Confirmed regular" : "Building momentum",
      description: confirmedCount >= 3 ? `${confirmedCount} confirmed events on your journey already.` : "Reach 3 confirmed events to unlock your regular badge.",
      progress: `${Math.min(confirmedCount, 3)} / 3 confirmed events`,
      icon: BadgeCheck,
      tone: confirmedCount >= 3 ? "success" : "muted",
    },
    {
      key: "domain-curator",
      earned: interestCount >= 3,
      near: interestCount > 0 && interestCount < 3,
      title: interestCount >= 3 ? "Domain curator" : "Curate your interests",
      description: interestCount >= 3 ? "Your research interests show a clear scientific identity." : "Pick at least 3 research interests to earn this badge.",
      progress: `${Math.min(interestCount, 3)} / 3 interests selected`,
      icon: Sparkles,
      tone: interestCount >= 3 ? "secondary" : "muted",
    },
    {
      key: "waitlist-survivor",
      earned: waitlistCount > 0,
      near: totalRegistrations > 0 && waitlistCount === 0,
      title: waitlistCount > 0 ? "Waitlist survivor" : "Fast responder",
      description: waitlistCount > 0 ? "You have already navigated at least one waitlist." : "Stay reactive and register early to keep this badge shiny.",
      progress: `${Math.min(waitlistCount, 1)} / 1 waitlist experience`,
      icon: CalendarClock,
      tone: waitlistCount > 0 ? "warning" : totalRegistrations > 0 ? "warning" : "muted",
    },
  ];

  const participantInfo = participant.participant_profile_type === "PROFESSIONAL"
    ? [
        { label: "Profile Type", value: "Professional" },
        { label: "Company", value: participant.professional_company_name || participant.employer_name },
        { label: "Job Title", value: participant.job_title },
        { label: "Time in Company", value: formatTenure(participant.job_started_at, t) },
        { label: "Favorite Domain", value: participant.favorite_domain },
        { label: "Events Joined", value: String(totalRegistrations) },
      ]
    : [
        { label: "Profile Type", value: "Student" },
        { label: "School", value: participant.school_name || participant.employer_name },
        { label: "Study Level", value: participant.study_level },
        { label: "Favorite Domain", value: participant.favorite_domain },
        { label: "Events Joined", value: String(totalRegistrations) },
        { label: "Confirmed Events", value: String(confirmedCount) },
      ];
  const participantLinks = [
    { label: "Website", href: participant.personal_website_url, icon: Globe, tone: "website" },
    { label: "GitHub", href: participant.github_url, icon: Globe, tone: "github" },
    { label: "LinkedIn", href: participant.participant_linkedin_url, icon: Linkedin, tone: "linkedin" },
  ];

  const content = (
    <>
      <ProfileOverviewHeader
        initials={initials}
        title={fullName}
        subtitle={subtitle || participant.email || t("No email provided")}
        actionLabel={t("Edit Profile")}
        onAction={onEdit || (() => navigate("/profile/edit"))}
        imageUrl={participant.participant_avatar_url}
        showAction={showEditButton}
      />

      <section className="profile-card profile-overview-card">
        <h2 className="profile-overview-section-title">{t("Bio")}</h2>
        <p className="profile-overview-description">
          {participant.participant_bio || t("Add a short bio to help others understand your academic or professional focus.")}
        </p>
      </section>

      <InfoGrid items={participantInfo} />

      <TagsCard title="Research Interests" tags={participant.tags || []} />
      <LinksCard links={participantLinks} title="Links" />
      {showBadges ? <BadgeCard badges={participantBadges} /> : null}
    </>
  );

  return wrapInShell ? <ProfileOverviewShell>{content}</ProfileOverviewShell> : content;
}

function UserProfileOverview() {
  const [me, setMe] = useState(null);
  const [registrations, setRegistrations] = useState([]);

  useEffect(() => {
    getMeApi().then(setMe).catch(console.error);
    getMyRegistrations().then(setRegistrations).catch(console.error);
  }, []);

  if (!me) return null;

  return (
    <ParticipantProfileOverviewContent
      participant={me}
      registrations={registrations}
      showEditButton
    />
  );
}

export function OrganizationProfileOverviewContent({
  company,
  events = [],
  showEditButton = true,
  showBadges = true,
  onEdit,
  subtitle,
  onOpenEvents,
  wrapInShell = true,
}) {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const companyName = company.company_name || t("Organization");
  const initials = companyName.substring(0, 2).toUpperCase();
  const liveEvents = events.filter((event) => event.status === "live").length;
  const pastEvents = events.filter((event) => event.status === "past").length;
  const upcomingEvents = events.filter((event) => event.status === "upcoming").length;
  const totalRegistrations = events.reduce((sum, event) => sum + (event.registered_count || 0), 0);
  const isVerified = company.verification_status === "VERIFIED";
  const verificationPending =
    company.verification_status === "PENDING" ||
    company.verification_status === "UNDER_REVIEW" ||
    company.verification_status === "NEEDS_REVIEW";
  const openOrganizationEvents = (mode = "all") => {
    if (onOpenEvents) {
      onOpenEvents(companyName, mode);
      return;
    }
    const params = new URLSearchParams();
    params.set("q", companyName);
    params.set("organization", companyName);
    if (mode === "upcoming") {
      params.set("upcoming", "1");
    }
    navigate(`/events/results?${params.toString()}`);
  };
  const organizationBadges = [
    {
      key: "first-event",
      earned: events.length > 0,
      near: false,
      title: events.length > 0 ? "First event created" : "Ready to publish",
      description: events.length > 0 ? "Your organization has already launched its first event." : "Publish your first event to unlock this badge.",
      progress: `${Math.min(events.length, 1)} / 1 event published`,
      icon: Rocket,
      tone: events.length > 0 ? "accent" : "muted",
    },
    {
      key: "verified",
      earned: isVerified,
      near: verificationPending,
      title: isVerified ? "Verified organization" : "Verification in progress",
      description: isVerified ? "Your organization identity has been verified." : "Keep your organization details complete to speed up verification.",
      progress: isVerified ? null : verificationPending ? "Review pending" : "Profile still incomplete",
      icon: ShieldCheck,
      tone: isVerified ? "success" : "warning",
    },
    {
      key: "event-operator",
      earned: events.length >= 5,
      near: events.length > 0 && events.length < 5,
      title: events.length >= 5 ? "Event operator" : "Growing event pipeline",
      description: events.length >= 5 ? `${events.length} events created and tracked from your dashboard.` : "Create 5 events to unlock your operator badge.",
      progress: `${Math.min(events.length, 5)} / 5 events created`,
      icon: Trophy,
      tone: events.length >= 5 ? "secondary" : events.length > 0 ? "secondary" : "muted",
    },
    {
      key: "audience-builder",
      earned: totalRegistrations >= 20,
      near: totalRegistrations > 0 && totalRegistrations < 20,
      title: totalRegistrations >= 20 ? "Audience builder" : "Audience builder",
      description: totalRegistrations >= 20 ? `${totalRegistrations} registrations accumulated across your events.` : "Reach 20 total registrations to unlock this mission.",
      progress: `${Math.min(totalRegistrations, 20)} / 20 registrations`,
      icon: BadgeCheck,
      tone: totalRegistrations >= 20 ? "accent" : totalRegistrations > 0 ? "accent" : "muted",
    },
  ];

  const content = (
    <>
      <ProfileOverviewHeader
        initials={initials}
        title={companyName}
        subtitle={subtitle || t("Public organization profile")}
        actionLabel={t("Edit Organization")}
        onAction={onEdit || (() => navigate("/profile/edit"))}
        square
        imageUrl={company.company_logo_url || company.company_logo}
        showAction={showEditButton}
      />

      <section className="profile-card profile-overview-card">
        <h2 className="profile-overview-section-title">{t("About")}</h2>
        <p className="profile-overview-description">
          {company.company_description || t("No organization description added yet.")}
        </p>
      </section>

      <InfoGrid
        items={[
          { label: "Total Events", value: String(events.length), hint: "Open public events from this organization", onClick: () => openOrganizationEvents("all") },
          { label: "Upcoming Events", value: String(upcomingEvents), hint: "See the next public events from this organization", onClick: () => openOrganizationEvents("upcoming") },
          { label: "Live Events", value: String(liveEvents) },
          { label: "Past Events", value: String(pastEvents) },
        ]}
      />

      <LinksCard
        title="Organization Links"
        links={[
          { label: "Website", href: company.website_url, icon: Globe, tone: "website" },
          { label: "LinkedIn", href: company.linkedin_url, icon: Linkedin, tone: "linkedin" },
          { label: "YouTube", href: company.youtube_url, icon: Youtube, tone: "youtube" },
          { label: "Twitter / X", href: company.twitter_url, icon: Twitter, tone: "twitter" },
          { label: "Instagram", href: company.instagram_url, icon: Instagram, tone: "instagram" },
          { label: "Facebook", href: company.facebook_url, icon: Facebook, tone: "facebook" },
        ]}
      />

      <TagsCard title="Managed Research Domains" tags={company.tags || []} />
      {showBadges ? <BadgeCard badges={organizationBadges} /> : null}
    </>
  );

  return wrapInShell ? <ProfileOverviewShell>{content}</ProfileOverviewShell> : content;
}

function OrgProfileOverview() {
  const { t } = usePreferences();
  const [me, setMe] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    getMeApi().then(setMe).catch(console.error);
    getMyEventsApi().then(setEvents).catch(console.error);
  }, []);

  if (!me) return null;

  return (
    <OrganizationProfileOverviewContent
      company={me}
      events={events}
      showEditButton
      subtitle={me.recovery_email || t("No contact email provided")}
    />
  );
}

export default function ProfileOverview() {
  const role = getRole();
  if (role === "ADMIN") {
    return <Navigate to="/admin/participants" replace />;
  }
  if (role === "COMPANY") {
    return <OrgProfileOverview />;
  }
  return <UserProfileOverview />;
}
