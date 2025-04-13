import requests
import secrets
from types import SimpleNamespace
import ccxt

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from github import Github, Requester
from github.ApplicationOAuth import ApplicationOAuth

from .models import User, ApiKey
from .permissions import IsAuthenticated, IsNotAuthenticated, IsOwner, NoBody
from .serializers import UserSerializer, LoginSerializer, GoogleLoginSerializer, GithubLoginSerializer, RecoverPasswordSerializer, ApiKeySerializer

def set_auth_cookies(user, signup=False):
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    response = Response(status=status.HTTP_201_CREATED if signup else status.HTTP_200_OK)
    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Strict',
        max_age=settings.ACCESS_TOKEN_MAX_AGE,
    )
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Strict',
        max_age=settings.REFRESH_TOKEN_MAX_AGE,
    )
    return response

def send_verification_code(email):
    if not cache.get(email):
        verification_code = f"{secrets.randbelow(10**6):06}"
        cache.set(email, verification_code, timeout=600)
        subject = "Verification code"
        message = f"Your verification code is: {verification_code}. This code expires in 10 minutes"
        from_email = settings.DEFAULT_FROM_EMAIL
        send_mail(subject, message, from_email, [email])
    return Response({'detail': 'Verification code sent to your email'}, status=status.HTTP_200_OK)

