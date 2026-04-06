"""
Tests — App events
Couvre : liste publique, CRUD, filtres, permissions, stats, recommandations
"""
from django.test import TestCase
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch
from .models import Event, EventStatus, EventFormat, RegistrationMode
from users.models import CustomUser, UserRole
from tags.models import Tag
from registrations.models import Registration, RegistrationStatus
from .notification_utils import notify_event_capacity_milestones


def create_participant(email='alice@test.com', password='Test1234!'):
    return CustomUser.objects.create_user(
        role=UserRole.PARTICIPANT, email=email, password=password,
        first_name='Alice', last_name='Dupont',
    )


def create_company(identifier='braincorp', password='Test1234!', company_name='BrainCorp'):
    return CustomUser.objects.create_user(
        role=UserRole.COMPANY, email=None, company_identifier=identifier,
        password=password, company_name=company_name,
        recovery_email=f'contact@{identifier}.com',
        verification_status='VERIFIED',  # VERIFIED par défaut dans les tests
    )


def create_admin(email='admin@neurovent.com', password='Admin1234!'):
    return CustomUser.objects.create_superuser(email=email, password=password)


def create_event(company, title='Conférence ML', days_from_now=10,
                 evt_status=EventStatus.PUBLISHED, capacity=50,
                 registration_mode=RegistrationMode.AUTO, fmt=EventFormat.ONSITE):
    now = timezone.now()
    return Event.objects.create(
        company=company,
        title=title,
        description='Description test',
        date_start=now + timedelta(days=days_from_now),
        date_end=now + timedelta(days=days_from_now, hours=4),
        capacity=capacity,
        status=evt_status,
        format=fmt,
        registration_mode=registration_mode,
        address_full='1 rue de la Science, 75001 Paris',
        address_city='Paris',
        address_country='France',
    )


# ─────────────────────────────────────────
#  LISTE PUBLIQUE
# ─────────────────────────────────────────

class EventListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.pub1 = create_event(self.company, title='Event Publié 1')
        self.pub2 = create_event(self.company, title='Event Publié 2', fmt=EventFormat.ONLINE)
        self.draft = create_event(self.company, title='Brouillon', evt_status=EventStatus.DRAFT)
        self.past = create_event(self.company, title='Event Passé', days_from_now=-2)

    def test_public_list_only_published(self):
        """Un visiteur non connecté ne voit que les events PUBLISHED"""
        r = self.client.get('/api/events/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Event Publié 1', titles)
        self.assertIn('Event Publié 2', titles)
        self.assertNotIn('Brouillon', titles)

    def test_public_list_excludes_past_events(self):
        """La liste publique ne montre que les events en cours ou à venir"""
        r = self.client.get('/api/events/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertNotIn('Event Passé', titles)

    def test_list_is_paginated(self):
        """La réponse contient les champs de pagination"""
        r = self.client.get('/api/events/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('count', r.data)
        self.assertIn('results', r.data)
        self.assertIn('next', r.data)
        self.assertIn('previous', r.data)

    def test_filter_by_format(self):
        """Filtre ?format=ONLINE ne retourne que les events en ligne"""
        r = self.client.get('/api/events/?format=ONLINE')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for e in r.data['results']:
            self.assertEqual(e['format'], 'ONLINE')

    def test_search_by_title(self):
        """Filtre ?search= recherche dans le titre"""
        r = self.client.get('/api/events/?search=Publié 1')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Event Publié 1', titles)
        self.assertNotIn('Event Publié 2', titles)

    def test_search_matches_partial_word_in_title(self):
        create_event(self.company, title='Clinical NeuroAI Summit')
        r = self.client.get('/api/events/?search=clini')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Clinical NeuroAI Summit', titles)

    def test_search_matches_partial_word_in_description(self):
        event = create_event(self.company, title='NeuroAI Summit')
        event.description = 'Clinical applications of AI for neuro diagnostics'
        event.save(update_fields=['description'])

        r = self.client.get('/api/events/?search=diagnos')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('NeuroAI Summit', titles)

    def test_search_matches_company_name(self):
        create_event(self.company, title='Neuro Vision Day')
        r = self.client.get('/api/events/?search=Brain')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Neuro Vision Day', titles)

    def test_filter_by_exact_organization_name(self):
        other_company = create_company(identifier='atlas', company_name='Atlas Neuro Labs')
        create_event(self.company, title='Brain Event')
        create_event(other_company, title='Atlas Event')
        r = self.client.get('/api/events/?organization=Atlas%20Neuro%20Labs')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Atlas Event', titles)
        self.assertNotIn('Brain Event', titles)

    def test_upcoming_only_excludes_live_events(self):
        Event.objects.create(
            company=self.company,
            title='Live Organization Event',
            description='Live now',
            date_start=timezone.now() - timedelta(hours=1),
            date_end=timezone.now() + timedelta(hours=2),
            capacity=40,
            status=EventStatus.PUBLISHED,
            format=EventFormat.ONLINE,
            registration_mode=RegistrationMode.AUTO,
            online_link='https://zoom.us/j/123456789',
        )
        r = self.client.get('/api/events/?upcoming_only=true')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertNotIn('Live Organization Event', titles)
        self.assertIn('Event Publié 1', titles)

    def test_admin_can_filter_by_status(self):
        """Un admin peut voir les DRAFT avec ?status=DRAFT"""
        admin = create_admin()
        self.client.force_authenticate(user=admin)
        r = self.client.get('/api/events/?status=DRAFT')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Brouillon', titles)

    def test_non_admin_status_filter_ignored(self):
        """Un participant avec ?status=DRAFT ne voit toujours que les PUBLISHED"""
        participant = create_participant()
        self.client.force_authenticate(user=participant)
        r = self.client.get('/api/events/?status=DRAFT')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertNotIn('Brouillon', titles)


# ─────────────────────────────────────────
#  CRUD EVENTS
# ─────────────────────────────────────────

class EventCRUDTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        self.participant = create_participant()
        self.admin = create_admin()
        self.now = timezone.now()

    def _event_payload(self, title='Test Event'):
        return {
            'title': title,
            'description': 'Une conférence de test',
            'date_start': (self.now + timedelta(days=10)).isoformat(),
            'date_end': (self.now + timedelta(days=10, hours=3)).isoformat(),
            'capacity': 30,
            'format': 'ONSITE',
            'registration_mode': 'AUTO',
            'allow_registration_during_event': False,
            'address_full': '1 rue Test, 75001 Paris',
            'address_city': 'Paris',
            'address_country': 'France',
        }

    def test_company_can_create_event(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.post('/api/events/create/', self._event_payload())
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['title'], 'Test Event')
        self.assertEqual(r.data['status'], EventStatus.DRAFT)

    def test_company_can_create_online_event_with_live_registration_enabled(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Live Online Event')
        payload.update({
            'format': 'ONLINE',
            'allow_registration_during_event': True,
            'online_platform': 'Zoom',
            'online_link': 'https://zoom.us/j/123456789',
        })
        payload.pop('address_full', None)
        payload.pop('address_city', None)
        payload.pop('address_country', None)

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data['allow_registration_during_event'])

    def test_company_can_create_event_with_unlimited_capacity(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Unlimited Event')
        payload.update({
            'capacity': 0,
            'unlimited_capacity': True,
        })

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data['unlimited_capacity'])

    def test_limited_event_requires_capacity_above_one(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Tiny Event')
        payload.update({
            'capacity': 1,
            'unlimited_capacity': False,
        })

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('capacity', r.data)

    def test_cannot_create_event_with_start_datetime_in_past(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Past Start Event')
        payload.update({
            'date_start': (self.now - timedelta(minutes=30)).isoformat(),
            'date_end': (self.now + timedelta(hours=2)).isoformat(),
        })

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_start', r.data)

    def test_live_registration_requires_auto_confirm(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Invalid Live Event')
        payload.update({
            'format': 'ONLINE',
            'allow_registration_during_event': True,
            'registration_mode': 'VALIDATION',
            'online_platform': 'Zoom',
            'online_link': 'https://zoom.us/j/123456789',
        })
        payload.pop('address_full', None)
        payload.pop('address_city', None)
        payload.pop('address_country', None)

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('registration_mode', r.data)

    def test_live_registration_cannot_hide_online_link(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Invalid Hidden Link Event')
        payload.update({
            'format': 'ONLINE',
            'allow_registration_during_event': True,
            'registration_mode': 'AUTO',
            'online_platform': 'Zoom',
            'online_link': 'https://zoom.us/j/123456789',
            'online_visibility': 'PARTIAL',
        })
        payload.pop('address_full', None)
        payload.pop('address_city', None)
        payload.pop('address_country', None)

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('online_visibility', r.data)

    def test_live_registration_cannot_define_registration_deadline(self):
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload(title='Invalid Live Deadline Event')
        payload.update({
            'format': 'ONLINE',
            'allow_registration_during_event': True,
            'registration_mode': 'AUTO',
            'online_link': 'https://zoom.us/j/123456789',
            'registration_deadline': (self.now + timedelta(days=1)).isoformat(),
        })
        payload.pop('address_full', None)
        payload.pop('address_city', None)
        payload.pop('address_country', None)

        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('registration_deadline', r.data)

    def test_participant_cannot_create_event(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.post('/api/events/create/', self._event_payload())
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_event(self):
        r = self.client.post('/api/events/create/', self._event_payload())
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_company_can_update_own_event(self):
        self.client.force_authenticate(user=self.company)
        event = create_event(self.company)
        r = self.client.patch(f'/api/events/{event.id}/update/', {'title': 'Nouveau Titre'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['title'], 'Nouveau Titre')

    def test_company_cannot_update_other_event(self):
        # Le queryset filtre par company=request.user → 404 si pas owner (comportement DRF standard)
        self.client.force_authenticate(user=self.other_company)
        event = create_event(self.company)
        r = self.client.patch(f'/api/events/{event.id}/update/', {'title': 'Piratage'})
        self.assertIn(r.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_company_can_delete_own_event(self):
        self.client.force_authenticate(user=self.company)
        event = create_event(self.company)
        r = self.client.delete(f'/api/events/{event.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(id=event.id).exists())

    def test_company_cannot_delete_other_event(self):
        # Le queryset filtre par company=request.user → 404 si pas owner (comportement DRF standard)
        self.client.force_authenticate(user=self.other_company)
        event = create_event(self.company)
        r = self.client.delete(f'/api/events/{event.id}/delete/')
        self.assertIn(r.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        self.assertTrue(Event.objects.filter(id=event.id).exists())

    def test_admin_can_delete_any_event(self):
        self.client.force_authenticate(user=self.admin)
        event = create_event(self.company)
        r = self.client.delete(f'/api/events/admin/{event.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(id=event.id).exists())

    def test_event_date_end_before_start_rejected(self):
        """date_end < date_start doit être rejeté"""
        self.client.force_authenticate(user=self.company)
        payload = self._event_payload()
        payload['date_end'] = (self.now + timedelta(days=5)).isoformat()  # avant date_start
        r = self.client.post('/api/events/create/', payload)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_published_event_detail(self):
        event = create_event(self.company)
        r = self.client.get(f'/api/events/{event.id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['title'], event.title)
        event.refresh_from_db()
        self.assertEqual(event.view_count, 1)

    def test_get_draft_event_not_visible_to_public(self):
        """Un event DRAFT n'est pas visible par un visiteur anonyme"""
        draft = create_event(self.company, evt_status=EventStatus.DRAFT)
        r = self.client.get(f'/api/events/{draft.id}/')
        self.assertIn(r.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])


# ─────────────────────────────────────────
#  MES EVENTS (COMPANY)
# ─────────────────────────────────────────

class MyEventsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        create_event(self.company, title='Mon Event Publié', evt_status=EventStatus.PUBLISHED)
        create_event(self.company, title='Mon Brouillon', evt_status=EventStatus.DRAFT)
        create_event(self.other_company, title='Event Autre Company')

    def test_my_events_returns_all_own_statuses(self):
        """La company voit tous ses events (PUBLISHED + DRAFT), pas ceux des autres"""
        self.client.force_authenticate(user=self.company)
        r = self.client.get('/api/events/my-events/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Mon Event Publié', titles)
        self.assertIn('Mon Brouillon', titles)
        self.assertNotIn('Event Autre Company', titles)

    def test_participant_cannot_access_my_events(self):
        participant = create_participant()
        self.client.force_authenticate(user=participant)
        r = self.client.get('/api/events/my-events/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────
#  STATS PAR EVENT
# ─────────────────────────────────────────

class EventStatsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        self.participant = create_participant()
        self.admin = create_admin()
        self.event = create_event(self.company)

    def test_owner_can_see_stats(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get(f'/api/events/{self.event.id}/stats/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # La réponse contient 'registrations' (dict nested) et 'spots_remaining'
        self.assertIn('registrations', r.data)
        self.assertIn('spots_remaining', r.data)

    def test_other_company_cannot_see_stats(self):
        self.client.force_authenticate(user=self.other_company)
        r = self.client.get(f'/api/events/{self.event.id}/stats/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_participant_cannot_see_stats(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.get(f'/api/events/{self.event.id}/stats/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_see_stats(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(f'/api/events/{self.event.id}/stats/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class CompanyDashboardStatsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        self.participant = create_participant()

        now = timezone.now()
        self.upcoming_event = create_event(self.company, title='Upcoming Event', days_from_now=5, capacity=100)
        self.upcoming_event.view_count = 42
        self.upcoming_event.save()

        self.past_event = create_event(self.company, title='Past Event', days_from_now=-10, capacity=50)
        self.past_event.date_end = now - timedelta(days=9, hours=20)
        self.past_event.view_count = 18
        self.past_event.save()

        Registration.objects.create(
            participant=self.participant,
            event=self.upcoming_event,
            status=RegistrationStatus.CONFIRMED,
        )
        waitlist_participant = create_participant(email='wait@test.com')
        Registration.objects.create(
            participant=waitlist_participant,
            event=self.upcoming_event,
            status=RegistrationStatus.WAITLIST,
        )
        pending_participant = create_participant(email='pending@test.com')
        Registration.objects.create(
            participant=pending_participant,
            event=self.upcoming_event,
            status=RegistrationStatus.PENDING,
        )
        cancelled_participant = create_participant(email='cancelled@test.com')
        Registration.objects.create(
            participant=cancelled_participant,
            event=self.past_event,
            status=RegistrationStatus.CANCELLED,
        )

        other_event = create_event(self.other_company, title='Other Event', capacity=10)
        other_event.view_count = 99
        other_event.save()

    def test_company_can_get_dashboard_stats(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get('/api/events/dashboard-stats/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['total_views'], 60)
        self.assertEqual(r.data['total_registrations'], 4)
        self.assertEqual(r.data['pending_requests'], 1)
        self.assertEqual(r.data['confirmed_participants'], 1)
        self.assertEqual(r.data['waitlist_count'], 1)
        self.assertEqual(r.data['average_fill_rate'], 0.7)
        self.assertEqual(r.data['upcoming_events'], 1)
        self.assertEqual(r.data['past_events'], 1)
        self.assertEqual(r.data['cancellation_rate'], 25.0)

    def test_participant_cannot_get_dashboard_stats(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.get('/api/events/dashboard-stats/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class EventEmailNotificationsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.participant = create_participant()

    @patch('events.views.send_event_updated')
    def test_updating_event_schedule_notifies_confirmed_participants(self, mock_send_event_updated):
        event = create_event(self.company)
        Registration.objects.create(
            participant=self.participant,
            event=event,
            status=RegistrationStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.company)
        response = self.client.patch(
            f'/api/events/{event.id}/update/',
            {'date_start': (event.date_start + timedelta(days=1)).isoformat()},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send_event_updated.assert_called_once()
        changes = mock_send_event_updated.call_args.args[1]
        self.assertTrue(any("date ou l'horaire" in change for change in changes))

    @patch('events.notification_utils.send_event_capacity_alert')
    def test_capacity_alert_sent_when_event_becomes_almost_full(self, mock_capacity_alert):
        event = create_event(self.company, capacity=5)
        for index in range(3):
            Registration.objects.create(
                participant=create_participant(email=f'p{index}@test.com'),
                event=event,
                status=RegistrationStatus.CONFIRMED,
            )

        Registration.objects.create(
            participant=self.participant,
            event=event,
            status=RegistrationStatus.CONFIRMED,
        )

        notify_event_capacity_milestones(event)

        event.refresh_from_db()
        mock_capacity_alert.assert_called_once_with(event, 'ALMOST_FULL')
        self.assertIsNotNone(event.almost_full_notified_at)


class EventNotificationCommandTest(TestCase):
    def setUp(self):
        self.company = create_company()
        self.participant = create_participant()

    @patch('events.management.commands.send_event_notifications.send_event_organizer_digest')
    @patch('events.management.commands.send_event_notifications.send_event_access_revealed')
    @patch('events.management.commands.send_event_notifications.send_event_reminder')
    def test_command_sends_reminders_reveals_and_digest(
        self,
        mock_send_event_reminder,
        mock_send_event_access_revealed,
        mock_send_event_organizer_digest,
    ):
        now = timezone.now()
        event = Event.objects.create(
            company=self.company,
            title='Event Notifications',
            description='Test notifications planifiées',
            date_start=now + timedelta(hours=2),
            date_end=now + timedelta(hours=5),
            capacity=10,
            status=EventStatus.PUBLISHED,
            format=EventFormat.HYBRID,
            registration_mode=RegistrationMode.AUTO,
            address_full='1 rue Reveal, 75001 Paris',
            address_city='Paris',
            address_country='France',
            address_visibility='PARTIAL',
            address_reveal_date=now - timedelta(minutes=5),
            online_platform='Zoom',
            online_link='https://zoom.us/j/123456789',
            online_visibility='PARTIAL',
            online_reveal_date=now - timedelta(minutes=5),
        )
        Registration.objects.create(
            participant=self.participant,
            event=event,
            status=RegistrationStatus.CONFIRMED,
            accessibility_needs='Accès PMR',
        )

        call_command('send_event_notifications')

        event.refresh_from_db()
        mock_send_event_reminder.assert_called_once()
        mock_send_event_access_revealed.assert_called_once()
        mock_send_event_organizer_digest.assert_called_once_with(event)
        self.assertIsNotNone(event.reminder_3h_sent_at)
        self.assertIsNotNone(event.address_reveal_email_sent_at)
        self.assertIsNotNone(event.online_reveal_email_sent_at)
        self.assertIsNotNone(event.organizer_digest_sent_at)

    def test_company_can_export_dashboard_summary(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get('/api/events/dashboard-stats/export-summary/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r['Content-Type'])
        self.assertIn('dashboard_summary.csv', r['Content-Disposition'])

    def test_company_can_export_events_performance(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get('/api/events/dashboard-stats/export-performance/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r['Content-Type'])
        self.assertIn('events_performance.csv', r['Content-Disposition'])


# ─────────────────────────────────────────
#  RECOMMANDATIONS
# ─────────────────────────────────────────

class RecommendedEventsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.participant = create_participant()
        self.tag_ml, _ = Tag.objects.get_or_create(name='Machine Learning')
        self.tag_neuro, _ = Tag.objects.get_or_create(name='Neurosciences')

        self.event_ml = create_event(self.company, title='Event ML')
        self.event_ml.tags.add(self.tag_ml)

        self.event_neuro = create_event(self.company, title='Event Neuro')
        self.event_neuro.tags.add(self.tag_neuro)

        # Participant intéressé par ML seulement
        self.participant.tags.add(self.tag_ml)

    def test_recommended_returns_matching_tags(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.get('/api/events/recommended/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Event ML', titles)
        self.assertNotIn('Event Neuro', titles)

    def test_company_cannot_access_recommendations(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get('/api/events/recommended/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_access_recommendations(self):
        r = self.client.get('/api/events/recommended/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────
#  FILTRES AVANCÉS
# ─────────────────────────────────────────

class EventFilterTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.tag = Tag.objects.create(name='IA')

        self.event_paris = create_event(self.company, title='Event Paris', days_from_now=5)
        self.event_paris.address_city = 'Paris'
        self.event_paris.save()

        self.event_lyon = create_event(self.company, title='Event Lyon', days_from_now=15)
        self.event_lyon.address_city = 'Lyon'
        self.event_lyon.save()
        self.event_lyon.tags.add(self.tag)

    def test_filter_by_city(self):
        r = self.client.get('/api/events/?city=Paris')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Event Paris', titles)
        self.assertNotIn('Event Lyon', titles)

    def test_filter_by_tags(self):
        r = self.client.get(f'/api/events/?tags={self.tag.id}')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Event Lyon', titles)
        self.assertNotIn('Event Paris', titles)

    def test_filter_by_date_after(self):
        future_date = (timezone.now() + timedelta(days=10)).date().isoformat()
        r = self.client.get(f'/api/events/?date_after={future_date}')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in r.data['results']]
        self.assertIn('Event Lyon', titles)
        self.assertNotIn('Event Paris', titles)
