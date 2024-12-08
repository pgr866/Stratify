from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializer import LoginSerializer, UserSerializer
from .models import User
from rest_framework.permissions import IsAuthenticated
from .permissions import IsOwner, IsNotAuthenticated, NoBody
from django.conf import settings
from allauth.socialaccount.models import SocialAccount
from rest_framework.exceptions import AuthenticationFailed
from social_django.utils import load_strategy, load_backend
from social_core.exceptions import AuthException

class CheckAuthView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({'authenticated': request.user.is_authenticated}, status=status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            response_data = serializer.data
            response_data['id'] = user.id
            response_data['email'] = user.email
            response_data['username'] = user.username
            response = Response(response_data, status=status.HTTP_200_OK)
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=86400,  # 1 day
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(status=status.HTTP_200_OK)
        response.delete_cookie('access_token', path='/', samesite='Strict')
        return response
    
class UserView(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def get_permissions(self):
        if self.action in ['create']:
            self.permission_classes = [IsNotAuthenticated]
        elif self.action in ['retrieve']:
            self.permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsOwner]
        elif self.action in ['list']:
            self.permission_classes = [NoBody]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        login_serializer = LoginSerializer(data={
            'username': user.username,
            'password': request.data['password']
        })

        if login_serializer.is_valid():
            user = login_serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            response_data = login_serializer.data
            response_data['id'] = user.id
            response_data['email'] = user.email
            response_data['username'] = user.username

            response = Response(response_data, status=status.HTTP_201_CREATED)
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=86400,  # 1 days
            )
            return response

        return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GoogleLoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def get(self, request):
        token = request.query_params.get('access_token')
        if not token:
            raise AuthenticationFailed("Google token is missing")

        try:
            user = load_backend(load_strategy(request), "google-oauth2", None).do_auth(token)
            if not user or not user.is_active:
                raise AuthenticationFailed("Authentication failed or user is inactive")
        except AuthException as e:
            raise AuthenticationFailed(f"Authentication failed: {e}")

        user, _ = User.objects.get_or_create(
            email=user.email,
            defaults={'username': user.username or user.email.split('@')[0]}
        )

        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)}, status=200)

class GithubLoginView(APIView):
    permission_classes = [IsNotAuthenticated]
    
    def get(self, request, *args, **kwargs):
        # Autenticación con GitHub
        social_account = SocialAccount.objects.get(provider="github", user=request.user)

        # Accedemos a los datos del usuario de GitHub
        email = social_account.user.email
        username = social_account.user.username or email  # Si no tiene username, usamos el email

        # Si el usuario no existe, lo creamos
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'username': username}
        )

        # Generar el JWT
        refresh = RefreshToken.for_user(user)

        # Devolvemos el JWT como respuesta
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=200)