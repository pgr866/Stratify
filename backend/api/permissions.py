from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_staff and request.user.is_superuser

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            (isinstance(obj, request.user.__class__) and obj == request.user)
            or (hasattr(obj, "user") and obj.user == request.user)
        )

class IsNotAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return not request.user.is_authenticated

class NoBody(BasePermission):
    def has_permission(self, request, view):
        return False
