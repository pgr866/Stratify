from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    email = models.EmailField(unique=True)
    timezone_offset = models.DecimalField(max_digits=4, decimal_places=2, null=False, default=0.0)
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    github_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

    def __str__(self):
        return f"{self.username}"

class ApiKey(models.Model):
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exchange = models.CharField(max_length=50)
    api_key = models.CharField(max_length=255, blank=True, default="")
    secret = models.CharField(max_length=255, blank=True, default="")
    password = models.CharField(max_length=255, blank=True, default="")
    uid = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        unique_together = ('user', 'exchange')

    def __str__(self):
        return f"{self.user.username} - {self.exchange}"
