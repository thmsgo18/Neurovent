"""
Tests — App users
Couvre : inscription, login, profil, mot de passe, suppression RGPD, admin
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import CustomUser, UserRole


def create_participant(email='alice@test.com', password='Test1234!', first_name='Alice', last_name='Dupont'):
    return CustomUser.objects.create_user(
        role=UserRole.PARTICIPANT, email=email, password=password,
        first_name=first_name, last_name=last_name,
    )


def create_company(identifier='braincorp', password='Test1234!', company_name='BrainCorp'):
    return CustomUser.objects.create_user(
        role=UserRole.COMPANY, email=None, company_identifier=identifier,
        password=password, company_name=company_name, recovery_email='contact@braincorp.com',
    )


def create_admin(email='admin@neurovent.com', password='Admin1234!'):
    return CustomUser.objects.create_superuser(email=email, password=password)


# ─────────────────────────────────────────
#  INSCRIPTION
# ─────────────────────────────────────────

class ParticipantRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        r = self.client.post('/api/auth/register/participant/', {
            'email': 'bob@test.com', 'password': 'Test1234!',
            'password_confirm': 'Test1234!', 'first_name': 'Bob', 'last_name': 'Martin',
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(email='bob@test.com').exists())

    def test_register_duplicate_email(self):
        create_participant()
        r = self.client.post('/api/auth/register/participant/', {
            'email': 'alice@test.com', 'password': 'Test1234!',
            'password_confirm': 'Test1234!', 'first_name': 'Alice2', 'last_name': 'Dupont',
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        r = self.client.post('/api/auth/register/participant/', {
            'email': 'bob@test.com', 'password': 'Test1234!',
            'password_confirm': 'Autre1234!', 'first_name': 'Bob', 'last_name': 'Martin',
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class CompanyRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        r = self.client.post('/api/auth/register/company/', {
            'company_identifier': 'neuro-lab', 'password': 'Test1234!',
            'password_confirm': 'Test1234!', 'company_name': 'NeuroLab',
            'recovery_email': 'contact@neurolab.com',
            'siret': '73282932000074',
            'legal_representative': 'Jean Dupont',
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        # Le statut est NEEDS_REVIEW en test (API SIRENE inaccessible en environnement de test)
        company = CustomUser.objects.get(company_identifier='neuro-lab')
        self.assertIn(company.verification_status, ['VERIFIED', 'NEEDS_REVIEW', 'REJECTED'])

    def test_register_invalid_identifier_special_chars(self):
        """Espaces et caractères spéciaux refusés"""
        r = self.client.post('/api/auth/register/company/', {
            'company_identifier': 'neuro lab!', 'password': 'Test1234!',
            'password_confirm': 'Test1234!', 'company_name': 'NeuroLab',
            'recovery_email': 'contact@neurolab.com',
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_identifier_too_short(self):
        r = self.client.post('/api/auth/register/company/', {
            'company_identifier': 'ab', 'password': 'Test1234!',
            'password_confirm': 'Test1234!', 'company_name': 'AB',
            'recovery_email': 'contact@ab.com',
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  LOGIN
# ─────────────────────────────────────────

class ParticipantLoginTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        create_participant()

    def test_login_success_returns_tokens(self):
        r = self.client.post('/api/auth/login/participant/', {'email': 'alice@test.com', 'password': 'Test1234!'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)

    def test_login_wrong_password(self):
        r = self.client.post('/api/auth/login/participant/', {'email': 'alice@test.com', 'password': 'Wrong!'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_email(self):
        r = self.client.post('/api/auth/login/participant/', {'email': 'unknown@test.com', 'password': 'Test1234!'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_contains_role(self):
        """Le token JWT doit contenir le rôle PARTICIPANT"""
        import base64, json
        r = self.client.post('/api/auth/login/participant/', {'email': 'alice@test.com', 'password': 'Test1234!'})
        payload = json.loads(base64.b64decode(r.data['access'].split('.')[1] + '=='))
        self.assertEqual(payload['role'], 'PARTICIPANT')


class CompanyLoginTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        create_company()

    def test_login_success(self):
        r = self.client.post('/api/auth/login/company/', {'identifier': 'braincorp', 'password': 'Test1234!'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)

    def test_login_wrong_password(self):
        r = self.client.post('/api/auth/login/company/', {'identifier': 'braincorp', 'password': 'Wrong!'})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_unknown_identifier(self):
        r = self.client.post('/api/auth/login/company/', {'identifier': 'unknown', 'password': 'Test1234!'})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  PROFIL
# ─────────────────────────────────────────

class ProfileTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = create_participant()
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        r = self.client.get('/api/auth/me/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['email'], 'alice@test.com')
        self.assertEqual(r.data['role'], UserRole.PARTICIPANT)

    def test_update_profile(self):
        r = self.client.patch('/api/auth/me/', {'employer_name': 'Sorbonne'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.employer_name, 'Sorbonne')

    def test_profile_requires_auth(self):
        self.client.force_authenticate(user=None)
        r = self.client.get('/api/auth/me/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────
#  MOT DE PASSE
# ─────────────────────────────────────────

class ChangePasswordTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = create_participant()
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        r = self.client.patch('/api/auth/me/password/', {
            'current_password': 'Test1234!', 'new_password': 'Nouveau2026!', 'new_password_confirm': 'Nouveau2026!',
        })
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Nouveau2026!'))

    def test_change_password_wrong_current(self):
        r = self.client.patch('/api/auth/me/password/', {
            'current_password': 'WrongPass!', 'new_password': 'Nouveau2026!', 'new_password_confirm': 'Nouveau2026!',
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_mismatch(self):
        r = self.client.patch('/api/auth/me/password/', {
            'current_password': 'Test1234!', 'new_password': 'Nouveau2026!', 'new_password_confirm': 'Autre2026!',
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  SUPPRESSION RGPD
# ─────────────────────────────────────────

class RGPDDeletionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = create_participant()
        self.client.force_authenticate(user=self.user)

    def test_delete_anonymizes_data(self):
        r = self.client.delete('/api/auth/me/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertIn('deleted', self.user.email)
        self.assertEqual(self.user.first_name, '[Supprimé]')

    def test_deleted_account_cannot_login(self):
        self.client.delete('/api/auth/me/')
        self.client.force_authenticate(user=None)
        r = self.client.post('/api/auth/login/participant/', {'email': 'alice@test.com', 'password': 'Test1234!'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────
#  ADMIN
# ─────────────────────────────────────────

class AdminUserListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = create_admin()
        self.client.force_authenticate(user=self.admin)
        self.participant = create_participant()
        self.company = create_company()

    def test_list_users(self):
        r = self.client.get('/api/auth/admin/users/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(r.data['count'], 2)

    def test_filter_by_role(self):
        r = self.client.get('/api/auth/admin/users/?role=PARTICIPANT')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for u in r.data['results']:
            self.assertEqual(u['role'], 'PARTICIPANT')

    def test_participant_cannot_access(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.get('/api/auth/admin/users/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_suspend_user(self):
        r = self.client.patch(f'/api/auth/admin/users/{self.participant.id}/suspend/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.participant.refresh_from_db()
        self.assertFalse(self.participant.is_active)

    def test_activate_user(self):
        self.participant.is_active = False
        self.participant.save()
        r = self.client.patch(f'/api/auth/admin/users/{self.participant.id}/activate/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.participant.refresh_from_db()
        self.assertTrue(self.participant.is_active)

    def test_delete_user(self):
        r = self.client.delete(f'/api/auth/admin/users/{self.participant.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.participant.refresh_from_db()
        self.assertFalse(self.participant.is_active)

    def test_cannot_delete_admin(self):
        other_admin = create_admin(email='other@test.com')
        r = self.client.delete(f'/api/auth/admin/users/{other_admin.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
