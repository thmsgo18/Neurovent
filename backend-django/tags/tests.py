"""
Tests — App tags
Couvre : liste publique, création admin, suppression admin, permissions
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Tag
from users.models import CustomUser, UserRole


def create_participant(email='alice@test.com', password='Test1234!'):
    return CustomUser.objects.create_user(
        role=UserRole.PARTICIPANT, email=email, password=password,
        first_name='Alice', last_name='Dupont',
    )


def create_admin(email='admin@neurovent.com', password='Admin1234!'):
    return CustomUser.objects.create_superuser(email=email, password=password)


# ─────────────────────────────────────────
#  LISTE
# ─────────────────────────────────────────

class TagListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        Tag.objects.create(name='Machine Learning')
        Tag.objects.create(name='Neurosciences')

    def test_list_is_public(self):
        """La liste des tags est accessible sans authentification"""
        r = self.client.get('/api/tags/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        results = r.data.get('results', r.data)
        self.assertEqual(len(results), 2)

    def test_list_returns_name_and_id(self):
        """Chaque tag retourne au minimum id et name"""
        r = self.client.get('/api/tags/')
        results = r.data.get('results', r.data)
        self.assertIn('id', results[0])
        self.assertIn('name', results[0])

    def test_list_is_sorted_alphabetically(self):
        """Les tags sont triés par ordre alphabétique (ordering = ['name'])"""
        r = self.client.get('/api/tags/')
        results = r.data.get('results', r.data)
        names = [t['name'] for t in results]
        self.assertEqual(names, sorted(names))


# ─────────────────────────────────────────
#  CRÉATION
# ─────────────────────────────────────────

class TagCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = create_admin()
        self.participant = create_participant()

    def test_admin_can_create_tag(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/tags/create/', {'name': 'IA Générative'})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Tag.objects.filter(name='IA Générative').exists())

    def test_participant_cannot_create_tag(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.post('/api/tags/create/', {'name': 'Mon Tag'})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_tag(self):
        r = self.client.post('/api/tags/create/', {'name': 'Mon Tag'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_tag_rejected(self):
        """Deux tags avec le même nom sont refusés (unique=True)"""
        Tag.objects.create(name='Robotique')
        self.client.force_authenticate(user=self.admin)
        r = self.client.post('/api/tags/create/', {'name': 'Robotique'})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  SUPPRESSION
# ─────────────────────────────────────────

class TagDeleteTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = create_admin()
        self.participant = create_participant()
        self.tag = Tag.objects.create(name='À supprimer')

    def test_admin_can_delete_tag(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.delete(f'/api/tags/{self.tag.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Tag.objects.filter(id=self.tag.id).exists())

    def test_participant_cannot_delete_tag(self):
        self.client.force_authenticate(user=self.participant)
        r = self.client.delete(f'/api/tags/{self.tag.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Tag.objects.filter(id=self.tag.id).exists())

    def test_anonymous_cannot_delete_tag(self):
        r = self.client.delete(f'/api/tags/{self.tag.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
