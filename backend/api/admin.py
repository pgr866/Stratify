from django.contrib import admin
from .models import User, ApiKey, Strategy, Candle

admin.site.register(User)
admin.site.register(ApiKey)
admin.site.register(Strategy)
admin.site.register(Candle)