from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    email = models.EmailField(max_length=254, unique=True)
    username = models.CharField(max_length=150, unique=True) # Default value in AbstractUser
    password = models.CharField(max_length=128) # Default value in AbstractUser
    timezone = models.CharField(max_length=255, default="UTC")
    dark_theme = models.BooleanField(default=True)
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
    exchange = models.CharField(max_length=50, default="binance")
    symbol = models.CharField(max_length=20, default="BTC/USDT")
    timeframe = models.CharField(max_length=5, default="1d")
    indicators = models.TextField(default="[]")
    order_conditions = models.TextField(default="{}")
    leverage = models.IntegerField(default=1)
    is_public = models.BooleanField(default=False)
    copies_count = models.IntegerField(default=0)

    def __str__(self):
        return self.name

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