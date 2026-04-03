import json
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Category, Transaction, Goal


# ─── Welcome page ─────────────────────────────────────────

def welcome_view(request):
    """Landing page — redirects to /app/ if already authenticated."""
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'www/welcome.html')


# ─── Auth views ────────────────────────────────────────────

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('dashboard')
        error = 'Неверный логин или пароль'
    return render(request, 'www/login.html', {'error': error})


def register_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    error = None
    if request.method == 'POST':
        username  = request.POST.get('username', '').strip()
        email     = request.POST.get('email', '').strip()
        password  = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')

        if not username or not password:
            error = 'Логин и пароль обязательны'
        elif password != password2:
            error = 'Пароли не совпадают'
        elif len(password) < 6:
            error = 'Пароль должен быть не менее 6 символов'
        elif User.objects.filter(username=username).exists():
            error = 'Пользователь с таким именем уже существует'
        else:
            user = User.objects.create_user(username=username, email=email, password=password)
            login(request, user)
            return redirect('dashboard')
    return render(request, 'www/register.html', {'error': error})


def logout_view(request):
    logout(request)
    return redirect('login')


# ─── Main SPA page ────────────────────────────────────────

@login_required(login_url='/login/')
def dashboard_view(request):
    return render(request, 'www/index.html', {'username': request.user.username})


# ─── Helpers ───────────────────────────────────────────────

def _period_filter(qs, period, date_field='date'):
    today = date.today()
    if period == 'week':
        start = today - timedelta(days=today.weekday())
        return qs.filter(**{f'{date_field}__gte': start})
    elif period == 'month':
        return qs.filter(**{f'{date_field}__year': today.year,
                            f'{date_field}__month': today.month})
    elif period == 'year':
        return qs.filter(**{f'{date_field}__year': today.year})
    return qs


def _fmt(value):
    return float(value or 0)


def _json_err(msg, status=400):
    return JsonResponse({'error': msg}, status=status)


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorised'}, status=401)
    return None


# ─── API: Stats ────────────────────────────────────────────

@login_required(login_url='/login/')
def api_stats(request):
    period = request.GET.get('period', 'month')
    qs = Transaction.objects.filter(user=request.user)
    qs = _period_filter(qs, period)

    income  = _fmt(qs.filter(type='income').aggregate(s=Sum('amount'))['s'])
    expense = _fmt(qs.filter(type='expense').aggregate(s=Sum('amount'))['s'])
    balance = income - expense
    savings_rate = round(balance / income * 100, 1) if income else 0

    return JsonResponse({
        'income': income, 'expense': expense,
        'balance': balance, 'savings_rate': savings_rate,
    })


# ─── API: Monthly ──────────────────────────────────────────

