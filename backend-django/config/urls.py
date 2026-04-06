from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from users.views import CompanyPublicView, CompanyPublicListView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/events/', include('events.urls')),
    path('api/registrations/', include('registrations.urls')),
    path('api/tags/', include('tags.urls')),
    path('api/companies/', CompanyPublicListView.as_view(), name='company-public-list'),
    path('api/companies/<int:pk>/', CompanyPublicView.as_view(), name='company-public'),

    # ── Documentation API (Swagger / ReDoc) ──
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Sert les médias aussi en déploiement simple Render pour la démo.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
