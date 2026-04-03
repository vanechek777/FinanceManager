/* ═══════════════════════════════════════════════════════
   FINANCEFLOW — Main Application Script
   Communicates with Django JSON API
═══════════════════════════════════════════════════════ */

'use strict';

// ─── State ────────────────────────────────────────────────
const state = {
  period: 'month',
  currentPage: 'dashboard',
  currentGoalId: null,
  editTransactionId: null,
  categories: [],
  transactions: [],
  selectedType: 'expense',
  selectedIcon: '✈️',
  charts: {},
};

// ─── CSRF helper ──────────────────────────────────────────
function getCsrfToken() {
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1].trim() : '';
}

async function apiFetch(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
  };
  const res = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Format helpers ────────────────────────────────────────
function formatMoney(v) {
  return '₽' + Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}

function monthLabel(str) {
  // str = "YYYY-MM"
  const [y, m] = str.split('-');
  const names = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  return names[parseInt(m, 10) - 1] + ' ' + y;
}

// ─── Toast ────────────────────────────────────────────────
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ─── Navigation ────────────────────────────────────────────
const pageTitles = {
  dashboard: 'Дашборд',
  transactions: 'Транзакции',
  analytics: 'Аналитика',
  goals: 'Цели',
};

function navigateTo(page) {
  if (state.currentPage === page) return;
  state.currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  // Sync bottom nav
  document.querySelectorAll('.bnav-item').forEach(n => {
    if (n.dataset.page === page) n.classList.add('active');
  });

  document.getElementById('topbarTitle').textContent = pageTitles[page] || page;

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open');
  }

  // Load page data
  if (page === 'dashboard')    loadDashboard();
  if (page === 'transactions') loadTransactions();
  if (page === 'analytics')    loadAnalytics();
  if (page === 'goals')        loadGoals();
}

// ─── Period label ─────────────────────────────────────────
function updatePeriodLabel() {
  const labels = { all: 'Всё время', month: 'Этот месяц', year: 'Этот год', week: 'Эта неделя' };
  document.getElementById('currentPeriodLabel').textContent = labels[state.period] || '';
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
async function loadDashboard() {
  await Promise.all([loadStats(), loadMonthlyChart(), loadCategoryChart(), loadRecentTransactions()]);
}

async function loadStats() {
  try {
    const data = await apiFetch(`/api/stats/?period=${state.period}`);
    animateValue('totalBalance', data.balance);
    animateValue('totalIncome',  data.income);
    animateValue('totalExpense', data.expense);
    document.getElementById('savingsRate').textContent = data.savings_rate + '%';
    document.getElementById('incomeTrend').textContent  = 'за выбранный период';
    document.getElementById('expenseTrend').textContent = 'за выбранный период';
    document.getElementById('balanceTrend').textContent = data.balance >= 0 ? '▲ положительный' : '▼ отрицательный';
    document.getElementById('savingsTrend').textContent = 'от доходов';
  } catch (e) {
    console.error('loadStats:', e);
  }
}

function animateValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0;
  const end   = Number(value);
  const dur   = 600;
  const t0    = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = formatMoney(start + (end - start) * ease);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Monthly Bar Chart ─────────────────────────────────────
async function loadMonthlyChart() {
  try {
    const data = await apiFetch('/api/monthly/');
    const labels  = data.months.map(m => monthLabel(m.label));
    const incomes  = data.months.map(m => m.income);
    const expenses = data.months.map(m => m.expense);

    renderBarChart('monthlyChart', labels, incomes, expenses);
  } catch (e) { console.error('loadMonthlyChart:', e); }
}

function renderBarChart(canvasId, labels, incomes, expenses) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  if (state.charts[canvasId]) state.charts[canvasId].destroy();

  state.charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Доходы',
          data: incomes,
          backgroundColor: 'rgba(34, 211, 160, 0.7)',
          borderColor: '#22d3a0',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Расходы',
          data: expenses.map(v => Math.abs(v)),
          backgroundColor: 'rgba(247, 95, 108, 0.7)',
          borderColor: '#f75f6c',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: chartDefaults({
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 11 }, callback: v => '₽' + v.toLocaleString('ru-RU') } },
      },
    }),
  });
}

