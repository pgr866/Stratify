import requests
import time

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .permissions import IsNotAuthenticated, IsOwner, NoBody
from .serializers import LoginSerializer, UserSerializer

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
                max_age=86400, # 1 day
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
                max_age=86400, # 1 days
            )
            return response

        return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GoogleLoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                raise Exception("Missing or invalid Authorization header")
            token = auth_header.split(' ')[1]
            user_response = requests.get(f'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={token}')
            if user_response.status_code != 200:
                raise Exception("Invalid token")
            
            user_data = user_response.json()
            if user_data.get('aud') != settings.VITE_GOOGLE_CLIENT_ID:
                raise Exception("Token is not from the correct application")
            if float(user_data['exp']) < time.time():
                raise Exception("Token has expired")
            if not user_data.get('email_verified', False):
                raise Exception("Email not verified")
            google_email = user_data.get("email")
            google_username = google_email.split('@')[0]
            google_id = user_data.get("sub")
            
            user = get_user_model().objects.filter(google_id=google_id).first()
            if not user:
                if get_user_model().objects.filter(username=google_username).exists():
                    google_username = google_email
                user = get_user_model().objects.create(
                    email=google_email,
                    username=google_username,
                    google_id=google_id
                )
            
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            response_data = {
                "id": user.id,
                "email": user.email,
                "username": user.username,
            }
            response = Response(response_data, status=status.HTTP_200_OK)
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=86400, # 1 day
            )
            return response
        except Exception as e:
            return Response({"message": f"Google Login failed. {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

class GithubLoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                raise Exception("Missing or invalid Authorization header")
            code = auth_header.split(' ')[1]
            token_response = requests.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "code": code,
                    "client_id": settings.VITE_GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            if token_response.status_code != 200 or "error" in token_data:
                raise Exception("Invalid code")
            access_token = token_data.get('access_token')
            
            validation_response = requests.post(
                f'https://api.github.com/applications/{settings.VITE_GITHUB_CLIENT_ID}/token',
                auth=(settings.VITE_GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET),
                json={"access_token": access_token}
            )
            if validation_response.status_code != 200 or validation_response.json().get('token') != access_token:
                raise Exception("Invalid token")
            
            user_response = requests.get(
                'https://api.github.com/user',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if user_response.status_code != 200:
                raise Exception("Invalid token")
            user_data = user_response.json()
            github_id = user_data.get("id")
            github_username = user_data.get("login")
            github_email = user_data.get("email") or f"{github_username}@github.local"
            user = get_user_model().objects.filter(github_id=github_id).first()
            if not user:
                if get_user_model().objects.filter(username=github_username).exists():
                    github_username = github_email

                user = get_user_model().objects.create(
                    email=github_email,
                    username=github_username,
                    github_id=github_id
                )
            
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            response_data = {
                "id": user.id,
                "email": user.email,
                "username": user.username,
            }
            response = Response(response_data, status=status.HTTP_200_OK)
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Strict',
                max_age=86400, # 1 día
            )
            return response

        except Exception as e:
            return Response({"message": f"Github Login failed. {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
