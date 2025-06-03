import requests
import secrets
import string
import json
import re
from types import SimpleNamespace
import ccxt
import pandas as pd
import talib as ta
import time
import threading
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.core.paginator import Paginator
from django.db import connection
from django.db.models import Q, Sum, Avg
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from github import Github, Requester
from github.ApplicationOAuth import ApplicationOAuth

from .models import User, ApiKey, Strategy, StrategyExecution, Trade, Candle
from .permissions import IsAuthenticated, IsNotAuthenticated, IsOwner, NoBody
from .serializers import UserSerializer, LoginSerializer, GoogleLoginSerializer, GithubLoginSerializer, RecoverPasswordSerializer, ApiKeySerializer, StrategySerializer, CandleSerializer, StrategyExecutionSerializer

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

class Exchange:
    def __new__(cls, exchange_name, user):
        try:
            api_key_instance = list(ApiKey.objects.filter(user=user, exchange=exchange_name).values('api_key', 'secret', 'password', 'uid'))
            exchange = getattr(ccxt, exchange_name)(api_key_instance[0] if api_key_instance else {})
            if exchange.has.get('fetchStatus'):
                status_response = exchange.fetch_status()
                if status_response.get('status') != 'ok':
                    raise Exception('Exchange service unavailable')
            exchange.load_markets()
            exchange.precisionMode = ccxt.TICK_SIZE
            exchange.roundingMode = ccxt.TRUNCATE
            exchange.name = exchange_name
            return exchange
        except Exception:
            raise Exception('Unable to initialize exchange')

