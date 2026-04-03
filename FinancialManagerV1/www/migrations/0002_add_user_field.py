import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds user ForeignKey to Transaction and Goal tables.
    Uses nullable=True first so existing rows get NULL, then sets default user.
    Since this is a dev project, we use CASCADE delete.
    """

    dependencies = [
        ('www', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add user to Transaction (nullable first to allow existing rows)
        migrations.AddField(
            model_name='transaction',
            name='user',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='transactions',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Пользователь',
            ),
        ),
        # Add user to Goal (nullable first)
        migrations.AddField(
            model_name='goal',
            name='user',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='goals',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Пользователь',
            ),
        ),
    ]
