import requests
import secrets
import json
from types import SimpleNamespace
import ccxt
import pandas as pd
import talib as ta
import time
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from rest_framework import status, viewsets
from rest_framework.decorators import action
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
            exchange.precisionMode = ccxt.TRUNCATE
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
        return Response(ccxt.exchanges)
    
class SymbolsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            exchange_name = request.query_params.get('exchange')
            exchange = Exchange(exchange_name, request.user)
            markets_data = exchange.markets.values() if exchange.markets else []
            symbols = [
                {
                    'symbol': x['symbol'],
                    'spot': x.get('spot', False),
                    'perp': x.get('swap', False)
                }
                for x in markets_data
                if x.get('active') and (x.get('spot') or x.get('swap')) and not (
                    exchange_name == 'bitflyer' and x['symbol'] == 'BTC/JPY:JPY'
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
            amount_precision = market.get('precision', {}).get('amount')
            price_precision = market.get('precision', {}).get('price')
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

class StrategyView(viewsets.ModelViewSet):
    serializer_class = StrategySerializer
    
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
                return Strategy.objects.filter(is_public=True)
        else:
            return Strategy.objects.filter(Q(id=self.kwargs['pk']), Q(is_public=True) | Q(user=self.request.user))
        
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
            exchange = strategy.exchange
            symbol = strategy.symbol
            timeframe = strategy.timeframe
            indicators = json.loads(strategy.indicators)
            indicator = next((ind for ind in indicators if ind['id'] == indicator_id), None)
            if indicator is None:
                return Response({'error': 'Indicator not found'}, status=status.HTTP_404_NOT_FOUND)
            new_indicator = 'params' not in indicator
            
            match indicator.get('short_name'):
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
                        exchange=Exchange(exchange, request.user),
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
                        exchange=Exchange(exchange, request.user),
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
                        exchange=Exchange(exchange, request.user),
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
                        exchange=Exchange(exchange, request.user),
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
                        exchange=Exchange(exchange, request.user),
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
                    return Response({'error': 'Indicator type not implemented'}, status=status.HTTP_400_BAD_REQUEST)
            
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
            
            return Response(indicator, status=status.HTTP_200_OK)
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

    @action(detail=True, methods=['post'])
    def start(self, request):
        import sys; print(request.data, file=sys.stderr)
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
            
        execution = StrategyExecution.objects.create(
            strategy=strategy,
            type=request.data["type"],
            order_conditions=request.data["order_conditions"],
            running=True,
            exchange=strategy.exchange,
            symbol=strategy.symbol,
            timeframe=strategy.timeframe,
            timestamp_start=strategy.timestamp_start,
            timestamp_end=strategy.timestamp_end,
            indicators=strategy.indicators,
            maker_fee=Decimal(request.data["maker_fee"]),
            taker_fee=Decimal(request.data["taker_fee"]),
            initial_tradable_value=Decimal(request.data["initial_tradable_value"]),
            leverage=int(request.data["leverage"]),
            execution_timestamp=int(time.time() * 1000),
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
        serializer = StrategyExecutionSerializer(execution)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def _kill_execution(self, instance):
        import sys; print('kill', file=sys.stderr)

    @action(detail=True, methods=['patch'])
    def stop(self, request, pk=None):
        instance = self.get_object()
        self._kill_execution(instance)
        instance.running = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self._kill_execution(instance)
        return super().destroy(request, *args, **kwargs)
