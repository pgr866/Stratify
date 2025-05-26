from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_active and request.user.is_staff and request.user.is_superuser

class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_active
    
    def has_object_permission(self, request, view, obj):    
        user = request.user
        return (
            (isinstance(obj, user.__class__) and obj == user) or
            (getattr(obj, "user", None) == user) or
            (hasattr(obj, "strategy") and getattr(obj.strategy, "user", None) == user)
        )
        
class IsAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_active

class IsNotAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return not (request.user.is_authenticated and request.user.is_active)

class NoBody(BasePermission):
    def has_permission(self, request, view):
        return False