#@method_decorator(cache_page(60*15), name='dispatch')
class UserView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create']:
            self.permission_classes = [IsNotAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'retrieve']:
            self.permission_classes = [IsOwner]
        elif self.action in ['list']:
            self.permission_classes = [NoBody]
        return super().get_permissions()
    
    def retrieve(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_active:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                new_access_token = str(refresh.access_token)
                user = User.objects.get(id=refresh["user_id"])
                serializer = self.get_serializer(user)
                response = Response(serializer.data, status=status.HTTP_200_OK)
                response.set_cookie(
                    key='access_token',
                    value=new_access_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Strict',
                    max_age=settings.ACCESS_TOKEN_MAX_AGE,
                )
                return response
            except Exception: pass
        return Response(status=status.HTTP_200_OK)
        
    def create(self, request, *args, **kwargs):
        verification_code = request.data.get('code')
        email = request.data.get('email')
        cached_code = cache.get(email)
        if not cached_code:
            return Response({'detail': 'Verification code not found or expired'}, status=status.HTTP_400_BAD_REQUEST)
        if verification_code != cached_code:
            return Response({'detail': 'Incorrect verification code'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(email)
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login_serializer = LoginSerializer(data={
                'username': user.username,
                'password': request.data['password']
            })
            if login_serializer.is_valid():
                user = login_serializer.validated_data['user']
                return set_auth_cookies(user, True)

        return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        verification_code = request.data.get('code')
        email = request.data.get('email')
        cached_code = cache.get(email)
        if not cached_code:
            return Response({'detail': 'Verification code not found or expired'}, status=status.HTTP_400_BAD_REQUEST)
        if verification_code != cached_code:
            return Response({'detail': 'Incorrect verification code'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(email)
        
        serializer = self.get_serializer(instance=request.user, data=request.data, partial=True)
        if serializer.is_valid():
            login_serializer = LoginSerializer(data={
                'username': request.user.username,
                'password': request.data['password']
            })
            if login_serializer.is_valid():
                user = serializer.save()
                set_auth_cookies(user)
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        verification_code = request.data.get('code')
        email = request.user.email
        cached_code = cache.get(email)
        if not cached_code:
            return Response({'detail': 'Verification code not found or expired'}, status=status.HTTP_400_BAD_REQUEST)
        if verification_code != cached_code:
            return Response({'detail': 'Incorrect verification code'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(email)
        
        login_serializer = LoginSerializer(data={
            'username': request.user.username,
            'password': request.data['password']
        })
        if login_serializer.is_valid():
            request.user.delete()
            response = Response(status=status.HTTP_204_NO_CONTENT)
            response.delete_cookie('access_token', path='/', samesite='Strict')
            response.delete_cookie('refresh_token', path='/', samesite='Strict')
            return response

        return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SendEmailUpdateAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserSerializer(instance=request.user, data=request.data, partial=True)
        if serializer.is_valid():
            login_serializer = LoginSerializer(data={
                'username': request.user.username,
                'password': request.data['password']
            })
            if login_serializer.is_valid():
                email = serializer.validated_data['email']
                return send_verification_code(email)

            return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SendEmailDeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        login_serializer = LoginSerializer(data={
            'username': request.user.username,
            'password': request.data['password']
        })
        if login_serializer.is_valid():
            email = request.user.email
            return send_verification_code(email)
            
        return Response(login_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SendEmailSignupView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            return send_verification_code(email)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SendEmailRecoverPasswordView(APIView):
    permission_classes = []
    
    def post(self, request):
        serializer = RecoverPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            return send_verification_code(email)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class RecoverPasswordView(APIView):
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        new_password = request.data.get('new_password')
        verification_code = request.data.get('code')
        cached_code = cache.get(email)
        if not cached_code:
            return Response({'detail': 'Verification code not found or expired'}, status=status.HTTP_400_BAD_REQUEST)
        if verification_code != cached_code:
            return Response({'detail': 'Incorrect verification code'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(email)
        
        serializer = RecoverPasswordSerializer(data={ 'email': email, 'new_password': new_password })
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=email).first()
        user.set_password(new_password)
        user.save()
        return set_auth_cookies(user)

class ToggleThemeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        user.dark_theme = not user.dark_theme
        user.save(update_fields=["dark_theme"])
        return Response({"dark_theme": user.dark_theme}, status=status.HTTP_200_OK)

class UpdateTimezoneView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        timezone = request.data.get("timezone")

        if not timezone:
            return Response({"error": "Timezone is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        user.timezone = timezone
        user.save(update_fields=["timezone"])
        return Response({"timezone": user.timezone}, status=status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            return set_auth_cookies(user)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(status=status.HTTP_200_OK)
        response.delete_cookie('access_token', path='/', samesite='Strict')
        response.delete_cookie('refresh_token', path='/', samesite='Strict')
        return response

class GoogleLoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                raise ValueError("Missing or invalid Authorization header")
            token = auth_header.split(' ')[1]
            
            response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={token}")
            response.raise_for_status()
            user_data = response.json()
            if user_data['aud'] != settings.VITE_GOOGLE_CLIENT_ID:
                raise ValueError("Invalid client ID")
            if not user_data.get('email_verified', False):
                raise ValueError("Email not verified")
            request.data["google_email"] = user_data.get("email")
            request.data["google_id"] = user_data.get("sub")
            serializer = GoogleLoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data["user"]
            return set_auth_cookies(user)
        except Exception:
            return Response({"message": "Google Login failed. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

class GithubLoginView(APIView):
    permission_classes = [IsNotAuthenticated]

    def post(self, request):
        try:
            code = request.data.get('code')
            requester = Requester.Requester(
                base_url="https://api.github.com",
                auth=None,
                timeout=10,
                user_agent="api",
                per_page=30,
                verify=True,
                retry=3,
                pool_size=10
            )
            oauth = ApplicationOAuth(requester=requester, headers={}, attributes={})
            oauth._client_id = SimpleNamespace(value=settings.VITE_GITHUB_CLIENT_ID)
            oauth._client_secret = SimpleNamespace(value=settings.GITHUB_CLIENT_SECRET)
            token = oauth.get_access_token(code=code)
            user_data = Github(token.token).get_user()
            request.data["github_id"] = user_data.id
            request.data["github_username"] = user_data.login
            request.data["github_email"] = user_data.email or f"{github_username}@github.local"
            serializer = GithubLoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data["user"]
            return set_auth_cookies(user)
        except Exception:
            return Response({"message": "Github Login failed. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

class ApiKeyView(viewsets.ModelViewSet):
    permission_classes = [IsOwner]
    serializer_class = ApiKeySerializer

    def list(self, request, *args, **kwargs):
        return Response(ApiKey.objects.filter(user=request.user).values_list("exchange", flat=True).distinct())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        exchange = serializer.validated_data["exchange"]
        api_key_instance, created = ApiKey.objects.update_or_create(
            user=user, exchange=exchange,
            defaults=serializer.validated_data
        )
        return Response(self.get_serializer(api_key_instance).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        exchange = kwargs.get("exchange")
        api_key_instance = ApiKey.objects.filter(user=request.user, exchange=exchange).first()
        if api_key_instance:
            api_key_instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "API Key not found"}, status=status.HTTP_400_BAD_REQUEST)

class ExchangesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response(ccxt.exchanges)
    
class MarketsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            exchange_name = request.query_params.get('exchange')
            api_key_instance = list(ApiKey.objects.filter(user=request.user, exchange=exchange_name).values('api_key', 'secret', 'password', 'uid'))
            exchange_class = getattr(ccxt, exchange_name)(api_key_instance[0] if api_key_instance else {})
            if exchange_class.has.get('fetchStatus'):
                status_response = exchange_class.fetch_status()
                if status_response.get('status') != 'ok':
                    return Response({'warning': f"{exchange_name} status: {status_response.get('status')}"})
            if exchange_name not in ['alpaca', 'bitpanda', 'bybit', 'coinbase', 'phemex', 'zaif']:
                exchange_class.load_markets(True)
                
            markets_data = exchange_class.markets.values() if exchange_class.markets else []
            symbols = [
                {
                    'symbol': x['symbol'],
                    'spot': x.get('spot', False),
                    'perp': x.get('swap', False)
                }
                for x in markets_data
                if x.get('active') and (x.get('spot') or x.get('swap'))
            ]
            timeframes = [x for x in list(exchange_class.timeframes.keys()) if exchange_class.timeframes[x]] if exchange_class.timeframes else []
            return Response({ 'symbols': symbols, 'timeframes': timeframes })
        except Exception:
            return Response({'error': f"Failed to load {exchange_name} markets"}, status=status.HTTP_404_NOT_FOUND)