#@method_decorator(cache_page(60*15), name='dispatch')
class UserView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['retrieve']:
            self.permission_classes = []
        if self.action in ['create']:
            self.permission_classes = [IsNotAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
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
        return Response([e for e in ccxt.exchanges if e not in {'alpaca','apex','bequant','bitmart','bitso','coinex','coinlist','coinsph','lbank','oceanex','onetrading','paradex','phemex','woofipro'} and all(getattr(ccxt, e)().has.get(m) for m in ['fetchOHLCV','fetchBalance','cancelAllOrders','createOrder','fetchOrder'])])
    
class SymbolsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            exchange_name = request.query_params.get('exchange')
            exchange = Exchange(exchange_name, request.user)
            markets_data = exchange.markets.values() if exchange.markets else []
            unavailable = exchange.options.get('unavailableContracts', {})
            symbols = [
                {
                    'symbol': x['symbol'],
                    'spot': x.get('spot', False),
                    'perp': x.get('swap', False)
                }
                for x in markets_data
                if x.get('active') and (x.get('spot') or x.get('swap')) and x.get('symbol') not in unavailable and not (
                    exchange_name == 'bitflyer' and x.get('symbol') == 'BTC/JPY:JPY'
                )
            ]
            timeframes = [x for x in list(exchange.timeframes.keys()) if exchange.timeframes[x]] if exchange.timeframes else []
            return Response({ 'symbols': symbols, 'timeframes': timeframes })
        except Exception:
            return Response({'error': f"Failed to load {exchange_name} markets"}, status=status.HTTP_404_NOT_FOUND)

class MarketInfoView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            exchange_name = request.query_params.get('exchange')
            symbol = request.query_params.get('symbol')
            exchange = Exchange(exchange_name, request.user)
            market = exchange.markets[symbol]
            
            taker_fee = market.get('taker')
            maker_fee = market.get('maker')
            contract_size = market.get('contractSize')
            max_leverage = market.get('limits', {}).get('leverage', {}).get('max')
            
            return Response({
                'taker_fee': taker_fee,
                'maker_fee': maker_fee,
                'contract_size': contract_size,
                'max_leverage': max_leverage
            })
        except Exception:
            return Response({'error': f"Failed to load {symbol} market at {exchange_name}"}, status=status.HTTP_404_NOT_FOUND)

class StrategyPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class StrategyView(viewsets.ModelViewSet):
    serializer_class = StrategySerializer
    pagination_class = StrategyPagination
    
    def get_permissions(self):
        if self.action in ['retrieve', 'list']:
            self.permission_classes = [IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsOwner]
        return super().get_permissions()

    def get_queryset(self):
        if self.action == 'list':
            if self.request.path.endswith('/strategy/me/'):
                return Strategy.objects.filter(user=self.request.user)
            else:
                name = self.request.query_params.get('name')
                only_mine = self.request.query_params.get('only_mine')
                exchange = self.request.query_params.get('exchange')
                symbol = self.request.query_params.get('symbol')
                if only_mine and only_mine.lower() == 'true':
                    queryset = Strategy.objects.filter(user=self.request.user)
                else:
                    queryset = Strategy.objects.filter(is_public=True)
                if name:
                    queryset = queryset.filter(name__icontains=name)
                if exchange:
                    queryset = queryset.filter(exchange__iexact=exchange)
                if symbol:
                    queryset = queryset.filter(symbol__iexact=symbol)
                return queryset.order_by('-clones_count')
        else:
            return Strategy.objects.filter(Q(id=self.kwargs['pk']), Q(is_public=True) | Q(user=self.request.user))
    
    def get_paginated_response(self, data):
        return super().get_paginated_response(data)
        
    def list(self, request, *args, **kwargs):
        if request.path.endswith('/strategy/me/'):
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
    def _get_unique_name(self, name, current_id=None):
        counter = 0
        test_name = name
        query = Strategy.objects.filter(user=self.request.user, name=test_name)
        if current_id:
            query = query.exclude(id=current_id)
        while query.exists():
            counter += 1
            test_name = f"{name} ({counter})"
            query = Strategy.objects.filter(user=self.request.user, name=test_name)
            if current_id:
                query = query.exclude(id=current_id)
        return test_name
    
    def perform_create(self, serializer):
        serializer.validated_data['name'] = self._get_unique_name("New Strategy")
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        name = serializer.validated_data.get('name')
        serializer.validated_data['name'] = self._get_unique_name(name, self.kwargs['pk'])
        serializer.save(user=self.request.user)

    def clone(self, request, pk=None):
        try:
            original = Strategy.objects.get(id=pk, is_public=True)
        except Strategy.DoesNotExist:
            return Response({"detail": "Strategy does not exist or is not public"}, status=status.HTTP_404_NOT_FOUND)

        clone_name = self._get_unique_name(f"{original.name} (Clone)")

        cloned = Strategy.objects.create(
            user=request.user,
            name=clone_name,
            exchange=original.exchange,
            symbol=original.symbol,
            timeframe=original.timeframe,
            timestamp_start=original.timestamp_start,
            timestamp_end=original.timestamp_end,
            indicators=original.indicators,
            is_public=False,
        )

        if original.user != request.user:
            original.clones_count += 1
            original.save(update_fields=["clones_count"])
        
        execution_id = request.data.get('execution_id')
        if execution_id:
            try:
                original_execution = StrategyExecution.objects.get(id=execution_id, strategy=original)
                StrategyExecution.objects.create(
                    strategy=cloned,
                    type='backtest',
                    order_conditions=original_execution.order_conditions,
                    running=False,
                    exchange=original_execution.exchange,
                    symbol=original_execution.symbol,
                    timeframe=original_execution.timeframe,
                    timestamp_start=original_execution.timestamp_start,
                    timestamp_end=original_execution.timestamp_end,
                    indicators=original_execution.indicators,
                    maker_fee=original_execution.maker_fee,
                    taker_fee=original_execution.taker_fee,
                    initial_tradable_value=original_execution.initial_tradable_value,
                    leverage=original_execution.leverage,
                    execution_timestamp=original_execution.execution_timestamp,
                    abs_net_profit=original_execution.abs_net_profit,
                    rel_net_profit=original_execution.rel_net_profit,
                    total_closed_trades=original_execution.total_closed_trades,
                    winning_trade_rate=original_execution.winning_trade_rate,
                    profit_factor=original_execution.profit_factor,
                    abs_avg_trade_profit=original_execution.abs_avg_trade_profit,
                    rel_avg_trade_profit=original_execution.rel_avg_trade_profit,
                    abs_max_run_up=original_execution.abs_max_run_up,
                    rel_max_run_up=original_execution.rel_max_run_up,
                    abs_max_drawdown=original_execution.abs_max_drawdown,
                    rel_max_drawdown=original_execution.rel_max_drawdown,
                )
            except StrategyExecution.DoesNotExist:
                return Response({"detail": "StrategyExecution does not exist or does not belong to the strategy"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(cloned)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CandleView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_candles(self, exchange, symbol, timeframe, timestamp_start, timestamp_end, db_search=False, extra_candles=0):
        MAX_CANDLES = 50000
        candles = pd.DataFrame(columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        if extra_candles > 0:
            timeframe_ms = int(pd.Timedelta(f"{int(timeframe[:-1]) * (30 if timeframe.endswith('M') else 365)}d" if timeframe.endswith(('M','y')) else timeframe).total_seconds() * 1000)
            timestamp_start -= extra_candles * timeframe_ms
        candles_count = int((timestamp_end - timestamp_start) // (pd.Timedelta(f"{int(timeframe[:-1]) * (30 if timeframe.endswith('M') else 365)}d" if timeframe.endswith(('M','y')) else timeframe).total_seconds() * 1000)) + 2
        if candles_count > MAX_CANDLES:
            timeframe_ms = int(pd.Timedelta(f"{int(timeframe[:-1]) * (30 if timeframe.endswith('M') else 365)}d" if timeframe.endswith(('M','y')) else timeframe).total_seconds() * 1000)
            timestamp_start = timestamp_end - (MAX_CANDLES * timeframe_ms)
            candles_count = MAX_CANDLES
        if db_search:
            candles = pd.DataFrame.from_records(Candle.objects.filter(
                exchange=exchange.name,
                symbol=symbol,
                timeframe=timeframe,
                timestamp__gte=timestamp_start,
                timestamp__lte=timestamp_end
            ).order_by('timestamp').values('timestamp', 'open', 'high', 'low', 'close', 'volume'))
        if candles.empty:
            if candles_count <= 0:
                return candles
            candles = pd.DataFrame(exchange.fetch_ohlcv(symbol=symbol, timeframe=timeframe, since=timestamp_start - 1, limit=candles_count), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            candles = candles[candles['timestamp'].between(timestamp_start, timestamp_end, inclusive='both')]
        if candles.empty:
            Candle.objects.filter(
                exchange=exchange.name,
                symbol=symbol,
                timeframe=timeframe,
                timestamp__lt=timestamp_end
            ).delete()
            return candles
        ts_start = int(candles['timestamp'].iloc[0])
        ts_end = int(candles['timestamp'].iloc[-1])
        if ts_start <= timestamp_start and ts_end >= timestamp_end:
            return candles
        if ts_start > timestamp_start:
            new_candles = self.get_candles(exchange, symbol, timeframe, timestamp_start, ts_start - 1)
            candles = pd.concat([candles, new_candles]).sort_values(by='timestamp', ascending=True).reset_index(drop=True)
        if ts_end < timestamp_end:
            new_candles = self.get_candles(exchange, symbol, timeframe, ts_end + 1, timestamp_end)
            candles = pd.concat([candles, new_candles]).sort_values(by='timestamp', ascending=True).reset_index(drop=True)
        return candles.drop_duplicates('timestamp')
    
    def get(self, request):
        try:
            exchange = request.query_params.get('exchange')
            symbol = request.query_params.get('symbol')
            timeframe = request.query_params.get('timeframe')
            timestamp_start = int(request.query_params.get('timestamp_start'))
            timestamp_end = int(request.query_params.get('timestamp_end'))
            
            if not all([exchange, symbol, timeframe, timestamp_start, timestamp_end]):
                return Response(
                    {'error': 'Missing required parameters. Please provide: exchange, symbol, timeframe, timestamp_start, timestamp_end'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            candles_df = self.get_candles(
                exchange=Exchange(exchange, request.user),
                symbol=symbol,
                timeframe=timeframe,
                timestamp_start=timestamp_start,
                timestamp_end=timestamp_end,
                db_search=True
            )
            
            if candles_df.empty:
                candles = Candle.objects.none()
            else:
                for col in ['open', 'high', 'low', 'close', 'volume']:
                    candles_df[col] = candles_df[col].apply(lambda x: Decimal(str(x)))
                records = candles_df.assign(
                    exchange=exchange,
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp=candles_df['timestamp'].astype(int),
                    open=candles_df['open'],
                    high=candles_df['high'],
                    low=candles_df['low'],
                    close=candles_df['close'],
                    volume=candles_df['volume']
                ).to_dict(orient='records')
                
                Candle.objects.bulk_create([Candle(**row) for row in records], ignore_conflicts=True)

                candles = Candle.objects.filter(
                    exchange=exchange,
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp__gte=timestamp_start,
                    timestamp__lte=timestamp_end
                ).order_by('timestamp')
            
            serializer = CandleSerializer(candles, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class IndicatorView(APIView):
    permission_classes = [IsAuthenticated]
    
    def compute_indicator_data(self, user, strategy, timestamp_start, timestamp_end, indicator_id):
        exchange = strategy.exchange
        symbol = strategy.symbol
        timeframe = strategy.timeframe
        indicators = json.loads(strategy.indicators)
        indicator = next((ind for ind in indicators if ind['id'] == indicator_id), None)
        if indicator is None:
            raise LookupError("Indicator not found")
        new_indicator = 'params' not in indicator
        short_name = indicator.get('short_name')
        if not short_name:
            raise LookupError("Indicator missing 'short_name' field")
        
        match short_name:
            case 'RSI':
                if new_indicator:
                    indicator['params'] = [
                        {"key": "length", "value": 14},
                        {"key": "upper_limit", "value": 70},
                        {"key": "middle_limit", "value": 50},
                        {"key": "lower_limit", "value": 30},
                    ]
                length = int(next(p for p in indicator['params'] if p['key'] == 'length')['value'])
                candles_df = CandleView().get_candles(
                    exchange=Exchange(exchange, user),
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp_start=timestamp_start,
                    timestamp_end=timestamp_end,
                    db_search=True,
                    extra_candles=2 * length
                )
                candles_df['rsi'] = ta.RSI(candles_df['close'].astype(float).values, timeperiod=length)
            case 'SMA':
                if new_indicator:
                    indicator['params'] = [
                        {"key": "length", "value": 9},
                    ]
                length = int(next(p for p in indicator['params'] if p['key'] == 'length')['value'])
                candles_df = CandleView().get_candles(
                    exchange=Exchange(exchange, user),
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp_start=timestamp_start,
                    timestamp_end=timestamp_end,
                    db_search=True,
                    extra_candles=length
                )
                candles_df['sma'] = ta.SMA(candles_df['close'].astype(float).values, timeperiod=length)
            case 'EMA':
                if new_indicator:
                    indicator['params'] = [
                        {"key": "length", "value": 9},
                    ]
                length = int(next(p for p in indicator['params'] if p['key'] == 'length')['value'])
                candles_df = CandleView().get_candles(
                    exchange=Exchange(exchange, user),
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp_start=timestamp_start,
                    timestamp_end=timestamp_end,
                    db_search=True,
                    extra_candles=2 * length
                )
                candles_df['ema'] = ta.EMA(candles_df['close'].astype(float).values, timeperiod=length)
            case 'BBANDS':
                if new_indicator:
                    indicator['params'] = [
                        {"key": "length", "value": 20},
                        {"key": "multiplier", "value": 2},
                    ]
                length = int(next(p for p in indicator['params'] if p['key'] == 'length')['value'])
                multiplier = float(next(p for p in indicator['params'] if p['key'] == 'multiplier')['value'])
                candles_df = CandleView().get_candles(
                    exchange=Exchange(exchange, user),
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp_start=timestamp_start,
                    timestamp_end=timestamp_end,
                    db_search=True,
                    extra_candles=length
                )
                candles_df['upperband'], candles_df['middleband'], candles_df['lowerband'] = ta.BBANDS(
                    candles_df['close'].astype(float).values,
                    timeperiod=length,
                    nbdevup=multiplier,
                    nbdevdn=multiplier,
                    matype=0
                )
            case 'MACD':
                if new_indicator:
                    indicator['params'] = [
                        {"key": "fast_period", "value": 12},
                        {"key": "slow_period", "value": 26},
                        {"key": "signal_period", "value": 9},
                    ]
                fast_period = int(next(p for p in indicator['params'] if p['key'] == 'fast_period')['value'])
                slow_period = int(next(p for p in indicator['params'] if p['key'] == 'slow_period')['value'])
                signal_period = int(next(p for p in indicator['params'] if p['key'] == 'signal_period')['value'])

                candles_df = CandleView().get_candles(
                    exchange=Exchange(exchange, user),
                    symbol=symbol,
                    timeframe=timeframe,
                    timestamp_start=timestamp_start,
                    timestamp_end=timestamp_end,
                    db_search=True,
                    extra_candles=2 * max(fast_period, slow_period, signal_period)
                )

                candles_df['macd'], candles_df['macdsignal'], candles_df['macdhist'] = ta.MACD(
                    candles_df['close'].astype(float).values,
                    fastperiod=fast_period,
                    slowperiod=slow_period,
                    signalperiod=signal_period
                )
            case _:
                raise NotImplementedError("Indicator type not implemented")
        
        if new_indicator:
            strategy.indicators = json.dumps([{k: v for k, v in (ind.items()) if k != 'data'} if ind['id'] == indicator_id else ind for ind in indicators])
            strategy.save()
        
        cols_map = {
            'timestamp': ('time', int),
            **{col: (col, None) for col in candles_df.columns if col not in {'timestamp', 'open', 'high', 'low', 'close', 'volume'}}
        }
        
        indicator['data'] = [
            {out_key: (func(row[col]) if func else row[col]) for col, (out_key, func) in cols_map.items()}
            for _, row in candles_df.iterrows()
            if timestamp_start <= row['timestamp'] <= timestamp_end
            and not any(pd.isna(row[col_name]) for col_name in cols_map.keys())
        ]
        
        return indicator

    def get(self, request):
        try:
            strategy_id = request.query_params.get('strategy_id')
            indicator_id = request.query_params.get('indicator_id')
            timestamp_start = int(request.query_params.get('timestamp_start'))
            timestamp_end = int(request.query_params.get('timestamp_end'))
            if not all([strategy_id, indicator_id, timestamp_start, timestamp_end]):
                return Response({'error': 'Missing required parameters. Please provide: strategy_id, indicator_id, timestamp_start, timestamp_end'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                strategy = Strategy.objects.get(id=strategy_id)
            except Strategy.DoesNotExist:
                return Response({'error': 'Strategy not found'}, status=status.HTTP_404_NOT_FOUND)
            data = self.compute_indicator_data(
                user=request.user,
                strategy=strategy,
                timestamp_start=timestamp_start,
                timestamp_end=timestamp_end,
                indicator_id=indicator_id
            )
            return Response(data, status=status.HTTP_200_OK)
        except LookupError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except NotImplementedError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StrategyExecutionView(viewsets.ModelViewSet):
    queryset = StrategyExecution.objects.all()
    serializer_class = StrategyExecutionSerializer

    def get_permissions(self):
        if self.action in ['start', 'stop', 'destroy']:
            self.permission_classes = [IsOwner]
        elif self.action in ['list', 'retrieve']:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        strategy_id = request.query_params.get('strategy_id')
        if not strategy_id:
            return Response({"detail": "Missing strategy parameter."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            strategy = Strategy.objects.get(id=strategy_id)
        except Strategy.DoesNotExist:
            return Response({"detail": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)
        if not strategy.is_public and strategy.user != request.user:
            return Response({"detail": "Not authorized to view this strategy."}, status=status.HTTP_403_FORBIDDEN)
        executions = StrategyExecution.objects.filter(strategy_id=strategy_id).values('id', 'execution_timestamp')
        return Response(list(executions))

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.strategy.is_public and instance.strategy.user != request.user:
            return Response({"detail": "Not authorized to view this execution."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance)
        data = serializer.data
        trades = Trade.objects.filter(strategy_execution=instance).values()
        data["trades"] = list(trades)
        return Response(data)

    def execute_strategy(self, execution_id, request):
        try:
            connection.close()
            execution = StrategyExecution.objects.get(id=execution_id)
            exchange = Exchange(execution.exchange, request.user)
            real_trading = execution.type == 'real'
            if real_trading:
                try:
                    exchange.fetch_balance()
                except ccxt.AuthenticationError as e:
                    raise ValueError("API keys are invalid or missing")
                except ccxt.NetworkError as e:
                    raise ConnectionError("Network issue while checking API keys")
                except Exception as e:
                    raise RuntimeError("Unexpected error while checking API keys")
                
            trades_df = pd.DataFrame(columns=['strategy_execution', 'type', 'side', 'timestamp', 'price', 'amount', 'cost', 'avg_entry_price', 'abs_profit', 'rel_profit', 'abs_cum_profit', 'rel_cum_profit', 'abs_hodling_profit', 'rel_hodling_profit', 'abs_runup', 'rel_runup', 'abs_drawdown', 'rel_drawdown'])
            open_orders_df = pd.DataFrame(columns=['id', 'timestamp', 'side', 'price', 'amount', 'cost'])
            symbol = execution.symbol
            leverage = execution.leverage
            maker_fee = execution.maker_fee
            taker_fee = execution.taker_fee
            max_ever_total_unrealized_value = 0
            min_ever_total_unrealized_value = float('inf')
            abs_max_runup = 0
            rel_max_runup = 0
            abs_max_drawdown = 0
            rel_max_drawdown = 0
            
            def trade_calculation(type, order):
                nonlocal open_orders_df
                nonlocal trades_df
                nonlocal abs_max_runup
                nonlocal rel_max_runup
                nonlocal abs_max_drawdown
                nonlocal rel_max_drawdown
                nonlocal max_ever_total_unrealized_value
                nonlocal min_ever_total_unrealized_value
                
                fee = taker_fee if type == "market" else maker_fee
                
                if c.at[i, 'position_amount'] * order['amount'] >= 0:
                    order_cost = abs(order['amount']) * order['price'] * (Decimal(1 / leverage) + fee)
                    if type == "market" and order_cost > c.at[i, 'remaining_tradable_value']:
                        order['amount'] = c.at[i, 'remaining_tradable_value'] / order['price'] / (Decimal(1 / leverage) + fee) * order['amount'] / abs(order['amount'])
                        order_cost = c.at[i, 'remaining_tradable_value']
                    c.at[i, 'avg_entry_price'] = (c.at[i, 'avg_entry_price'] * abs(c.at[i, 'position_amount']) + order['price'] * abs(order['amount'])) / (abs(c.at[i, 'position_amount']) + abs(order['amount']))
                else:
                    order['amount'] = min(abs(order['amount']), abs(c.at[i, 'position_amount'])) * order['amount'] / abs(order['amount'])
                    if type == 'limit':
                        c.at[i, 'position_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] * ((2 - order['price'] / c.at[i, 'avg_entry_price'] if c.at[i, 'position_amount'] < 0 else order['price'] / c.at[i, 'avg_entry_price']) - 1 + Decimal(1 / leverage))
                    order_cost = c.at[i, 'position_value'] * order['amount'] / c.at[i, 'position_amount'] + abs(order['amount']) * (2 * c.at[i, 'avg_entry_price'] - order['price'] if c.at[i, 'position_amount'] < 0 else order['price']) * fee
                    if c.at[i, 'position_amount'] + order['amount'] == 0:
                        c.at[i, 'avg_entry_price'] = 0
                c.at[i, 'position_amount'] += order['amount']
                if c.at[i, 'avg_entry_price'] > 0:
                    c.at[i, 'position_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] * ((2 - order['price'] / c.at[i, 'avg_entry_price'] if c.at[i, 'position_amount'] < 0 else order['price'] / c.at[i, 'avg_entry_price']) - 1 + Decimal(1 / leverage))
                else:
                    c.at[i, 'position_value'] = 0
                if not (type == "limit" and order_cost > 0): c.at[i, 'remaining_tradable_value'] -= order_cost
                c.at[i, 'realized_total_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                c.at[i, 'unrealized_total_value'] = c.at[i, 'position_value'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                abs_profit = -1 * abs(order['amount']) * c.at[i, 'avg_entry_price'] - order_cost if c.at[i, 'position_amount'] * order['amount'] < 0 else -1 * abs(order['amount']) * order['price'] * fee
                rel_profit = abs_profit / execution.initial_tradable_value * 100
                abs_cum_profit = (trades_df['abs_cum_profit'].iloc[-1] if not trades_df.empty else 0) + abs_profit
                rel_cum_profit = (trades_df['rel_cum_profit'].iloc[-1] if not trades_df.empty else 0) + rel_profit
                abs_hodling_profit = execution.initial_tradable_value * (c.at[i, 'close'] / c.at[1, 'open'] - 1)
                rel_hodling_profit = (c.at[i, 'close'] / c.at[1, 'open'] - 1) * 100
                max_ever_total_unrealized_value = max(max_ever_total_unrealized_value, c.at[i, 'unrealized_total_value'])
                min_ever_total_unrealized_value = min(min_ever_total_unrealized_value, c.at[i, 'unrealized_total_value'])
                abs_runup = c.at[i, 'unrealized_total_value'] - min_ever_total_unrealized_value
                rel_runup = abs_runup / min_ever_total_unrealized_value * 100 if min_ever_total_unrealized_value != 0 else 0
                abs_drawdown = c.at[i, 'unrealized_total_value'] - max_ever_total_unrealized_value
                rel_drawdown = abs_drawdown / max_ever_total_unrealized_value * 100 if max_ever_total_unrealized_value != 0 else 0
                new_trade = {'strategy_execution': execution, 'type': type, 'side': order['side'], 'timestamp': order['timestamp'], 'price': order['price'], 'amount': abs(order['amount']), 'cost': order_cost, 'avg_entry_price': c.at[i, 'avg_entry_price'],
                             'abs_profit': abs_profit, 'rel_profit': rel_profit, 'abs_cum_profit': abs_cum_profit, 'rel_cum_profit': rel_cum_profit, 'abs_hodling_profit': abs_hodling_profit, 'rel_hodling_profit': rel_hodling_profit, 'abs_runup': abs_runup, 'rel_runup': rel_runup, 'abs_drawdown': abs_drawdown, 'rel_drawdown': rel_drawdown}
                trades_df = pd.concat([trades_df, pd.DataFrame([new_trade])], ignore_index=True)
                
                abs_max_runup = max(abs_max_runup, c.at[i, 'unrealized_total_value'] - min_ever_total_unrealized_value)
                rel_max_runup = abs_max_runup / min_ever_total_unrealized_value * 100 if min_ever_total_unrealized_value != 0 else 0
                abs_max_drawdown = min(abs_max_drawdown, c.at[i, 'unrealized_total_value'] - max_ever_total_unrealized_value)
                rel_max_drawdown = abs_max_drawdown / max_ever_total_unrealized_value * 100 if max_ever_total_unrealized_value != 0 else 0
            
            def make_order(type, side=None, amount=None, price=None):
                nonlocal open_orders_df
                nonlocal trades_df
                
                if type == "cancel_all_open_orders":
                    if real_trading: exchange.cancel_all_orders(symbol=symbol)
                    c.at[i, 'remaining_tradable_value'] += open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                    open_orders_df = open_orders_df.iloc[0:0]
                    c.at[i, 'realized_total_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] + c.at[i, 'remaining_tradable_value']
                    c.at[i, 'unrealized_total_value'] = c.at[i, 'position_value'] + c.at[i, 'remaining_tradable_value']
                    return

                if ':' not in symbol and side == 'sell' and c.at[i, 'position_amount'] == 0: return
                if amount == 0: return
                if type == 'market':
                    price = c.at[i, 'close']
                else:
                    if price <= 0: return
                order_id = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(15))
                order_timestamp = c.at[i, 'timestamp']
                order_amount = amount if side == 'buy' else -1 * amount
                order_price = price

                if real_trading:
                    if ':' in symbol:
                        try:
                            exchange.set_leverage(leverage=leverage, symbol=symbol, params={'openType': 1, 'positionType': 1 if c.at[i, 'position_amount'] >= 0 else 2})
                            exchange.set_margin_mode(marginMode="isolated", symbol=symbol, params={'leverage': leverage, 'openType': 1, 'positionType': 1 if c.at[i, 'position_amount'] >= 0 else 2})
                        except: pass
                        contract_size = exchange.markets.get(symbol).get('contractSize')
                        amount = amount / contract_size
                    if type == 'market' and side == 'buy':
                        try:
                            orderbook = exchange.fetch_l2_order_book(symbol, 1)
                            if len(orderbook['asks']) > 0:
                                price = orderbook['asks'][0][0]
                        except: pass
                    params = {'reduceOnly': False if c.at[i, 'position_amount'] * order_amount >= 0 else True, **({'timeInForce': 'PO'} if type == 'limit' and exchange.has.get('createPostOnlyOrder') else {'timeInForce': 'GTC'} if type == 'limit' else {})}
                    order = exchange.create_order(symbol=symbol, type=type, side=side, amount=amount, price=price, params=params)
                    order_id = order['id']
                    order_timestamp = order['timestamp']
                    order_amount = order['amount'] if side == 'buy' else -1 * order['amount']
                    if ':' in symbol:
                        order_amount = order_amount * contract_size
                    order_price = order['price']
                    
                order = {'id': order_id, 'timestamp': order_timestamp, 'side': side, 'amount': order_amount, 'price': order_price}
                if c.at[i, 'position_amount'] * order['amount'] >= 0 and c.at[i, 'remaining_tradable_value'] == 0: return
                if type == 'market':
                    trade_calculation(type, order)
                else:
                    order['cost'] = abs(order['amount']) * order['price'] * (Decimal(1 / leverage) + maker_fee) if c.at[i, 'position_amount'] * order['amount'] >= 0 else c.at[i, 'position_value'] * order['amount'] / c.at[i, 'position_amount'] + abs(order['amount']) * (2 * c.at[i, 'avg_entry_price'] - order['price'] if c.at[i, 'position_amount'] < 0 else order['price']) * fee
                    if order['cost'] > 0:
                        if order['cost'] > c.at[i, 'remaining_tradable_value']:
                            order['amount'] = c.at[i, 'remaining_tradable_value'] / order['price'] / (Decimal(1 / leverage) + maker_fee) * order['amount'] / abs(order['amount'])
                            order['cost'] = c.at[i, 'remaining_tradable_value']
                        c.at[i, 'remaining_tradable_value'] -= order['cost']
                    open_orders_df = pd.concat([open_orders_df, pd.DataFrame([order])], ignore_index=True)
                    c.at[i, 'realized_total_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                    c.at[i, 'unrealized_total_value'] = c.at[i, 'position_value'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
            
            timeframe_ms = int(pd.Timedelta(f"{int(execution.timeframe[:-1]) * (30 if execution.timeframe.endswith('M') else 365)}d" if execution.timeframe.endswith(('M','y')) else execution.timeframe).total_seconds() * 1000)
            
            c = CandleView().get_candles(
                exchange=exchange,
                symbol=symbol,
                timeframe=execution.timeframe,
                timestamp_start=execution.timestamp_start - (2 * timeframe_ms if real_trading else timeframe_ms),
                timestamp_end=execution.timestamp_start - timeframe_ms if real_trading else execution.timestamp_end,
                db_search=True
            )
            
            indicators = json.loads(execution.indicators)
            
            def calculate_indicators(timestamp_start, timestamp_end):
                nonlocal c
                c = c.set_index('timestamp')
                for indicator in indicators:
                    short_name = indicator.get('short_name')
                    params = indicator.get('params', [])
                    param_str = '_'.join(str(p['value']) for p in params)
                    indicator['col_name'] = f"{short_name}_{param_str}" if param_str else short_name
                    indicator_response = IndicatorView().compute_indicator_data(
                        user=request.user,
                        strategy=execution.strategy,
                        timestamp_start= timestamp_start,
                        timestamp_end= timestamp_end,
                        indicator_id=indicator.get('id')
                    )
                    indicator_df = pd.DataFrame(indicator_response.get('data', [])).rename(columns={'time': 'timestamp'}).set_index('timestamp')
                    if indicator_df.empty:
                        continue
                    if len(indicator_df.columns) == 1:
                        indicator_values = indicator_df.rename(columns={indicator_df.columns[0]: indicator.get('col_name')})
                    else:
                        indicator_values = indicator_df.add_prefix(indicator.get('col_name') + "_")
                    for col in indicator_values.columns:
                        if col not in c.columns:
                            c[col] = indicator_values[col]
                        else:
                            c.at[c.index[-1], col] = indicator_values.iloc[-1][col]
                c = c.reset_index()
            
            calculate_indicators(execution.timestamp_start - timeframe_ms, execution.timestamp_end)
            c[['position_amount', 'position_value', 'avg_entry_price', 'remaining_tradable_value', 'unrealized_total_value', 'realized_total_value']] = None
            
            columns = c.columns.difference(['timestamp']).tolist()
            replacements = [(col, f"c.at[i, '{col}']") for col in columns]
            order_conditions = json.loads(execution.order_conditions)
            conditions_str = []
            orders_str = []
            for order_condition in order_conditions:
                condition_result = ""
                curr_conditions = order_condition['conditions']
                total_conditions = len(curr_conditions)
                for i, condition in enumerate(curr_conditions):
                    if condition['start_parenthesis']:
                        condition_result += "("
                    left_operand  = condition['left_operand']
                    right_operand = condition['right_operand']
                    for old, new in replacements:
                        left_operand  = left_operand.replace(old, new)
                        right_operand = right_operand.replace(old, new)
                    operator = condition['operator']
                    if operator == 'crossunder':
                        condition_result += f"(({left_operand.replace('c.at[i, ', 'c.at[i-1, ')}) > ({right_operand.replace('c.at[i, ', 'c.at[i-1, ')}) and ({left_operand}) < ({right_operand}))"
                    elif operator == 'crossabove':
                        condition_result += f"(({left_operand.replace('c.at[i, ', 'c.at[i-1, ')}) < ({right_operand.replace('c.at[i, ', 'c.at[i-1, ')}) and ({left_operand}) > ({right_operand}))"
                    else:
                        condition_result += f"({left_operand}) {operator} ({right_operand})"
                    if condition['end_parenthesis']:
                        condition_result += ")"
                    logical_operator = condition.get('logical_operator', '')
                    if i < total_conditions - 1:
                        if logical_operator:
                            condition_result += f" {logical_operator.replace('xor', '^')} "
                        else:
                            raise ValueError("Logical operator is required between conditions")
                if condition_result.count(':') or [w for w in re.findall(r'\b[a-zA-Z][a-zA-Z0-9_]*\b', condition_result) if w not in set(columns + ['min', 'max', 'abs', 'crossunder', 'crossabove', 'and', 'or', 'c', 'at', 'i'])]:
                    raise ValueError("Invalid condition syntax in conditions")
                if condition_result.count('(') != condition_result.count(')'):
                    raise ValueError("Unmatched parentheses in conditions")
                conditions_str.append(condition_result)
                
                orders_result = ""
                for order in order_condition['orders']:
                    orders_result += f"make_order('{order['type']}'"
                    if order['type'] != "cancel_all_open_orders":
                        orders_result += f", '{order['side']}', {order['amount']}"
                        if order['type'] != "market":
                            orders_result += f", {order['price']}"
                    orders_result += ")\n"
                for old, new in replacements:
                    orders_result = orders_result.replace(old, new)
                if orders_result.count(':') or [w for w in re.findall(r'\b[a-zA-Z][a-zA-Z0-9_]*\b', orders_result) if w not in set(columns + ['min', 'max', 'abs', 'crossunder', 'crossabove', 'and', 'or', 'c', 'at', 'i'])]:
                    raise ValueError("Invalid condition syntax in orders")
                orders_str.append(orders_result)
            
            if real_trading:
                i = 0
                while True:
                    if i == 0:
                        c.at[i, 'position_amount'] = 0
                        c.at[i, 'avg_entry_price'] = 0
                        c.at[i, 'remaining_tradable_value'] = execution.initial_tradable_value
                        i = 1
                    else:
                        c.at[i, 'position_amount'] = c.at[i-1, 'position_amount']
                        c.at[i, 'avg_entry_price'] = c.at[i-1, 'avg_entry_price']
                        c.at[i, 'remaining_tradable_value'] = c.at[i-1, 'remaining_tradable_value']
                    if c.at[i, 'avg_entry_price'] > 0:
                        c.at[i, 'position_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] * ((2 - c.at[i, 'close'] / c.at[i, 'avg_entry_price'] if c.at[i, 'position_amount'] < 0 else c.at[i, 'close'] / c.at[i, 'avg_entry_price']) - 1 + Decimal(1 / leverage))
                    else:
                        c.at[i, 'position_value'] = 0
                    if c.at[i, 'position_value'] < 0:
                        c.at[i, 'position_value'] = 0
                        c.at[i, 'position_amount'] = 0
                        c.at[i, 'avg_entry_price'] = 0
                    c.at[i, 'realized_total_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                    c.at[i, 'unrealized_total_value'] = c.at[i, 'position_value'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                    max_ever_total_unrealized_value = max(max_ever_total_unrealized_value, c.at[i, 'unrealized_total_value'])
                    min_ever_total_unrealized_value = min(min_ever_total_unrealized_value, c.at[i, 'unrealized_total_value'])
                    abs_max_runup = max(abs_max_runup, c.at[i, 'unrealized_total_value'] - min_ever_total_unrealized_value)
                    rel_max_runup = abs_max_runup / min_ever_total_unrealized_value * 100 if min_ever_total_unrealized_value != 0 else 0
                    abs_max_drawdown = min(abs_max_drawdown, c.at[i, 'unrealized_total_value'] - max_ever_total_unrealized_value)
                    rel_max_drawdown = abs_max_drawdown / max_ever_total_unrealized_value * 100 if max_ever_total_unrealized_value != 0 else 0
                    if i > 0:
                        orders_to_drop = []
                        for open_order in open_orders_df.itertuples(index=False):
                            order_data = exchange.fetch_order(open_order.id, symbol)
                            if order_data.get('status') == 'closed':
                                trade_calculation('limit', {'id': open_order.id, 'timestamp': order_data.get('timestamp', c.at[i, 'timestamp']), 'amount': open_order.amount, 'price': open_order.price})
                                orders_to_drop.append(open_order.Index)
                        open_orders_df = open_orders_df.drop(orders_to_drop).reset_index(drop=True)
                        for x, condition_result in enumerate(conditions_str):
                            try:
                                if eval(condition_result):
                                    orders_result = orders_str[x]
                                    exec(orders_result)
                            except Exception as e:
                                raise ValueError("Error evaluating condition or order")
                        execution.timestamp_end = c.iloc[-1]['timestamp']
                        execution.abs_net_profit = trades_df.iloc[-1]['abs_cum_profit'] if len(trades_df) > 0 else None
                        execution.rel_net_profit = trades_df.iloc[-1]['rel_cum_profit'] if len(trades_df) > 0 else None
                        execution.total_closed_trades = len(trades_df)
                        closing_trades_df = trades_df.query("cost < 0")
                        execution.winning_trade_rate = (closing_trades_df['abs_profit'] >= 0).mean() * 100 if len(closing_trades_df) > 0 else None
                        gross_profits = trades_df[trades_df['abs_profit'] > 0]['abs_profit'].sum()
                        gross_losses = abs(trades_df[trades_df['abs_profit'] < 0]['abs_profit'].sum())
                        execution.profit_factor = gross_profits / gross_losses if gross_losses > 0 else None
                        execution.abs_avg_trade_profit = closing_trades_df["abs_profit"].abs().mean() if len(closing_trades_df) > 0 else None
                        execution.rel_avg_trade_profit = closing_trades_df["rel_profit"].mean() if len(closing_trades_df) > 0 else None
                        execution.abs_max_run_up = abs_max_runup
                        execution.rel_max_run_up = rel_max_runup
                        execution.abs_max_drawdown = abs_max_drawdown
                        execution.rel_max_drawdown = rel_max_drawdown
                        Trade.objects.bulk_create([Trade(**row) for row in trades_df.to_dict(orient='records')])
                    last_candle_timestamp = c.at[c.index[-1], 'timestamp']
                    next_candle_timestamp = last_candle_timestamp + timeframe_ms
                    execution.timestamp_end = next_candle_timestamp
                    execution.save()
                    timestamp_wait = next_candle_timestamp + timeframe_ms
                    wait_ms = timestamp_wait - int(time.time() * 1000)
                    while wait_ms > 0:
                        if wait_ms > 1000:
                            time.sleep(min(wait_ms, 60000) / 1000 - 1)
                            execution.refresh_from_db()
                            if not execution.running: return
                        wait_ms = timestamp_wait - int(time.time() * 1000)
                    c = pd.concat([c, CandleView().get_candles(
                        exchange=exchange,
                        symbol=symbol,
                        timeframe=execution.timeframe,
                        timestamp_start=next_candle_timestamp,
                        timestamp_end=next_candle_timestamp
                    ).reindex(columns=c.columns)], ignore_index=True)
                    if len(c) > 2: c = c.iloc[1:].reset_index(drop=True)
                    calculate_indicators(next_candle_timestamp, next_candle_timestamp)
                    if i == 0: i = 1
            else:
                for i in c.index:
                    execution.refresh_from_db()
                    if not execution.running:
                        return
                    if i == 0:
                        c.at[i, 'position_amount'] = 0
                        c.at[i, 'avg_entry_price'] = 0
                        c.at[i, 'remaining_tradable_value'] = execution.initial_tradable_value
                    else:
                        c.at[i, 'position_amount'] = c.at[i-1, 'position_amount']
                        c.at[i, 'avg_entry_price'] = c.at[i-1, 'avg_entry_price']
                        c.at[i, 'remaining_tradable_value'] = c.at[i-1, 'remaining_tradable_value']
                    if c.at[i, 'avg_entry_price'] > 0:
                        c.at[i, 'position_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] * ((2 - c.at[i, 'close'] / c.at[i, 'avg_entry_price'] if c.at[i, 'position_amount'] < 0 else c.at[i, 'close'] / c.at[i, 'avg_entry_price']) - 1 + Decimal(1 / leverage))
                    else:
                        c.at[i, 'position_value'] = 0
                    if c.at[i, 'position_value'] < 0:
                        c.at[i, 'position_value'] = 0
                        c.at[i, 'position_amount'] = 0
                        c.at[i, 'avg_entry_price'] = 0
                    c.at[i, 'realized_total_value'] = abs(c.at[i, 'position_amount']) * c.at[i, 'avg_entry_price'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                    c.at[i, 'unrealized_total_value'] = c.at[i, 'position_value'] + c.at[i, 'remaining_tradable_value'] + open_orders_df.loc[open_orders_df['cost'] > 0, 'cost'].sum()
                    max_ever_total_unrealized_value = max(max_ever_total_unrealized_value, c.at[i, 'unrealized_total_value'])
                    min_ever_total_unrealized_value = min(min_ever_total_unrealized_value, c.at[i, 'unrealized_total_value'])
                    abs_max_runup = max(abs_max_runup, c.at[i, 'unrealized_total_value'] - min_ever_total_unrealized_value)
                    rel_max_runup = abs_max_runup / min_ever_total_unrealized_value * 100 if min_ever_total_unrealized_value != 0 else 0
                    abs_max_drawdown = min(abs_max_drawdown, c.at[i, 'unrealized_total_value'] - max_ever_total_unrealized_value)
                    rel_max_drawdown = abs_max_drawdown / max_ever_total_unrealized_value * 100 if max_ever_total_unrealized_value != 0 else 0
                    if i == 0:
                        continue
                    orders_to_drop = []
                    for open_order in open_orders_df.itertuples(index=False):
                        if open_order.side == 'buy' and c.at[i, 'low'] <= open_order.price or open_order.side == 'sell' and c.at[i, 'high'] >= open_order.price:
                            trade_calculation('limit', {'id': open_order.id, 'timestamp': c.at[i, 'timestamp'], 'amount': open_order.amount, 'price': open_order.price})
                            orders_to_drop.append(open_order.Index)
                    open_orders_df = open_orders_df.drop(orders_to_drop).reset_index(drop=True)
                    for x, condition_result in enumerate(conditions_str):
                        try:
                            if eval(condition_result):
                                orders_result = orders_str[x]
                                exec(orders_result)
                        except Exception as e:
                            raise ValueError("Error evaluating condition or order")
                execution.timestamp_end = c.iloc[-1]['timestamp']
                execution.abs_net_profit = trades_df.iloc[-1]['abs_cum_profit'] if len(trades_df) > 0 else None
                execution.rel_net_profit = trades_df.iloc[-1]['rel_cum_profit'] if len(trades_df) > 0 else None
                execution.total_closed_trades = len(trades_df)
                closing_trades_df = trades_df.query("cost < 0")
                execution.winning_trade_rate = (closing_trades_df['abs_profit'] >= 0).mean() * 100 if len(closing_trades_df) > 0 else None
                gross_profits = trades_df[trades_df['abs_profit'] > 0]['abs_profit'].sum()
                gross_losses = abs(trades_df[trades_df['abs_profit'] < 0]['abs_profit'].sum())
                execution.profit_factor = gross_profits / gross_losses if gross_losses > 0 else None
                execution.abs_avg_trade_profit = closing_trades_df["abs_profit"].abs().mean() if len(closing_trades_df) > 0 else None
                execution.rel_avg_trade_profit = closing_trades_df["rel_profit"].mean() if len(closing_trades_df) > 0 else None
                execution.abs_max_run_up = abs_max_runup
                execution.rel_max_run_up = rel_max_runup
                execution.abs_max_drawdown = abs_max_drawdown
                execution.rel_max_drawdown = rel_max_drawdown
                Trade.objects.bulk_create([Trade(**row) for row in trades_df.to_dict(orient='records')])
            
            execution.running = False
            execution.save()
        except Exception as e:
            import sys; print("ERROR: " + e, file=sys.stderr)
            execution.running = False
            execution.save()

    @action(detail=True, methods=['post'])
    def start(self, request):
        required_fields = [
            "strategy_id",
            "maker_fee",
            "taker_fee",
            "initial_tradable_value",
            "leverage",
            "type",
            "order_conditions",
        ]

        missing_fields = [f for f in required_fields if f not in request.data]
        if missing_fields:
            return Response(
                {"detail": f"Missing required fields: {', '.join(missing_fields)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            strategy = Strategy.objects.get(id=request.data["strategy_id"])
        except Strategy.DoesNotExist:
            return Response({"detail": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)

        type = request.data["type"]
        timeframe = strategy.timeframe
        timestamp_start = strategy.timestamp_start
        timestamp_end = strategy.timestamp_end
        now = int(time.time() * 1000)
        if type == 'real':
            timestamp_end = now
            timestamp_start = now
        
        execution = StrategyExecution.objects.create(
            strategy=strategy,
            type=type,
            order_conditions=request.data["order_conditions"],
            running=True,
            exchange=strategy.exchange,
            symbol=strategy.symbol,
            timeframe=timeframe,
            timestamp_start=timestamp_start,
            timestamp_end=timestamp_end,
            indicators=strategy.indicators,
            maker_fee=Decimal(request.data["maker_fee"]),
            taker_fee=Decimal(request.data["taker_fee"]),
            initial_tradable_value=Decimal(request.data["initial_tradable_value"]),
            leverage=int(request.data["leverage"]),
            execution_timestamp=now,
            abs_net_profit=None,
            rel_net_profit=None,
            total_closed_trades=None,
            winning_trade_rate=None,
            profit_factor=None,
            abs_avg_trade_profit=None,
            rel_avg_trade_profit=None,
            abs_max_run_up=None,
            rel_max_run_up=None,
            abs_max_drawdown=None,
            rel_max_drawdown=None,
        )
        thread = threading.Thread(target=self.execute_strategy, args=(execution.id, request))
        thread.daemon = True
        thread.start()
        serializer = StrategyExecutionSerializer(execution)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def stop(self):
        instance = self.get_object()
        instance.running = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.running:
            instance.running = False
            instance.save()
        return super().destroy(request, *args, **kwargs)

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            timestamp_start = int(request.query_params.get("timestamp_start"))
            timestamp_end = int(request.query_params.get("timestamp_end"))
            is_real_trading = request.query_params.get("is_real_trading") == "true"
        except (TypeError, ValueError):
            return Response({"error": "Invalid query parameters"}, status=400)
        
        request.user.dashboard_real_trading = is_real_trading
        request.user.save(update_fields=["dashboard_real_trading"])

        strategies = Strategy.objects.filter(user=request.user)
        executions = StrategyExecution.objects.filter(
            strategy__in=strategies,
            type="real" if is_real_trading else "backtest",
            timestamp_end__gte=timestamp_start,
            timestamp_start__lte=timestamp_end
        )
        trades = Trade.objects.filter(
            strategy_execution__in=executions,
            timestamp__gte=timestamp_start,
            timestamp__lte=timestamp_end
        ).order_by("timestamp")

        total_closed_trades = trades.count()
        closing_trades = trades.filter(cost__lt=0)
        total_closing = closing_trades.count()
        if total_closing > 0:
            winning_count = closing_trades.filter(abs_profit__gte=0).count()
            winning_trade_rate = (winning_count / total_closing) * 100
            avg_trade_profit = closing_trades.aggregate(avg=Avg("rel_profit"))["avg"]
        else:
            winning_trade_rate = None
            avg_trade_profit = None
        gross_profit = trades.filter(rel_profit__gt=0).aggregate(Sum("rel_profit"))["rel_profit__sum"] or Decimal("0.0")
        gross_loss = abs(trades.filter(rel_profit__lt=0).aggregate(Sum("rel_profit"))["rel_profit__sum"] or Decimal("0.0"))
        profit_factor = float(gross_profit / gross_loss) if gross_loss > 0 else None
        rel_cum_profit = []
        cumulative = 0.0
        for trade in trades:
            cumulative += float(trade.rel_profit or 0)
            rel_cum_profit.append(cumulative)
        total_net_profit = rel_cum_profit[-1] if rel_cum_profit else 0.0

        recent_trades = [
            {
                "strategy_id": str(trade.strategy_execution.strategy.id),
                "strategy_execution_id": str(trade.strategy_execution.id),
                "strategy_name": trade.strategy_execution.strategy.name,
                "timestamp": trade.timestamp,
                "symbol": trade.strategy_execution.symbol,
                "side": trade.side,
                "rel_profit": float(trade.rel_profit),
            }
            for trade in trades.order_by("-timestamp")[:5]
        ]
        
        data = {
            "is_real_trading": is_real_trading,
            "total_net_profit": total_net_profit,
            "total_closed_trades": total_closed_trades,
            "winning_trade_rate": winning_trade_rate,
            "profit_factor": profit_factor,
            "avg_trade_profit": avg_trade_profit,
            "rel_cum_profit": rel_cum_profit,
            "recent_trades": recent_trades
        }
        return Response(data)
