from django.contrib import admin
from .models import User, ApiKey, Strategy, Candle, StrategyExecution, Trade

admin.site.register(User)
admin.site.register(ApiKey)
admin.site.register(Strategy)
admin.site.register(StrategyExecution)
admin.site.register(Trade)
admin.site.register(Candle)