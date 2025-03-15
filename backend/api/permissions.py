from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_active and request.user.is_staff and request.user.is_superuser

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.is_active and (
            (isinstance(obj, request.user.__class__) and obj == request.user)
            or (hasattr(obj, "user") and obj.user == request.user)
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
