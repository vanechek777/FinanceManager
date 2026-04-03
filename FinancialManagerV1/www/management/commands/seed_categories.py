from django.core.management.base import BaseCommand
from www.models import Category


CATEGORIES = [
    # Расходы
    {'name': 'Продукты',       'icon': '🛒', 'type': 'expense', 'color': '#f7a845'},
    {'name': 'Рестораны',      'icon': '🍕', 'type': 'expense', 'color': '#f75f6c'},
    {'name': 'Транспорт',      'icon': '🚗', 'type': 'expense', 'color': '#4f8ef7'},
    {'name': 'ЖКХ',            'icon': '🏠', 'type': 'expense', 'color': '#9b5de5'},
    {'name': 'Здоровье',       'icon': '💊', 'type': 'expense', 'color': '#22d3a0'},
    {'name': 'Одежда',         'icon': '👗', 'type': 'expense', 'color': '#fb7185'},
    {'name': 'Развлечения',    'icon': '🎬', 'type': 'expense', 'color': '#a78bfa'},
    {'name': 'Образование',    'icon': '📚', 'type': 'expense', 'color': '#38bdf8'},
    {'name': 'Связь',          'icon': '📱', 'type': 'expense', 'color': '#34d399'},
    {'name': 'Путешествия',    'icon': '✈️', 'type': 'expense', 'color': '#fbbf24'},
    {'name': 'Спорт',          'icon': '💪', 'type': 'expense', 'color': '#f97316'},
    {'name': 'Прочее',         'icon': '📦', 'type': 'expense', 'color': '#8892b0'},
    # Доходы
    {'name': 'Зарплата',       'icon': '💼', 'type': 'income',  'color': '#22d3a0'},
    {'name': 'Фриланс',        'icon': '💻', 'type': 'income',  'color': '#4f8ef7'},
    {'name': 'Инвестиции',     'icon': '📈', 'type': 'income',  'color': '#a78bfa'},
    {'name': 'Подарки',        'icon': '🎁', 'type': 'income',  'color': '#fb7185'},
    {'name': 'Аренда',         'icon': '🏘️', 'type': 'income',  'color': '#fbbf24'},
    {'name': 'Прочее',         'icon': '💰', 'type': 'income',  'color': '#34d399'},
]


class Command(BaseCommand):
    help = 'Загружает начальные категории доходов и расходов'

    def handle(self, *args, **options):
        created = 0
        for cat in CATEGORIES:
            obj, is_new = Category.objects.get_or_create(
                name=cat['name'],
                type=cat['type'],
                defaults={'icon': cat['icon'], 'color': cat['color']},
            )
            if is_new:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  + {obj}'))
            else:
                self.stdout.write(f'  ~ {obj} (уже существует)')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Готово! Создано {created} категорий.'))
