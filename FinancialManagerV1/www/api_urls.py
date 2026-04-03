from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import CategoryViewSet, TransactionViewSet, GoalViewSet, UserViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'goals', GoalViewSet, basename='goal')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
