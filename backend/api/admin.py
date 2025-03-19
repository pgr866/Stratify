from django.contrib import admin
from .models import User, ApiKey

admin.site.register(User)
admin.site.register(ApiKey)