// ─── Category Donut ────────────────────────────────────────
async function loadCategoryChart() {
  try {
    const data = await apiFetch(`/api/categories-chart/?period=${state.period}&type=expense`);
    const cats = data.categories;

    if (cats.length === 0) {
      document.getElementById('donutTotal').textContent = '₽0';
      if (state.charts['categoryChart']) state.charts['categoryChart'].destroy();
      return;
    }

    document.getElementById('donutTotal').textContent = formatMoney(data.total);

    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['categoryChart']) state.charts['categoryChart'].destroy();

    state.charts['categoryChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: cats.map(c => `${c.icon} ${c.name}`),
        datasets: [{
          data: cats.map(c => c.amount),
          backgroundColor: generatePalette(cats.length),
          borderWidth: 2,
          borderColor: '#141720',
          hoverBorderColor: '#fff',
        }],
      },
      options: {
        ...chartDefaults(),
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8892b0', font: { size: 11 }, padding: 12, boxWidth: 10 },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${formatMoney(ctx.parsed)} (${cats[ctx.dataIndex].pct}%)`,
            },
          },
        },
      },
    });
  } catch (e) { console.error('loadCategoryChart:', e); }
}

// ─── Recent Transactions ───────────────────────────────────
async function loadRecentTransactions() {
  try {
    const data = await apiFetch(`/api/transactions/?period=${state.period}`);
    const container = document.getElementById('recentTransactions');
    renderTransactionList(container, data.transactions.slice(0, 8), false);
  } catch (e) { console.error('loadRecentTransactions:', e); }
}

// ══════════════════════════════════════════════════════════
//  TRANSACTIONS PAGE
// ══════════════════════════════════════════════════════════
async function loadTransactions() {
  await loadCategoriesIntoFilter();
  await fetchAndRenderTransactions();
}

async function loadCategoriesIntoFilter() {
  // Populate catFilter select
  const catFilter = document.getElementById('catFilter');
  if (!catFilter) return;
  catFilter.innerHTML = '<option value="all">Категории</option>';
  state.categories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = `${c.icon} ${c.name}`;
    catFilter.appendChild(o);
  });
}

async function fetchAndRenderTransactions() {
  const search = document.getElementById('searchInput')?.value || '';
  const type   = document.getElementById('typeFilter')?.value || 'all';
  const cat    = document.getElementById('catFilter')?.value || 'all';

  let url = `/api/transactions/?period=${state.period}`;
  if (type !== 'all') url += `&type=${type}`;
  if (cat  !== 'all') url += `&category=${cat}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  try {
    const data = await apiFetch(url);
    const container = document.getElementById('allTransactions');
    renderTransactionList(container, data.transactions, true);
  } catch (e) { console.error('fetchAndRenderTransactions:', e); }
}

function renderTransactionList(container, txList, showDelete) {
  if (!container) return;
  state.transactions = txList;

  if (!txList || txList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💳</div>
        <div class="empty-text">Нет транзакций за выбранный период</div>
      </div>`;
    return;
  }

  container.innerHTML = txList.map(tx => `
    <div class="transaction-item" data-id="${tx.id}">
      <div class="tx-icon ${tx.type}">${tx.category_icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${tx.description || tx.category || 'Операция'}</div>
        <div class="tx-cat">${tx.category}</div>
      </div>
      <div class="tx-meta">
        <span class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}</span>
        <span class="tx-date">${formatDate(tx.date)}</span>
      </div>
      <div class="tx-actions" style="display:flex;gap:4px;">
        ${showDelete ? `
          <button class="btn-secondary edit-tx-btn" data-id="${tx.id}" style="padding:4px 8px;font-size:12px;">✏️</button>
          <button class="btn-danger delete-tx-btn" data-id="${tx.id}" style="padding:4px 8px;font-size:12px;">✕</button>
        ` : ''}
      </div>
    </div>
  `).join('');

  if (showDelete) {
    container.querySelectorAll('.edit-tx-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tx = state.transactions.find(t => t.id == btn.dataset.id);
        if (tx) openEditTransactionModal(tx);
      });
    });
    container.querySelectorAll('.delete-tx-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        deleteTransaction(btn.dataset.id);
      });
    });
  }
}

