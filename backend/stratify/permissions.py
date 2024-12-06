from rest_framework.permissions import BasePermission

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.id == request.user.id

class IsNotAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return not request.user.is_authenticated

class NoBody(BasePermission):
    def has_permission(self, request, view):
        return False