@login_required(login_url='/login/')
def api_monthly(request):
    today = date.today()
    months = []
    for i in range(11, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12; y -= 1
        qs  = Transaction.objects.filter(user=request.user, date__year=y, date__month=m)
        inc = _fmt(qs.filter(type='income').aggregate(s=Sum('amount'))['s'])
        exp = _fmt(qs.filter(type='expense').aggregate(s=Sum('amount'))['s'])
        months.append({'label': f'{y}-{m:02d}', 'income': inc, 'expense': exp})
    return JsonResponse({'months': months})


# ─── API: Categories chart ─────────────────────────────────

@login_required(login_url='/login/')
def api_categories(request):
    period   = request.GET.get('period', 'month')
    tx_type  = request.GET.get('type', 'expense')
    qs = Transaction.objects.filter(user=request.user, type=tx_type)
    qs = _period_filter(qs, period)

    cats  = (qs.values('category__id', 'category__name', 'category__icon', 'category__color')
               .annotate(total=Sum('amount'))
               .order_by('-total'))
    total = sum(_fmt(c['total']) for c in cats)

    result = [{
        'id':     c['category__id'],
        'name':   c['category__name'] or 'Без категории',
        'icon':   c['category__icon'] or '❓',
        'color':  c['category__color'] or '#4f8ef7',
        'amount': _fmt(c['total']),
        'pct':    round(_fmt(c['total']) / total * 100, 1) if total else 0,
    } for c in cats]
    return JsonResponse({'categories': result, 'total': total})


# ─── API: Weekly ───────────────────────────────────────────

@login_required(login_url='/login/')
def api_weekly(request):
    today = date.today()
    weeks = []
    for i in range(7, -1, -1):
        start = today - timedelta(weeks=i) - timedelta(days=(today - timedelta(weeks=i)).weekday())
        end   = start + timedelta(days=6)
        qs    = Transaction.objects.filter(user=request.user, date__gte=start, date__lte=end, type='expense')
        exp   = _fmt(qs.aggregate(s=Sum('amount'))['s'])
        weeks.append({'label': start.strftime('%d.%m'), 'expense': exp})
    return JsonResponse({'weeks': weeks})


# ─── API: Balance timeline ─────────────────────────────────

@login_required(login_url='/login/')
def api_balance_timeline(request):
    txs     = Transaction.objects.filter(user=request.user).order_by('date', 'created_at').values('type', 'amount', 'date')
    balance = 0.0
    points  = {}
    for tx in txs:
        d = str(tx['date'])
        balance += _fmt(tx['amount']) if tx['type'] == 'income' else -_fmt(tx['amount'])
        points[d] = round(balance, 2)
    result = [{'date': k, 'balance': v} for k, v in sorted(points.items())]
    return JsonResponse({'timeline': result})


# ─── API: Transactions CRUD ────────────────────────────────

@login_required(login_url='/login/')
def api_transactions(request):
    period      = request.GET.get('period', 'all')
    tx_type     = request.GET.get('type', '')
    category_id = request.GET.get('category', '')
    search      = request.GET.get('search', '').strip()

    qs = Transaction.objects.filter(user=request.user).select_related('category')
    qs = _period_filter(qs, period)
    if tx_type in ('income', 'expense'):
        qs = qs.filter(type=tx_type)
    if category_id:
        qs = qs.filter(category_id=category_id)
    if search:
        qs = qs.filter(Q(description__icontains=search) | Q(category__name__icontains=search))

    data = [{
        'id':            tx.id,
        'type':          tx.type,
        'amount':        _fmt(tx.amount),
        'category':      tx.category.name if tx.category else 'Без категории',
        'category_icon': tx.category.icon if tx.category else '❓',
        'category_id':   tx.category_id,
        'description':   tx.description,
        'date':          str(tx.date),
    } for tx in qs[:200]]
    return JsonResponse({'transactions': data})


@csrf_exempt
@login_required(login_url='/login/')
def api_transaction_create(request):
    if request.method != 'POST':
        return _json_err('Method not allowed', 405)
    try:
        body = json.loads(request.body)
        tx   = Transaction.objects.create(
            user=request.user,
            type=body['type'],
            amount=Decimal(str(body['amount'])),
            category_id=body.get('category_id') or None,
            description=body.get('description', ''),
            date=body.get('date', date.today()),
        )
        return JsonResponse({'id': tx.id, 'ok': True}, status=201)
    except Exception as e:
        return _json_err(str(e))


@csrf_exempt
@login_required(login_url='/login/')
def api_transaction_update(request, pk):
    if request.method != 'PUT':
        return _json_err('Method not allowed', 405)
    tx = get_object_or_404(Transaction, pk=pk, user=request.user)
    try:
        body = json.loads(request.body)
        tx.type = body.get('type', tx.type)
        if 'amount' in body:
            tx.amount = Decimal(str(body['amount']))
        if 'category_id' in body:
            tx.category_id = body['category_id'] or None
        if 'description' in body:
            tx.description = body['description']
        if 'date' in body:
            tx.date = body['date']
        tx.save()
        return JsonResponse({'id': tx.id, 'ok': True})
    except Exception as e:
        return _json_err(str(e))


@csrf_exempt
@login_required(login_url='/login/')
def api_transaction_delete(request, pk):
    if request.method != 'DELETE':
        return _json_err('Method not allowed', 405)
    tx = get_object_or_404(Transaction, pk=pk, user=request.user)
    tx.delete()
    return JsonResponse({'ok': True})


# ─── API: Categories list ──────────────────────────────────

@login_required(login_url='/login/')
def api_categories_list(request):
    cats = Category.objects.all().values('id', 'name', 'icon', 'type', 'color')
    return JsonResponse({'categories': list(cats)})


# ─── API: Goals CRUD ──────────────────────────────────────

@login_required(login_url='/login/')
def api_goals(request):
    goals = Goal.objects.filter(user=request.user)
    data  = [{
        'id':             g.id,
        'name':           g.name,
        'icon':           g.icon,
        'target_amount':  _fmt(g.target_amount),
        'current_amount': _fmt(g.current_amount),
        'deadline':       str(g.deadline) if g.deadline else None,
        'progress_pct':   g.progress_pct,
    } for g in goals]
    return JsonResponse({'goals': data})


@csrf_exempt
@login_required(login_url='/login/')
def api_goal_create(request):
    if request.method != 'POST':
        return _json_err('Method not allowed', 405)
    try:
        body = json.loads(request.body)
        g    = Goal.objects.create(
            user=request.user,
            name=body['name'],
            icon=body.get('icon', '🎯'),
            target_amount=Decimal(str(body['target_amount'])),
            current_amount=Decimal(str(body.get('current_amount', 0))),
            deadline=body.get('deadline') or None,
        )
        return JsonResponse({'id': g.id, 'ok': True}, status=201)
    except Exception as e:
        return _json_err(str(e))


@csrf_exempt
@login_required(login_url='/login/')
def api_goal_delete(request, pk):
    if request.method != 'DELETE':
        return _json_err('Method not allowed', 405)
    g = get_object_or_404(Goal, pk=pk, user=request.user)
    g.delete()
    return JsonResponse({'ok': True})


@csrf_exempt
@login_required(login_url='/login/')
def api_goal_update(request, pk):
    if request.method != 'PATCH':
        return _json_err('Method not allowed', 405)
    try:
        g    = get_object_or_404(Goal, pk=pk, user=request.user)
        body = json.loads(request.body)
        if 'current_amount' in body:
            g.current_amount = Decimal(str(body['current_amount']))
        if 'name' in body:
            g.name = body['name']
        g.save()
        return JsonResponse({'ok': True, 'progress_pct': g.progress_pct})
    except Exception as e:
        return _json_err(str(e))
