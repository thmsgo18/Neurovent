from rest_framework import generics, permissions
from .models import Tag
from .serializers import TagSerializer


class TagListView(generics.ListAPIView):
    """Liste de tous les tags — accessible à tous"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]


class TagCreateView(generics.CreateAPIView):
    """Créer un tag — Admin uniquement"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAdminUser]


class TagDeleteView(generics.DestroyAPIView):
    """Supprimer un tag — Admin uniquement"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAdminUser]
