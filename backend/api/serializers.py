import re

from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, ApiKey

def validate_password_strength(password):
    if len(password) < 8:
        raise serializers.ValidationError("The password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        raise serializers.ValidationError("The password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        raise serializers.ValidationError("The password must contain at least one lowercase letter")
    if not re.search(r'[^\w\s]', password):
        raise serializers.ValidationError("The password must contain at least one special character")
    if not re.search(r'\d', password):
        raise serializers.ValidationError("The password must contain at least one number")

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'username', 'dark_theme', 'timezone', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
        
    def validate(self, attrs):
        if User.objects.exclude(id=self.instance.id if self.instance else None).filter(username=attrs['username']).exists():
            raise serializers.ValidationError("Username already in use")

        if User.objects.exclude(id=self.instance.id if self.instance else None).filter(email=attrs['email']).exists():
            raise serializers.ValidationError("Email already in use")
        
        if self.instance:
            attrs.pop('password', None)
        else:
            validate_password_strength(attrs['password'])
        
        return attrs

    def create(self, validated_data):
        password = validated_data.get('password')
        if not password:
            raise serializers.ValidationError({"password": ["This field may not be blank."]})

        validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class RecoverPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    new_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("new_password")
        
        if not User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Email is not registered"})
        
        validate_password_strength(password)
        
        return attrs

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError("Both username and password are required")
        
        user = User.objects.filter(username=username, is_active=True).first() or User.objects.filter(email=username, is_active=True).first()
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        
        user = authenticate(username=user.username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        attrs['user'] = user
        
        return attrs

class GoogleLoginSerializer(serializers.Serializer):
    google_id = serializers.CharField()
    google_email = serializers.EmailField()
    timezone = serializers.CharField(default="UTC")
    dark_theme = serializers.BooleanField(default=True)

    def validate(self, data):
        google_id = data.get("google_id")
        google_email = data.get("google_email")
        google_username = google_email.split('@')[0]
        timezone = data.get("timezone")
        dark_theme = data.get("dark_theme")
        user = User.objects.filter(google_id=google_id).first()
        if not user:
            if User.objects.filter(username=google_username).exists():
                google_username = google_email
            user = User.objects.create(
                email=google_email,
                username=google_username,
                google_id=google_id,
                timezone=timezone,
                dark_theme=dark_theme
            )
        data["user"] = user
        return data

class GithubLoginSerializer(serializers.Serializer):
    github_id = serializers.CharField()
    github_email = serializers.EmailField()
    github_username = serializers.CharField()
    timezone = serializers.CharField(default="UTC")
    dark_theme = serializers.BooleanField(default=True)

    def validate(self, data):
        github_id = data.get("github_id")
        github_email = data.get("github_email")
        github_username = data.get("github_username")
        timezone = data.get("timezone")
        dark_theme = data.get("dark_theme")

        user = User.objects.filter(github_id=github_id).first()
        if not user:
            if User.objects.filter(username=github_username).exists():
                github_username = github_email
            user = User.objects.create(
                email=github_email,
                username=github_username,
                github_id=github_id,
                timezone=timezone,
                dark_theme=dark_theme
            )
        data["user"] = user
        return data

class ApiKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiKey
        fields = ['exchange', 'api_key', 'secret', 'password', 'uid']
        extra_kwargs = {
            'api_key': {'write_only': True, 'required': False},
            'secret': {'write_only': True, 'required': False},
            'password': {'write_only': True, 'required': False},
            'uid': {'write_only': True, 'required': False},
        }
