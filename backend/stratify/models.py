from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    first_name = models.CharField(blank=False)
    last_name = models.CharField(blank=False)
    email = models.EmailField(unique=True)

    def __str__(self):
        return f"{self.username}"
