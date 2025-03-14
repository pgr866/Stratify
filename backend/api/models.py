from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    email = models.EmailField(unique=True)
    timezone_offset = models.DecimalField(max_digits=4, decimal_places=2, null=False, default=0.0)
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    github_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

    def __str__(self):
        return f"{self.username}"
