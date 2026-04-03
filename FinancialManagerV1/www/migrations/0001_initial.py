import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, verbose_name='Название')),
                ('icon', models.CharField(default='💰', max_length=10, verbose_name='Иконка')),
                ('type', models.CharField(
                    choices=[('income', 'Доход'), ('expense', 'Расход')],
                    max_length=10, verbose_name='Тип'
                )),
                ('color', models.CharField(default='#4f8ef7', max_length=20, verbose_name='Цвет')),
            ],
            options={'verbose_name': 'Категория', 'verbose_name_plural': 'Категории', 'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(
                    choices=[('income', 'Доход'), ('expense', 'Расход')],
                    max_length=10, verbose_name='Тип'
                )),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Сумма')),
                ('description', models.CharField(blank=True, max_length=255, verbose_name='Описание')),
                ('date', models.DateField(default=django.utils.timezone.now, verbose_name='Дата')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('category', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='transactions',
                    to='www.category',
                    verbose_name='Категория',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='transactions',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Пользователь',
                )),
            ],
            options={'verbose_name': 'Транзакция', 'verbose_name_plural': 'Транзакции', 'ordering': ['-date', '-created_at']},
        ),
        migrations.CreateModel(
            name='Goal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, verbose_name='Название')),
                ('icon', models.CharField(default='🎯', max_length=10, verbose_name='Иконка')),
                ('target_amount', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Целевая сумма')),
                ('current_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Накоплено')),
                ('deadline', models.DateField(blank=True, null=True, verbose_name='Срок')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='goals',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Пользователь',
                )),
            ],
            options={'verbose_name': 'Цель', 'verbose_name_plural': 'Цели', 'ordering': ['-created_at']},
        ),
    ]
