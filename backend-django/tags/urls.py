from django.urls import path
from .views import TagListView, TagCreateView, TagDeleteView

urlpatterns = [
    path('', TagListView.as_view(), name='tag-list'),              # GET  /api/tags/
    path('create/', TagCreateView.as_view(), name='tag-create'),   # POST /api/tags/create/
    path('<int:pk>/delete/', TagDeleteView.as_view(), name='tag-delete'),  # DEL /api/tags/1/delete/
]
