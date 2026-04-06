"""
Tests — App registrations
Couvre : inscription AUTO/VALIDATION, waitlist, annulation, promotion,
         company_comment, accessibility_needs, permissions, export CSV
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch
from .models import Registration, RegistrationStatus
from events.models import Event, EventStatus, EventFormat, RegistrationMode
from users.models import CustomUser, UserRole


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


def create_event(company, title='Conférence', days_from_now=10,
                 capacity=50, registration_mode=RegistrationMode.AUTO,
                 fmt=EventFormat.ONSITE,
                 evt_status=EventStatus.PUBLISHED):
    now = timezone.now()
    return Event.objects.create(
        company=company,
        title=title,
        description='Test',
        date_start=now + timedelta(days=days_from_now),
        date_end=now + timedelta(days=days_from_now, hours=4),
        capacity=capacity,
        status=evt_status,
        format=fmt,
        registration_mode=registration_mode,
        address_full='1 rue Test, 75001 Paris',
        address_city='Paris',
        address_country='France',
    )


# ─────────────────────────────────────────
#  MODE AUTO
# ─────────────────────────────────────────

class AutoRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.participant = create_participant()
        self.client.force_authenticate(user=self.participant)
        self.event = create_event(self.company, capacity=2, registration_mode=RegistrationMode.AUTO)

    def test_register_auto_confirms_immediately(self):
        """Mode AUTO + place dispo → CONFIRMED immédiatement"""
        r = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], RegistrationStatus.CONFIRMED)

    @patch('registrations.views.send_registration_waitlist')
    def test_register_auto_full_goes_to_waitlist(self, mock_waitlist):
        """Mode AUTO + event complet → WAITLIST (pas d'erreur)"""
        # Remplir l'event
        p2 = create_participant(email='b@test.com')
        p3 = create_participant(email='c@test.com')
        Registration.objects.create(participant=p2, event=self.event, status=RegistrationStatus.CONFIRMED)
        Registration.objects.create(participant=p3, event=self.event, status=RegistrationStatus.CONFIRMED)

        r = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], RegistrationStatus.WAITLIST)
        mock_waitlist.assert_called_once()

    def test_cannot_register_twice_if_active(self):
        """Un participant ne peut pas s'inscrire deux fois si une inscription active existe"""
        self.client.post('/api/registrations/', {'event': self.event.id})
        r = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_reregister_after_cancellation(self):
        """Un participant peut se réinscrire après avoir annulé son inscription"""
        # Première inscription → CONFIRMED
        r1 = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        reg_id = r1.data['id']

        # Annulation
        self.client.patch(f'/api/registrations/{reg_id}/cancel/')

        # Réinscription → doit réactiver l'inscription existante, pas en créer une nouvelle
        r2 = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.data['status'], RegistrationStatus.CONFIRMED)

        # Vérifier qu'il n'y a toujours qu'UNE SEULE ligne en base (réactivée, pas dupliquée)
        count = Registration.objects.filter(
            participant=self.participant, event=self.event
        ).count()
        self.assertEqual(count, 1)

    def test_cannot_register_to_unpublished_event(self):
        """Inscription refusée si l'event n'est pas PUBLISHED"""
        draft_event = create_event(self.company, evt_status=EventStatus.DRAFT)
        r = self.client.post('/api/registrations/', {'event': draft_event.id})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_register_to_started_event(self):
        """Inscription refusée si l'event a déjà commencé"""
        past_event = create_event(self.company, days_from_now=-1)
        r = self.client.post('/api/registrations/', {'event': past_event.id})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_register_to_live_online_event(self):
        """Un event online en cours reste inscriptible si l'option est activée"""
        now = timezone.now()
        live_online = create_event(self.company, fmt=EventFormat.ONLINE)
        live_online.date_start = now - timedelta(minutes=30)
        live_online.date_end = now + timedelta(hours=2)
        live_online.registration_deadline = None
        live_online.allow_registration_during_event = True
        live_online.save()

        r = self.client.post('/api/registrations/', {'event': live_online.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], RegistrationStatus.CONFIRMED)

    def test_can_register_to_live_hybrid_event(self):
        """Un event hybrid en cours reste inscriptible si l'option est activée"""
        now = timezone.now()
        live_hybrid = create_event(self.company, fmt=EventFormat.HYBRID)
        live_hybrid.date_start = now - timedelta(minutes=30)
        live_hybrid.date_end = now + timedelta(hours=2)
        live_hybrid.registration_deadline = None
        live_hybrid.allow_registration_during_event = True
        live_hybrid.save()

        r = self.client.post('/api/registrations/', {'event': live_hybrid.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], RegistrationStatus.CONFIRMED)

    def test_unlimited_event_never_becomes_full(self):
        """Un event illimité confirme les inscriptions sans passer en waitlist"""
        unlimited_event = create_event(self.company, capacity=0, registration_mode=RegistrationMode.AUTO)
        unlimited_event.unlimited_capacity = True
        unlimited_event.save(update_fields=['unlimited_capacity'])

        self.event = unlimited_event
        r = self.client.post('/api/registrations/', {'event': unlimited_event.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], RegistrationStatus.CONFIRMED)

    def test_cannot_register_to_live_onsite_event(self):
        """Un event présentiel en cours n'accepte pas de nouvelles inscriptions"""
        now = timezone.now()
        live_onsite = create_event(self.company, fmt=EventFormat.ONSITE)
        live_onsite.date_start = now - timedelta(minutes=30)
        live_onsite.date_end = now + timedelta(hours=2)
        live_onsite.registration_deadline = None
        live_onsite.save()

        r = self.client.post('/api/registrations/', {'event': live_onsite.id})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_register_to_live_online_event_if_option_disabled(self):
        """Un event online en cours reste fermé si l'organisateur n'a pas activé l'option"""
        now = timezone.now()
        live_online = create_event(self.company, fmt=EventFormat.ONLINE)
        live_online.date_start = now - timedelta(minutes=30)
        live_online.date_end = now + timedelta(hours=2)
        live_online.registration_deadline = None
        live_online.allow_registration_during_event = False
        live_online.save()

        r = self.client.post('/api/registrations/', {'event': live_online.id})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_register_after_deadline(self):
        """Inscription refusée après la deadline"""
        event = create_event(self.company)
        event.registration_deadline = timezone.now() - timedelta(hours=1)
        event.save()
        r = self.client.post('/api/registrations/', {'event': event.id})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  MODE VALIDATION
