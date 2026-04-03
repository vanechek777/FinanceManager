from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Category(models.Model):
    TYPE_CHOICES = [
        ('income', 'Доход'),
        ('expense', 'Расход'),
    ]
    name   = models.CharField(max_length=100, verbose_name='Название')
    icon   = models.CharField(max_length=10, default='💰', verbose_name='Иконка')
    type   = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name='Тип')
    color  = models.CharField(max_length=20, default='#4f8ef7', verbose_name='Цвет')

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['name']

    def __str__(self):
        return f'{self.icon} {self.name}'


class Transaction(models.Model):
    TYPE_CHOICES = [
        ('income', 'Доход'),
        ('expense', 'Расход'),
    ]
    user        = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions', verbose_name='Пользователь')
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name='Тип')
    amount      = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Сумма')
    category    = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transactions', verbose_name='Категория'
    )
    description = models.CharField(max_length=255, blank=True, verbose_name='Описание')
    date        = models.DateField(default=timezone.now, verbose_name='Дата')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Транзакция'
        verbose_name_plural = 'Транзакции'
        ordering = ['-date', '-created_at']

    def __str__(self):
        sign = '+' if self.type == 'income' else '-'
        return f'{sign}{self.amount} — {self.description or self.category}'


class Goal(models.Model):
    user           = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='goals', verbose_name='Пользователь')
    name           = models.CharField(max_length=200, verbose_name='Название')
    icon           = models.CharField(max_length=10, default='🎯', verbose_name='Иконка')
    target_amount  = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Целевая сумма')
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Накоплено')
    deadline       = models.DateField(null=True, blank=True, verbose_name='Срок')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Цель'
        verbose_name_plural = 'Цели'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.icon} {self.name}'

    @property
    def progress_pct(self):
        if self.target_amount > 0:
            return min(100, round(float(self.current_amount) / float(self.target_amount) * 100, 1))
        return 0
