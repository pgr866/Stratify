from django.urls import include, path
from rest_framework import routers
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from api import views
from .permissions import IsAdmin
from .authentication import JWTCookieAuthentication

schema_view = get_schema_view(
    openapi.Info(
        title="API Documentation",
        default_version='v1',
        description="Documentation for the REST API",
    ),
    public=False,
    permission_classes=[IsAdmin],
    authentication_classes=[JWTCookieAuthentication],
)

urlpatterns = [
    # API Documentation Endpoints
    path('v1/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('v1/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='redoc-schema'),
    
    # User Management
    path("v1/user/me/", views.UserView.as_view({"get": "retrieve", "put": "update", "delete": "destroy"}), name="user-me"),
    path("v1/toggle-theme/", views.ToggleThemeView.as_view(), name="toggle-theme"),
    path('v1/send-email-signup/', views.SendEmailSignupView.as_view(), name='send-email-signup'),
    path("v1/signup/", views.UserView.as_view({"post": "create"}), name="signup"),
    path('v1/send-email-recover-password/', views.SendEmailRecoverPasswordView.as_view(), name='send-email-recover-password'),
    path('v1/recover-password/', views.RecoverPasswordView.as_view(), name='recover-password'),

    # Authentication
    path('v1/login/', views.LoginView.as_view(), name='login'),
    path('v1/logout/', views.LogoutView.as_view(), name='logout'),
    path('v1/google-login/', views.GoogleLoginView.as_view(), name='google-login'),
    path('v1/github-login/', views.GithubLoginView.as_view(), name='github-login'),

    # API Keys Management
    path("v1/apiKey/", views.ApiKeyView.as_view({"get": "list", "post": "create"}), name="apiKey-list"),
    path("v1/apiKey/<str:exchange>/", views.ApiKeyView.as_view({"delete": "destroy"}), name="apiKey-detail"),

    # Exchange Data
    path('v1/exchanges/', views.ExchangesView.as_view(), name='exchanges'),
]