async function deleteTransaction(id) {
  if (!confirm('Удалить транзакцию?')) return;
  try {
    await apiFetch(`/api/transactions/${id}/delete/`, { method: 'DELETE' });
    showToast('Транзакция удалена', 'success');
    refreshCurrentPage();
  } catch (e) {
    showToast('Ошибка удаления', 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  ANALYTICS PAGE
// ══════════════════════════════════════════════════════════
async function loadAnalytics() {
  await Promise.all([
    loadBalanceTimeline(),
    loadTopCategoryChart(),
    loadWeeklyChart(),
    loadIncomeCategoryChart(),
    loadCategoryBreakdown(),
  ]);
}

async function loadBalanceTimeline() {
  try {
    const data = await apiFetch('/api/balance-timeline/');
    const timeline = data.timeline;

    const ctx = document.getElementById('balanceChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['balanceChart']) state.charts['balanceChart'].destroy();

    const labels = timeline.map(p => formatDate(p.date));
    const values = timeline.map(p => p.balance);

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(79,142,247,0.4)');
    gradient.addColorStop(1, 'rgba(79,142,247,0)');

    state.charts['balanceChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Баланс',
          data: values,
          borderColor: '#4f8ef7',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: timeline.length > 30 ? 0 : 4,
          pointBackgroundColor: '#4f8ef7',
          borderWidth: 2,
        }],
      },
      options: chartDefaults({
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 10 }, maxTicksLimit: 8 } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 11 }, callback: v => '₽' + v.toLocaleString('ru-RU') } },
        },
        plugins: { legend: { display: false } },
      }),
    });
  } catch (e) { console.error('loadBalanceTimeline:', e); }
}

async function loadTopCategoryChart() {
  try {
    const data = await apiFetch(`/api/categories-chart/?period=${state.period}&type=expense`);
    const cats = data.categories.slice(0, 7);

    const ctx = document.getElementById('topCatChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['topCatChart']) state.charts['topCatChart'].destroy();

    state.charts['topCatChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: cats.map(c => `${c.icon} ${c.name}`),
        datasets: [{
          data: cats.map(c => c.amount),
          backgroundColor: generatePalette(cats.length),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: chartDefaults({
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 10 }, callback: v => '₽' + v.toLocaleString('ru-RU') } },
          y: { grid: { display: false }, ticks: { color: '#f0f2ff', font: { size: 11 } } },
        },
      }),
    });
  } catch (e) { console.error('loadTopCategoryChart:', e); }
}

async function loadWeeklyChart() {
  try {
    const data = await apiFetch('/api/weekly/');
    const weeks = data.weeks;

    const ctx = document.getElementById('weeklyChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['weeklyChart']) state.charts['weeklyChart'].destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(247,95,108,0.4)');
    gradient.addColorStop(1, 'rgba(247,95,108,0)');

    state.charts['weeklyChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [{
          label: 'Расходы',
          data: weeks.map(w => w.expense),
          borderColor: '#f75f6c',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#f75f6c',
          borderWidth: 2,
        }],
      },
      options: chartDefaults({
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892b0', font: { size: 11 }, callback: v => '₽' + v.toLocaleString('ru-RU') } },
        },
        plugins: { legend: { display: false } },
      }),
    });
  } catch (e) { console.error('loadWeeklyChart:', e); }
}

