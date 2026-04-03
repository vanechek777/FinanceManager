from rest_framework import serializers
from .models import Category, Transaction, Goal
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'type', 'color']
        read_only_fields = fields # Category is global and read-only via API

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'user', 'type', 'amount', 'category', 'description', 'date', 'created_at']
        read_only_fields = ['user', 'created_at']

class GoalSerializer(serializers.ModelSerializer):
    progress_pct = serializers.ReadOnlyField()

    class Meta:
        model = Goal
        fields = ['id', 'user', 'name', 'icon', 'target_amount', 'current_amount', 'deadline', 'created_at', 'progress_pct']
        read_only_fields = ['user', 'created_at']
