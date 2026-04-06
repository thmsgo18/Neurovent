import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getParticipantProfileApi } from "../api/auth";
import { removeEventRegistration } from "../api/registrations";
import { ParticipantProfileOverviewContent } from "./ProfileOverview";
import "../styles/Admin.css";

export default function ParticipantProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const fromEventId = searchParams.get("from_event");
  const registrationId = searchParams.get("registration_id");
  const isMyEventsContext = searchParams.get("context") === "my-events";
  const eventDetailTarget = fromEventId ? `/events/${fromEventId}?context=my-events` : "/my-events";

  useEffect(() => {
    getParticipantProfileApi(id)
      .then(setParticipant)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return null;
  if (!participant) return null;

  if (isMyEventsContext) {
    return (
      <div className="profile-page">
        <div className="profile-main profile-main--centered">
          <div className="profile-content profile-content--centered profile-content--event-context">
            <div className="profile-stack profile-stack--overview profile-stack--event-context">
              <div className="admin-stack admin-stack--tight">
                <div className="admin-header admin-header--detail">
                  <button
                    type="button"
                    className="admin-back-btn admin-back-btn--animated"
                    onClick={() => navigate(eventDetailTarget)}
                  >
                    <span className="admin-back-btn__arrow" aria-hidden="true">←</span>
                    Back to Event Detail
                  </button>
                  {registrationId ? (
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-danger-btn"
                        disabled={removing}
                        onClick={async () => {
                          if (!window.confirm("Remove this participant from the event? They will receive an email notification.")) return;
                          setRemoving(true);
                          try {
                            await removeEventRegistration(registrationId);
                            navigate(eventDetailTarget);
                          } catch (error) {
                            alert(error.message || "Unable to remove this registration.");
                          } finally {
                            setRemoving(false);
                          }
                        }}
                      >
                        {removing ? "Removing..." : "Remove Registration"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <ParticipantProfileOverviewContent
                  participant={participant}
                  registrations={[]}
                  showEditButton={false}
                  subtitle={participant.email || "Participant profile"}
                  wrapInShell={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ParticipantProfileOverviewContent
      participant={participant}
      registrations={[]}
      showEditButton={false}
      subtitle={participant.email || "Participant profile"}
    />
  );
}
