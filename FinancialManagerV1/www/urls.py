from django.urls import path
from . import views

urlpatterns = [
    # Welcome / landing page
    path('', views.welcome_view, name='welcome'),

    # Auth
    path('login/',    views.login_view,    name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/',   views.logout_view,   name='logout'),

    # Main SPA (login required)
    path('app/', views.dashboard_view, name='dashboard'),

    # Stats & Charts API
    path('api/stats/',             views.api_stats,            name='api_stats'),
    path('api/monthly/',           views.api_monthly,           name='api_monthly'),
    path('api/categories-chart/',  views.api_categories,        name='api_categories_chart'),
    path('api/weekly/',            views.api_weekly,            name='api_weekly'),
    path('api/balance-timeline/',  views.api_balance_timeline,  name='api_balance_timeline'),

    # Transactions API
    path('api/transactions/',                  views.api_transactions,       name='api_transactions'),
    path('api/transactions/create/',           views.api_transaction_create, name='api_transaction_create'),
    path('api/transactions/<int:pk>/update/',  views.api_transaction_update, name='api_transaction_update'),
    path('api/transactions/<int:pk>/delete/',  views.api_transaction_delete, name='api_transaction_delete'),

    # Categories API
    path('api/categories/', views.api_categories_list, name='api_categories_list'),

    # Goals API
    path('api/goals/',                 views.api_goals,       name='api_goals'),
    path('api/goals/create/',          views.api_goal_create, name='api_goal_create'),
    path('api/goals/<int:pk>/delete/', views.api_goal_delete, name='api_goal_delete'),
    path('api/goals/<int:pk>/update/', views.api_goal_update, name='api_goal_update'),
]
