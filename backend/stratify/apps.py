from django.apps import AppConfig


class StratifyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stratify'
    
    def ready(self):
        import stratify.signals
