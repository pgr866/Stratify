from django.urls import include, path
from rest_framework import routers
from rest_framework.documentation import include_docs_urls
from stratify import views

router = routers.DefaultRouter()

router.register(r"user", views.UserView, "user")

urlpatterns = [
    path("api/v1/", include(router.urls)),
    path('docs/', include_docs_urls(title='API Documentation')),
    path("api/v1/check-auth/", views.CheckAuthView.as_view(), name='check-auth'),
    path("api/v1/login/", views.LoginView.as_view(), name='login'),
    path("api/v1/logout/", views.LogoutView.as_view(), name='logout'),
    path('api/v1/google-login/', views.GoogleLoginView.as_view(), name='google-login'),
    path('api/v1/github-login/', views.GithubLoginView.as_view(), name='github-login'),
    path('api/v1/validate-email/', views.ValidateEmailView.as_view(), name='validate-email'),
]
