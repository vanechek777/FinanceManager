from django.contrib import admin
from .models import Category, Transaction, Goal


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'type', 'color')
    list_filter = ('type',)
    search_fields = ('name',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('date', 'type', 'amount', 'category', 'description')
    list_filter = ('type', 'category', 'date')
    search_fields = ('description',)
    date_hierarchy = 'date'
    ordering = ('-date',)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'current_amount', 'target_amount', 'deadline')
    search_fields = ('name',)