# ─────────────────────────────────────────

class ValidationRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.participant = create_participant()
        self.event = create_event(self.company, capacity=5, registration_mode=RegistrationMode.VALIDATION)

    @patch('registrations.views.send_registration_pending')
    def test_register_validation_creates_pending(self, mock_pending):
        """Mode VALIDATION + place dispo → PENDING, attente de la company"""
        self.client.force_authenticate(user=self.participant)
        r = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['status'], RegistrationStatus.PENDING)
        mock_pending.assert_called_once()

    def test_register_validation_full_returns_400(self):
        """Mode VALIDATION + event complet → erreur 400 (pas de waitlist en VALIDATION)"""
        full_event = create_event(self.company, capacity=1, registration_mode=RegistrationMode.VALIDATION)
        existing = create_participant(email='other@test.com')
        Registration.objects.create(participant=existing, event=full_event, status=RegistrationStatus.CONFIRMED)

        self.client.force_authenticate(user=self.participant)
        r = self.client.post('/api/registrations/', {'event': full_event.id})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_can_confirm_registration(self):
        """La company peut confirmer une inscription PENDING"""
        reg = Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.PENDING
        )
        self.client.force_authenticate(user=self.company)
        r = self.client.patch(f'/api/registrations/{reg.id}/status/', {'status': 'CONFIRMED'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.status, RegistrationStatus.CONFIRMED)

    def test_company_can_reject_registration(self):
        """La company peut rejeter une inscription PENDING"""
        reg = Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.PENDING
        )
        self.client.force_authenticate(user=self.company)
        r = self.client.patch(f'/api/registrations/{reg.id}/status/', {'status': 'REJECTED'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.status, RegistrationStatus.REJECTED)

    def test_company_can_add_comment_when_updating_status(self):
        """La company peut ajouter un commentaire lors de la mise à jour du statut"""
        reg = Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.PENDING
        )
        self.client.force_authenticate(user=self.company)
        r = self.client.patch(f'/api/registrations/{reg.id}/status/', {
            'status': 'CONFIRMED',
            'company_comment': 'Bienvenue à notre conférence !',
        })
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.company_comment, 'Bienvenue à notre conférence !')

    def test_company_cannot_set_invalid_status(self):
        """Seuls CONFIRMED et REJECTED sont acceptés par la company"""
        reg = Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.PENDING
        )
        self.client.force_authenticate(user=self.company)
        r = self.client.patch(f'/api/registrations/{reg.id}/status/', {'status': 'WAITLIST'})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_company_cannot_update_registration(self):
        """Une company ne peut pas modifier les inscriptions d'un event qui n'est pas le sien"""
        other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        reg = Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.PENDING
        )
        self.client.force_authenticate(user=other_company)
        r = self.client.patch(f'/api/registrations/{reg.id}/status/', {'status': 'CONFIRMED'})
        self.assertIn(r.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_admin_can_update_any_registration(self):
        """Un admin peut confirmer ou rejeter n'importe quelle inscription"""
        admin = create_admin()
        reg = Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.PENDING
        )
        self.client.force_authenticate(user=admin)
        r = self.client.patch(f'/api/registrations/{reg.id}/status/', {'status': 'CONFIRMED'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.status, RegistrationStatus.CONFIRMED)


# ─────────────────────────────────────────
#  ANNULATION ET PROMOTION WAITLIST
# ─────────────────────────────────────────

class CancelAndPromoteTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.event = create_event(self.company, capacity=1, registration_mode=RegistrationMode.AUTO)

        self.p1 = create_participant(email='p1@test.com')
        self.p2 = create_participant(email='p2@test.com')

        # p1 est CONFIRMED (a pris la seule place)
        self.reg_p1 = Registration.objects.create(
            participant=self.p1, event=self.event, status=RegistrationStatus.CONFIRMED
        )
        # p2 est en WAITLIST
        self.reg_p2 = Registration.objects.create(
            participant=self.p2, event=self.event, status=RegistrationStatus.WAITLIST
        )

    def test_cancel_promotes_first_waitlist(self):
        """Quand p1 annule, p2 (premier WAITLIST) doit être promu à CONFIRMED"""
        self.client.force_authenticate(user=self.p1)
        r = self.client.patch(f'/api/registrations/{self.reg_p1.id}/cancel/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        self.reg_p1.refresh_from_db()
        self.reg_p2.refresh_from_db()
        self.assertEqual(self.reg_p1.status, RegistrationStatus.CANCELLED)
        self.assertEqual(self.reg_p2.status, RegistrationStatus.CONFIRMED)

    def test_waitlist_position(self):
        """La position dans la waitlist est calculée correctement"""
        p3 = create_participant(email='p3@test.com')
        reg_p3 = Registration.objects.create(
            participant=p3, event=self.event, status=RegistrationStatus.WAITLIST
        )
        self.assertEqual(self.reg_p2.waitlist_position, 1)
        self.assertEqual(reg_p3.waitlist_position, 2)

    def test_participant_cannot_cancel_others_registration(self):
        """Un participant ne peut pas annuler l'inscription d'un autre"""
        self.client.force_authenticate(user=self.p2)
        r = self.client.patch(f'/api/registrations/{self.reg_p1.id}/cancel/')
        self.assertIn(r.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])


class RemoveRegistrationByCompanyTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        self.event = create_event(self.company, capacity=1, registration_mode=RegistrationMode.AUTO)
        self.participant = create_participant()
        self.waiting_participant = create_participant(email='wait@test.com')
        self.registration = Registration.objects.create(
            participant=self.participant,
            event=self.event,
            status=RegistrationStatus.CONFIRMED,
        )
        self.waitlist_registration = Registration.objects.create(
            participant=self.waiting_participant,
            event=self.event,
            status=RegistrationStatus.WAITLIST,
        )

    @patch('registrations.views.send_registration_removed_by_organizer')
    @patch('registrations.views.send_registration_confirmed')
    def test_company_can_remove_registration_and_promote_waitlist(self, mock_confirmed, mock_removed):
        self.client.force_authenticate(user=self.company)
        r = self.client.patch(f'/api/registrations/{self.registration.id}/remove/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

        self.registration.refresh_from_db()
        self.waitlist_registration.refresh_from_db()
        self.assertEqual(self.registration.status, RegistrationStatus.CANCELLED)
        self.assertEqual(self.waitlist_registration.status, RegistrationStatus.CONFIRMED)
        mock_removed.assert_called_once()
        mock_confirmed.assert_called_once_with(self.waitlist_registration, from_waitlist=True)

    def test_removed_registration_disappears_from_event_list(self):
        self.client.force_authenticate(user=self.company)
        self.client.patch(f'/api/registrations/{self.registration.id}/remove/')

        r = self.client.get(f'/api/registrations/event/{self.event.id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        ids = [item['id'] for item in results]
        self.assertNotIn(self.registration.id, ids)

    def test_other_company_cannot_remove_registration(self):
        self.client.force_authenticate(user=self.other_company)
        r = self.client.patch(f'/api/registrations/{self.registration.id}/remove/')
        self.assertIn(r.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])


# ─────────────────────────────────────────
#  ACCESSIBILITY NEEDS
# ─────────────────────────────────────────

class AccessibilityNeedsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.participant = create_participant()
        self.event = create_event(self.company, capacity=10)

    def test_participant_can_set_accessibility_needs(self):
        """Un participant peut indiquer ses besoins d'accessibilité lors de l'inscription"""
        self.client.force_authenticate(user=self.participant)
        r = self.client.post('/api/registrations/', {
            'event': self.event.id,
            'accessibility_needs': 'Fauteuil roulant, accès PMR nécessaire',
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        reg = Registration.objects.get(participant=self.participant, event=self.event)
        self.assertEqual(reg.accessibility_needs, 'Fauteuil roulant, accès PMR nécessaire')

    def test_accessibility_needs_optional(self):
        """accessibility_needs est optionnel (vide par défaut)"""
        self.client.force_authenticate(user=self.participant)
        r = self.client.post('/api/registrations/', {'event': self.event.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        reg = Registration.objects.get(participant=self.participant, event=self.event)
        self.assertEqual(reg.accessibility_needs, '')


# ─────────────────────────────────────────
#  MES INSCRIPTIONS (PARTICIPANT)
# ─────────────────────────────────────────

class MyRegistrationsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.participant = create_participant()
        self.client.force_authenticate(user=self.participant)

        self.event1 = create_event(self.company, title='Event 1')
        self.event2 = create_event(self.company, title='Event 2')
        self.reg1 = Registration.objects.create(
            participant=self.participant, event=self.event1, status=RegistrationStatus.CONFIRMED
        )
        self.reg2 = Registration.objects.create(
            participant=self.participant, event=self.event2, status=RegistrationStatus.CANCELLED
        )

    def test_list_all_my_registrations(self):
        r = self.client.get('/api/registrations/my/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # La réponse est paginée → utiliser r.data['results']
        results = r.data.get('results', r.data)
        self.assertEqual(len(results), 2)

    def test_filter_by_status(self):
        """?status=CONFIRMED ne retourne que les inscriptions confirmées"""
        r = self.client.get('/api/registrations/my/?status=CONFIRMED')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        for reg in results:
            self.assertEqual(reg['status'], RegistrationStatus.CONFIRMED)

    def test_company_cannot_list_participant_registrations(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get('/api/registrations/my/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────
#  LISTE INSCRITS (COMPANY)
# ─────────────────────────────────────────

class EventRegistrationsListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        self.participant = create_participant()
        self.event = create_event(self.company, capacity=10)
        Registration.objects.create(
            participant=self.participant, event=self.event, status=RegistrationStatus.CONFIRMED
        )

    def test_company_can_list_registrations_for_own_event(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        self.assertEqual(len(results), 1)

    def test_other_company_cannot_list_registrations(self):
        self.client.force_authenticate(user=self.other_company)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_participant_cannot_list_registrations(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────
#  EXPORT CSV
# ─────────────────────────────────────────

class ExportCSVTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = create_company()
        self.other_company = create_company(identifier='other-corp', company_name='OtherCorp')
        self.participant = create_participant()
        self.admin = create_admin()
        self.event = create_event(self.company, capacity=10)
        Registration.objects.create(
            participant=self.participant, event=self.event,
            status=RegistrationStatus.CONFIRMED,
            accessibility_needs='Daltonien',
            company_comment='Participant confirmé',
        )

    def test_company_can_export_csv(self):
        self.client.force_authenticate(user=self.company)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/export/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r['Content-Type'])
        content = r.content.decode('utf-8-sig')
        self.assertIn('Alice', content)
        self.assertIn('Daltonien', content)

    def test_admin_can_export_csv(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/export/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r['Content-Type'])

    def test_other_company_cannot_export_csv(self):
        self.client.force_authenticate(user=self.other_company)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/export/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_participant_cannot_export_csv(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.get(f'/api/registrations/event/{self.event.id}/export/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
