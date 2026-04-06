from pathlib import Path
from types import SimpleNamespace

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from emails import _event_detail_items, _format_practical_instructions, _render_email_html


class PreviewEvent(SimpleNamespace):
    FORMAT_LABELS = {
        'ONSITE': 'On-site',
        'ONLINE': 'Online',
        'HYBRID': 'Hybrid',
    }

    def get_format_display(self):
        return self.FORMAT_LABELS.get(self.format, self.format)


class Command(BaseCommand):
    help = "Generate local HTML previews for the email templates."

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            default='email-previews',
            help='Output directory for the generated HTML previews.',
        )

    def handle(self, *args, **options):
        output_dir = Path(options['output_dir'])
        if not output_dir.is_absolute():
            output_dir = Path(settings.BASE_DIR) / output_dir
        output_dir.mkdir(parents=True, exist_ok=True)

        now = timezone.now()
        event = PreviewEvent(
            id=42,
            title='Neuro AI Summit 2026',
            date_start=now.replace(hour=9, minute=30, second=0, microsecond=0),
            date_end=now.replace(hour=17, minute=30, second=0, microsecond=0),
            format='HYBRID',
            address_full='17 Research Avenue, 75013 Paris',
            address_city='Paris',
            address_country='France',
            address_visibility='PARTIAL',
            online_platform='Zoom Events',
            online_link='https://neurovent.example.com/live/neuro-ai-summit',
            online_visibility='PARTIAL',
            visible_address={'city': 'Paris', 'country': 'France', 'full': None},
            visible_online={'platform': 'Zoom Events', 'link': None},
        )

        preview_specs = {
            'registration_confirmed.html': _render_email_html(
                preheader=f"Your spot for {event.title} is confirmed.",
                eyebrow="Registration confirmed",
                title="Your registration is confirmed",
                greeting_name="Alice",
                intro_lines=[
                    f"Your registration for \"{event.title}\" is confirmed.",
                    "You will find all the key information you need below.",
                ],
                detail_title="Event details",
                detail_items=_event_detail_items(event),
                cta_label="View event",
                cta_url=f"{settings.FRONTEND_URL}/events/{event.id}/",
                note_lines=["We look forward to welcoming you on Neurovent."],
                tone='success',
            ),
            'registration_waitlist.html': _render_email_html(
                preheader=f"You are currently on the waiting list for {event.title}.",
                eyebrow="Waiting list",
                title="You are on the waiting list",
                greeting_name="Alice",
                intro_lines=[
                    f"The event \"{event.title}\" is currently full.",
                    "Your current position on the waiting list: 3.",
                ],
                detail_title="Event details",
                detail_items=_event_detail_items(event),
                cta_label="Track event",
                cta_url=f"{settings.FRONTEND_URL}/events/{event.id}/",
                note_lines=["If a spot opens up, we will automatically send you a confirmation email."],
                tone='warning',
            ),
            'event_reminder.html': _render_email_html(
                preheader=f"Reminder D-1 for your participation in {event.title}.",
                eyebrow="Reminder D-1",
                title="Your event is coming up",
                greeting_name="Alice",
                intro_lines=[
                    f"Just a reminder: the event \"{event.title}\" starts tomorrow.",
                    _format_practical_instructions(event),
                ],
                detail_title="Practical information",
                detail_items=_event_detail_items(event),
                cta_label="View event",
                cta_url=f"{settings.FRONTEND_URL}/events/{event.id}/",
                tone='primary',
            ),
            'event_update.html': _render_email_html(
                preheader=f"Important information has changed for {event.title}.",
                eyebrow="Event update",
                title="Some information has changed",
                greeting_name="Alice",
                intro_lines=[f"The information for \"{event.title}\" has been updated."],
                bullet_title="Main changes",
                bullet_items=[
                    "The date or time has been updated.",
                    "The online access information has been updated.",
                ],
                detail_title="Updated details",
                detail_items=_event_detail_items(event, force_full_details=True),
                cta_label="View event",
                cta_url=f"{settings.FRONTEND_URL}/events/{event.id}/",
                tone='warning',
            ),
            'organizer_digest.html': _render_email_html(
                preheader=f"Your organizer summary for {event.title} is ready.",
                eyebrow="Organizer summary",
                title="Prepare your event with confidence",
                intro_lines=[f"Here is your summary before the event \"{event.title}\"."],
                detail_title="Event details",
                detail_items=_event_detail_items(event, force_full_details=True),
                stats_title="Attendance",
                stats_items=[
                    ('Confirmed attendees', '84'),
                    ('Pending review', '12'),
                    ('Waiting list', '9'),
                ],
                bullet_title="Accessibility needs",
                bullet_items=[
                    'Camille Martin: Wheelchair access',
                    'Nora Dupont: Sign language interpretation',
                ],
                cta_label="View event",
                cta_url=f"{settings.FRONTEND_URL}/events/{event.id}/",
                tone='primary',
            ),
            'password_reset.html': _render_email_html(
                preheader="Reset your Neurovent password securely.",
                eyebrow="Account security",
                title="Reset your password",
                intro_lines=[
                    "You requested a password reset for your Neurovent account.",
                    "Use the button below to choose a new password.",
                ],
                cta_label="Reset my password",
                cta_url=f"{settings.FRONTEND_URL}/reset-password/demo/token/",
                note_lines=[
                    "This link is valid for 24 hours.",
                    "If you did not make this request, you can safely ignore this email.",
                ],
                tone='primary',
            ),
        }

        for filename, html in preview_specs.items():
            (output_dir / filename).write_text(html, encoding='utf-8')

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(preview_specs)} previews generated in {output_dir}"
            )
        )
