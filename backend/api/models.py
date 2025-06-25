from django.db import models
from django.contrib.auth.models import AbstractUser
import time
import uuid

class User(AbstractUser):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    email = models.EmailField(max_length=254, unique=True)
    username = models.CharField(max_length=150, unique=True) # Default value in AbstractUser
    password = models.CharField(max_length=128) # Default value in AbstractUser
    timezone = models.CharField(max_length=255, default="UTC")
    dark_theme = models.BooleanField(default=True)
    dashboard_real_trading = models.BooleanField(default=False)
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    github_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

    def __str__(self):
        return self.username

class ApiKey(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exchange = models.CharField(max_length=50)
    api_key = models.CharField(max_length=512, blank=True, default="")
    secret = models.CharField(max_length=512, blank=True, default="")
    password = models.CharField(max_length=512, blank=True, default="")
    uid = models.CharField(max_length=512, blank=True, default="")

    class Meta:
        unique_together = ('user', 'exchange')

    def __str__(self):
        return f"{self.user.username} - {self.exchange}"

class Strategy(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=150, default="New Strategy")
    exchange = models.CharField(max_length=50, default="coinbaseexchange")
    symbol = models.CharField(max_length=20, default="BTC/USDT")
    timeframe = models.CharField(max_length=5, default="1d")
    timestamp_start = models.BigIntegerField(default=int(time.time() * 1000) - 2592000000)
    timestamp_end = models.BigIntegerField(default=int(time.time() * 1000))
    indicators = models.TextField(default="[]")
    is_public = models.BooleanField(default=False)
    clones_count = models.IntegerField(default=0)

    def __str__(self):
        return self.name

class StrategyExecution(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    strategy = models.ForeignKey(Strategy, on_delete=models.CASCADE)
    type = models.CharField(max_length=10)
    order_conditions = models.TextField()
    running = models.BooleanField()
    exchange = models.CharField(max_length=50)
    symbol = models.CharField(max_length=20)
    timeframe = models.CharField(max_length=5)
    timestamp_start = models.BigIntegerField()
    timestamp_end = models.BigIntegerField()
    indicators = models.TextField()
    maker_fee = models.DecimalField(max_digits=12, decimal_places=8)
    taker_fee = models.DecimalField(max_digits=12, decimal_places=8)
    initial_tradable_value = models.DecimalField(max_digits=20, decimal_places=12)
    leverage = models.IntegerField(default=1)
    execution_timestamp = models.BigIntegerField(null=True, blank=True)
    abs_net_profit = models.DecimalField(max_digits=20, decimal_places=12, null=True, blank=True)
    rel_net_profit = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    total_closed_trades = models.IntegerField(null=True, blank=True)
    winning_trade_rate = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    profit_factor = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    abs_avg_trade_profit = models.DecimalField(max_digits=20, decimal_places=12, null=True, blank=True)
    rel_avg_trade_profit = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    abs_max_run_up = models.DecimalField(max_digits=20, decimal_places=12, null=True, blank=True)
    rel_max_run_up = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    abs_max_drawdown = models.DecimalField(max_digits=20, decimal_places=12, null=True, blank=True)
    rel_max_drawdown = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)

    def __str__(self):
        return f"Execution {self.id} - {self.exchange} {self.symbol} [{self.timeframe}]"

class Trade(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    strategy_execution = models.ForeignKey(StrategyExecution, on_delete=models.CASCADE)
    type = models.CharField(max_length=20)
    side = models.CharField(max_length=10)
    timestamp = models.BigIntegerField()
    price = models.DecimalField(max_digits=20, decimal_places=12)
    amount = models.DecimalField(max_digits=20, decimal_places=12)
    cost = models.DecimalField(max_digits=20, decimal_places=12)
    avg_entry_price = models.DecimalField(max_digits=20, decimal_places=12)
    abs_profit = models.DecimalField(max_digits=20, decimal_places=12)
    rel_profit = models.DecimalField(max_digits=20, decimal_places=8)
    abs_cum_profit = models.DecimalField(max_digits=20, decimal_places=12)
    rel_cum_profit = models.DecimalField(max_digits=20, decimal_places=8)
    abs_hodling_profit = models.DecimalField(max_digits=20, decimal_places=12)
    rel_hodling_profit = models.DecimalField(max_digits=20, decimal_places=8)
    abs_runup = models.DecimalField(max_digits=20, decimal_places=12)
    rel_runup = models.DecimalField(max_digits=20, decimal_places=8)
    abs_drawdown = models.DecimalField(max_digits=20, decimal_places=12)
    rel_drawdown = models.DecimalField(max_digits=20, decimal_places=8)

    def __str__(self):
        return f"Trade {self.id} - {self.side} {self.amount} @ {self.price}"

class Candle(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    exchange = models.CharField(max_length=50)
    symbol = models.CharField(max_length=20)
    timeframe = models.CharField(max_length=5)
    timestamp = models.BigIntegerField()
    open = models.DecimalField(max_digits=38, decimal_places=18)
    high = models.DecimalField(max_digits=38, decimal_places=18)
    low = models.DecimalField(max_digits=38, decimal_places=18)
    close = models.DecimalField(max_digits=38, decimal_places=18)
    volume = models.DecimalField(max_digits=38, decimal_places=18)

    class Meta:
        unique_together = ('exchange', 'symbol', 'timeframe', 'timestamp')

    def __str__(self):
        return f"{self.exchange} {self.symbol} {self.timeframe} @ {self.timestamp}"