async function loadIncomeCategoryChart() {
  try {
    const data = await apiFetch(`/api/categories-chart/?period=${state.period}&type=income`);
    const cats = data.categories;

    const ctx = document.getElementById('incomeCatChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['incomeCatChart']) state.charts['incomeCatChart'].destroy();

    if (cats.length === 0) return;

    state.charts['incomeCatChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: cats.map(c => `${c.icon} ${c.name}`),
        datasets: [{
          data: cats.map(c => c.amount),
          backgroundColor: generateGreenPalette(cats.length),
          borderWidth: 2,
          borderColor: '#141720',
        }],
      },
      options: {
        ...chartDefaults(),
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8892b0', font: { size: 11 }, padding: 10, boxWidth: 10 } },
          tooltip: {
            callbacks: { label: ctx => ` ${formatMoney(ctx.parsed)} (${cats[ctx.dataIndex].pct}%)` },
          },
        },
      },
    });
  } catch (e) { console.error('loadIncomeCategoryChart:', e); }
}

async function loadCategoryBreakdown() {
  try {
    const data = await apiFetch(`/api/categories-chart/?period=${state.period}&type=expense`);
    const cats = data.categories;
    const container = document.getElementById('categoryBreakdown');
    if (!container) return;

    if (cats.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Нет данных</div></div>`;
      return;
    }

    container.innerHTML = cats.map(c => `
      <div class="cat-row">
        <div class="cat-row-icon">${c.icon}</div>
        <div class="cat-row-info">
          <div class="cat-row-name">${c.name}</div>
          <div class="cat-row-bar">
            <div class="cat-row-fill" style="width: ${c.pct}%"></div>
          </div>
        </div>
        <div class="cat-row-stats">
          <span class="cat-row-amount">${formatMoney(c.amount)}</span>
          <span class="cat-row-pct">${c.pct}%</span>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error('loadCategoryBreakdown:', e); }
}

// ══════════════════════════════════════════════════════════
//  GOALS PAGE
// ══════════════════════════════════════════════════════════
async function loadGoals() {
  try {
    const data = await apiFetch('/api/goals/');
    renderGoals(data.goals);
  } catch (e) { console.error('loadGoals:', e); }
}

function renderGoals(goals) {
  const container = document.getElementById('goalsList');
  if (!container) return;

  if (!goals || goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <div class="empty-text">Добавьте первую финансовую цель!</div>
      </div>`;
    return;
  }

  container.innerHTML = goals.map(g => {
    const deadline = g.deadline ? `До ${formatDate(g.deadline)}` : 'Без срока';
    const daysLeft = g.deadline ? daysUntil(g.deadline) : null;
    const daysLabel = daysLeft !== null ? (daysLeft > 0 ? ` · ${daysLeft} дн.` : ' · Просрочено') : '';
    return `
      <div class="goal-card" data-id="${g.id}">
        <div class="goal-card-header">
          <div class="goal-icon-wrap">${g.icon}</div>
          <button class="btn-danger delete-goal-btn" data-id="${g.id}">✕</button>
        </div>
        <div class="goal-name">${g.name}</div>
        <div class="goal-deadline">${deadline}${daysLabel}</div>
        <div class="goal-amounts">
          <span class="goal-current">${formatMoney(g.current_amount)}</span>
          <span class="goal-target">из ${formatMoney(g.target_amount)}</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width: ${g.progress_pct}%"></div>
        </div>
        <div class="goal-pct">${g.progress_pct}% выполнено</div>
        <div class="goal-actions">
          <button class="btn-secondary add-to-goal-btn" data-id="${g.id}" data-current="${g.current_amount}" data-target="${g.target_amount}">+ Пополнить</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteGoal(btn.dataset.id));
  });

  container.querySelectorAll('.add-to-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = prompt('Введите сумму пополнения (₽):');
      if (!amount || isNaN(amount) || Number(amount) <= 0) return;
      const newCurrent = Number(btn.dataset.current) + Number(amount);
      updateGoal(btn.dataset.id, newCurrent);
    });
  });
}

