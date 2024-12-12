from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, UserSerializer
from .models import User
from rest_framework.permissions import IsAuthenticated
from .permissions import IsOwner, IsNotAuthenticated, NoBody
from django.conf import settings
import requests
from django.contrib.auth import get_user_model

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

    def post(self, request):
        try:
            token = request.headers.get('Authorization').split(' ')[1]
            response = requests.get(f'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={token}')
            data = response.json()
            google_email = data.get("email")
            google_username = google_email.split('@')[0]
            google_id = data.get("sub")
            
            user = get_user_model().objects.filter(google_id=google_id).first()
            if not user:
                if get_user_model().objects.filter(username=google_username).first():
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
        except Exception:
            return Response({"message": "Google Login failed. Try to login with credentials"}, status=status.HTTP_400_BAD_REQUEST)

class GithubLoginView(APIView):
    permission_classes = [IsNotAuthenticated]
    
    def get(self, request, *args, **kwargs):
        
        return Response({}, status=200)