function daysUntil(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

async function deleteGoal(id) {
  if (!confirm('Удалить цель?')) return;
  try {
    await apiFetch(`/api/goals/${id}/delete/`, { method: 'DELETE' });
    showToast('Цель удалена', 'success');
    loadGoals();
  } catch (e) { showToast('Ошибка удаления', 'error'); }
}

async function updateGoal(id, newCurrent) {
  try {
    await apiFetch(`/api/goals/${id}/update/`, {
      method: 'PATCH',
      body: JSON.stringify({ current_amount: newCurrent }),
    });
    showToast('Прогресс обновлён!', 'success');
    loadGoals();
  } catch (e) { showToast('Ошибка обновления', 'error'); }
}

// ══════════════════════════════════════════════════════════
//  ADD TRANSACTION MODAL
// ══════════════════════════════════════════════════════════
async function loadCategories() {
  try {
    const data = await apiFetch('/api/categories/');
    state.categories = data.categories;
    return data.categories;
  } catch (e) {
    console.error('loadCategories:', e);
    return [];
  }
}

function openTransactionModal() {
  state.editTransactionId = null;
  const modal = document.getElementById('transactionModal');
  modal.classList.add('open');
  document.getElementById('amountInput').value = '';
  document.getElementById('descriptionInput').value = '';
  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalTitle').textContent = 'Новая операция';
  document.getElementById('saveTransaction').textContent = 'Добавить';

  // Set default type
  setTransactionType('expense');
  populateCategorySelect('expense');
}

function openEditTransactionModal(tx) {
  state.editTransactionId = tx.id;
  const modal = document.getElementById('transactionModal');
  modal.classList.add('open');
  
  document.getElementById('amountInput').value = tx.amount;
  document.getElementById('descriptionInput').value = tx.description || '';
  document.getElementById('dateInput').value = tx.date;
  document.getElementById('modalTitle').textContent = 'Изменить операцию';
  document.getElementById('saveTransaction').textContent = 'Сохранить';

  setTransactionType(tx.type);
  document.getElementById('categoryInput').value = tx.category_id || '';
}

function closeTransactionModal() {
  document.getElementById('transactionModal').classList.remove('open');
}

function setTransactionType(type) {
  state.selectedType = type;
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  populateCategorySelect(type);
}

function populateCategorySelect(type) {
  const sel = document.getElementById('categoryInput');
  if (!sel) return;
  const filtered = state.categories.filter(c => c.type === type);
  sel.innerHTML = filtered.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  if (filtered.length === 0) sel.innerHTML = '<option value="">Без категории</option>';
}

async function saveTransaction() {
  const amount = parseFloat(document.getElementById('amountInput').value);
  const categoryId = document.getElementById('categoryInput').value;
  const date = document.getElementById('dateInput').value;
  const description = document.getElementById('descriptionInput').value.trim();

  if (!amount || amount <= 0) {
    showToast('Введите корректную сумму', 'error');
    return;
  }
  if (!date) {
    showToast('Выберите дату', 'error');
    return;
  }

  try {
    const isEdit = !!state.editTransactionId;
    const url = isEdit ? `/api/transactions/${state.editTransactionId}/update/` : '/api/transactions/create/';
    const method = isEdit ? 'PUT' : 'POST';

    await apiFetch(url, {
      method,
      body: JSON.stringify({
        type: state.selectedType,
        amount,
        category_id: categoryId || null,
        date,
        description,
      }),
    });
    closeTransactionModal();
    showToast(isEdit ? 'Транзакция обновлена ✨' : 'Транзакция добавлена! 🎉', 'success');
    refreshCurrentPage();
  } catch (e) {
    showToast('Ошибка сохранения', 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  ADD GOAL MODAL
// ══════════════════════════════════════════════════════════
function openGoalModal() {
  document.getElementById('goalModal').classList.add('open');
  document.getElementById('goalName').value = '';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalCurrent').value = '';
  document.getElementById('goalDeadline').value = '';
  state.selectedIcon = '✈️';
  document.querySelectorAll('.icon-opt').forEach(o => o.classList.toggle('selected', o.dataset.icon === '✈️'));
}

function closeGoalModal() {
  document.getElementById('goalModal').classList.remove('open');
}

async function saveGoal() {
  const name    = document.getElementById('goalName').value.trim();
  const target  = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  const deadline = document.getElementById('goalDeadline').value;

  if (!name) { showToast('Введите название цели', 'error'); return; }
  if (!target || target <= 0) { showToast('Введите целевую сумму', 'error'); return; }

  try {
    await apiFetch('/api/goals/create/', {
      method: 'POST',
      body: JSON.stringify({
        name,
        icon: state.selectedIcon,
        target_amount: target,
        current_amount: current,
        deadline: deadline || null,
      }),
    });
    closeGoalModal();
    showToast('Цель создана! 🎯', 'success');
    loadGoals();
  } catch (e) {
    showToast('Ошибка сохранения', 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  CHART HELPERS
// ══════════════════════════════════════════════════════════
function chartDefaults(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1e2e',
        titleColor: '#f0f2ff',
        bodyColor: '#8892b0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: ctx => ` ${formatMoney(ctx.parsed.y ?? ctx.parsed)}`,
        },
      },
    },
    ...extra,
  };
}

const PALETTE = [
  '#4f8ef7', '#9b5de5', '#22d3a0', '#f7a845', '#f75f6c',
  '#38bdf8', '#fb7185', '#a78bfa', '#34d399', '#fbbf24',
];

const GREEN_PALETTE = [
  '#22d3a0', '#34d399', '#6ee7b7', '#a7f3d0',
  '#d1fae5', '#10b981', '#059669', '#047857',
];

function generatePalette(n) {
  return Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
}

function generateGreenPalette(n) {
  return Array.from({ length: n }, (_, i) => GREEN_PALETTE[i % GREEN_PALETTE.length]);
}

// ══════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════
function refreshCurrentPage() {
  const p = state.currentPage;
  if (p === 'dashboard')    loadDashboard();
  if (p === 'transactions') loadTransactions();
  if (p === 'analytics')    loadAnalytics();
  if (p === 'goals')        loadGoals();
}

// ══════════════════════════════════════════════════════════
//  INIT — EVENT LISTENERS
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Load categories globally
  await loadCategories();

  // Initial page load
  loadDashboard();

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Bottom nav (mobile)
  document.querySelectorAll('.bnav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // FAB — open add transaction modal
  document.getElementById('fabBtn')?.addEventListener('click', openTransactionModal);

  // "All →" link
  document.querySelectorAll('.section-link[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Period select
  document.getElementById('periodSelect').addEventListener('change', e => {
    state.period = e.target.value;
    updatePeriodLabel();
    refreshCurrentPage();
  });

  // Sidebar toggle
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  // Transaction modal
  document.getElementById('addTransactionBtn').addEventListener('click', openTransactionModal);
  document.getElementById('closeTransactionModal').addEventListener('click', closeTransactionModal);
  document.getElementById('cancelTransaction').addEventListener('click', closeTransactionModal);
  document.getElementById('saveTransaction').addEventListener('click', saveTransaction);

  // Type toggle
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => setTransactionType(btn.dataset.type));
  });

  // Goal modal
  document.getElementById('addGoalBtn').addEventListener('click', openGoalModal);
  document.getElementById('closeGoalModal').addEventListener('click', closeGoalModal);
  document.getElementById('cancelGoal').addEventListener('click', closeGoalModal);
  document.getElementById('saveGoal').addEventListener('click', saveGoal);

  // Icon picker
  document.querySelectorAll('.icon-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.selectedIcon = opt.dataset.icon;
    });
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Transaction filters
  let searchTimer = null;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fetchAndRenderTransactions, 350);
  });

  document.getElementById('typeFilter')?.addEventListener('change', fetchAndRenderTransactions);
  document.getElementById('catFilter')?.addEventListener('change', fetchAndRenderTransactions);

  // Update period label
  updatePeriodLabel();

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      document.getElementById('sidebar')?.classList.remove('open');
    }
  });
});
