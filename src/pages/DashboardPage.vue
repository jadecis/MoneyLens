границы<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useOperationsStore } from '../stores/useOperationsStore.js';
import { fetchUserState } from '../services/operationsApi.js';

const auth = useAuthStore();
const ops = useOperationsStore();
const router = useRouter();

const goals = ref([]);
const budgets = ref([]);
const rangeFrom = ref('');
const rangeTo = ref('');
const colors = ['#22c55e', '#0ea5e9', '#a855f7', '#f97316', '#fbbf24', '#14b8a6', '#ef4444', '#6366f1'];

async function loadUserState() {
  const login = auth.user?.value?.login || auth.user?.login;
  if (!login) {
    goals.value = [];
    budgets.value = [];
    return;
  }
  try {
    const resp = await fetchUserState(login);
    goals.value = Array.isArray(resp.goals) ? resp.goals : [];
    budgets.value = Array.isArray(resp.budgets) ? resp.budgets : [];
  } catch {
    goals.value = [];
    budgets.value = [];
  }
}

onMounted(async () => {
  await loadUserState();
  if (!ops.operations.value.length && !ops.loading.value) {
    ops.loadOperations().catch(() => {});
  }
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 30);
  rangeFrom.value = from.toISOString().slice(0, 10);
  rangeTo.value = today.toISOString().slice(0, 10);
});

const accounts = computed(() => {
  if (ops.accounts.value.length) return ops.accounts.value;
  return [
    { name: 'Основной счет', balance: 0, inflow: 0, outflow: 0, change: 0 },
    { name: 'Копилка', balance: 0, inflow: 0, outflow: 0, change: 0 },
  ];
});

const totalBalance = computed(() => ops.totalBalance.value || 0);

const avgChange = computed(() => {
  if (!accounts.value.length) return 0;
  const sum = accounts.value.reduce((acc, item) => acc + (item.change || 0), 0);
  return Math.round(sum / accounts.value.length);
});

const netChange = computed(() => {
  const income = ops.totals.value.income;
  const expense = ops.totals.value.expense;
  if (!income && !expense) return 0;
  return Math.round(((income - expense) / Math.max(expense || income, 1)) * 100);
});

const goalsProgress = computed(() =>
  goals.value.map((g) => ({
    ...g,
    target: Number(g.target) || 0,
    saved: Number(g.saved) || 0,
    progress: g.target ? Math.min(100, Math.round((Number(g.saved) / Number(g.target)) * 100)) : 0,
  })),
);

const budgetsProgress = computed(() => {
  const usageMap = new Map();
  ops.categoryTotals.value.forEach((item) => usageMap.set(item.name, item.value));
  return budgets.value.map((b) => {
    const used = Math.round(usageMap.get(b.name) || 0);
    const limit = Math.round(Number(b.limit) || 0);
    const progress = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return { ...b, used, limit, progress };
  });
});

const recent = computed(() => ops.recentOperations.value);

const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

const formatDate = (value) =>
  new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });

const signedAmount = (op) => {
  if (op.type === 'income') return formatCurrency(op.amount);
  if (op.type === 'expense') return formatCurrency(-op.amount);
  return formatCurrency(0);
};

const opLabel = (op) => {
  if (op.type === 'income') return 'Доход';
  if (op.type === 'expense') return 'Расход';
  return 'Перевод';
};

const goTo = (name) => router.push({ name });

const filteredByRange = computed(() => {
  return ops.sortedOperations.value.filter((op) => {
    if (rangeFrom.value && new Date(op.date) < new Date(rangeFrom.value)) return false;
    if (rangeTo.value && new Date(op.date) > new Date(rangeTo.value)) return false;
    return true;
  });
});

function categoryBreakdown(type) {
  const map = new Map();
  let total = 0;
  filteredByRange.value.forEach((op) => {
    if (op.type !== type) return;
    const amount = Number(op.amount) || 0;
    total += amount;
    const key = op.category || 'Другое';
    map.set(key, (map.get(key) || 0) + amount);
  });
  const items = Array.from(map.entries())
    .map(([name, value]) => {
      const share = total ? value / total : 0;
      return {
        name,
        value,
        share,
        percent: Math.round(share * 100),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  return { total, items };
}

const incomeBreakdown = computed(() => categoryBreakdown('income'));
const expenseBreakdown = computed(() => categoryBreakdown('expense'));

function polarToCartesian(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'L', cx, cy, 'Z'].join(' ');
}

function describeFullCircle(cx, cy, r) {
  // два полуокружных сегмента, чтобы SVG корректно рендерил полный круг
  return [
    `M ${cx - r} ${cy}`,
    `a ${r} ${r} 0 1 0 ${r * 2} 0`,
    `a ${r} ${r} 0 1 0 ${-r * 2} 0`,
  ].join(' ');
}

function buildPie(breakdown) {
  const slices = [];
  let cumulative = 0;
  breakdown.items.forEach((item, idx) => {
    const angle = (item.share || 0) * 360;
    let start = cumulative;
    let end = cumulative + angle;
    let d;
    if (angle >= 359.9) {
      d = describeFullCircle(100, 100, 90);
      cumulative = start + 360;
    } else {
      d = describeArc(100, 100, 90, start, end);
      cumulative = end;
    }
    slices.push({
      name: item.name,
      value: item.value,
      percent: item.percent,
      share: item.share,
      d,
      color: colors[idx % colors.length],
    });
  });
  return slices;
}

const incomePie = computed(() => buildPie(incomeBreakdown.value));
const expensePie = computed(() => buildPie(expenseBreakdown.value));
</script>

<template>
  <main class="content dashboard">
    <section class="dashboard" id="dashboard">
      <div class="section-head">
        <p class="pill">Личный кабинет</p>
        <h2>Дашборд MoneyLens</h2>
        <p class="muted">
          Актуальные балансы, статистика по категориям, цели и последние операции синхронизированы с вашим профилем.
        </p>
      </div>

      <div class="dashboard-grid">
        <div class="panel kpi">
          <div class="panel-head">
            <h3>Общий баланс</h3>
            <span class="chip success">{{ netChange >= 0 ? '+' : '' }}{{ netChange }}% / мес</span>
          </div>
          <p class="kpi-value">{{ formatCurrency(totalBalance) }}</p>
          <p class="muted">По всем счетам и кошелькам</p>
          <div class="kpi-row">
            <div>
              <p class="label">Средний прирост</p>
              <p class="strong">{{ avgChange }}%</p>
            </div>
            <div>
              <p class="label">Всего счетов</p>
              <p class="strong">{{ accounts.length }}</p>
            </div>
          </div>
        </div>

        <div class="panel accounts clickable" role="button" tabindex="0" @click="goTo('accounts')">
          <div class="panel-head">
            <h3>Счета</h3>
            <span class="chip">Динамика</span>
          </div>
          <div class="account-list">
            <article v-for="account in accounts" :key="account.name" class="account-card">
              <div>
                <p class="muted">{{ account.name }}</p>
                <p class="balance-value">{{ formatCurrency(account.balance) }}</p>
              </div>
              <span :class="['chip', account.change >= 0 ? 'success' : 'warning']">
                {{ account.change >= 0 ? '+' : '' }}{{ account.change }}%
              </span>
            </article>
          </div>
        </div>

        <div class="panel goals clickable" role="button" tabindex="0" @click="goTo('goals')">
          <div class="panel-head">
            <h3>Цели и копилки</h3>
            <span class="chip">{{ goalsProgress.length || 0 }} активных</span>
          </div>
          <template v-if="!goalsProgress.length">
            <p class="muted">Добавьте цели во вкладке «Цели».</p>
          </template>
          <div class="goal-list" v-else>
            <article v-for="goal in goalsProgress" :key="goal.id" class="goal-card">
              <div class="goal-top">
                <p class="strong">{{ goal.name }}</p>
                <p class="muted">{{ formatCurrency(goal.saved) }} / {{ formatCurrency(goal.target) }}</p>
              </div>
              <div class="progress">
                <div class="progress-fill" :style="{ width: `${goal.progress}%` }"></div>
              </div>
            </article>
          </div>
        </div>

        <div class="panel budgets clickable" role="button" tabindex="0" @click="goTo('budgets')">
          <div class="panel-head">
            <h3>Бюджеты по категориям</h3>
            <span class="chip">{{ budgetsProgress.length || 0 }} активных</span>
          </div>
          <template v-if="!budgetsProgress.length">
            <p class="muted">Создайте бюджеты на вкладке «Бюджеты», чтобы отслеживать траты.</p>
          </template>
          <div class="budget-list" v-else>
            <article v-for="item in budgetsProgress" :key="item.id" class="budget-card">
              <div class="budget-top">
                <p class="strong">{{ item.name }}</p>
                <p class="muted">{{ formatCurrency(item.used) }} / {{ formatCurrency(item.limit) }}</p>
              </div>
              <div class="progress thin">
                <div class="progress-fill alt" :style="{ width: `${item.progress}%` }"></div>
              </div>
            </article>
          </div>
        </div>

        <div class="panel transactions clickable" role="button" tabindex="0" @click="goTo('operations')">
          <div class="panel-head">
            <h3>Последние операции</h3>
            <span class="chip">{{ recent.length ? 'Обновлено' : 'Ожидает данных' }}</span>
          </div>
          <template v-if="!recent.length">
            <p class="muted">Добавьте операции, чтобы видеть ленту транзакций.</p>
          </template>
          <ul class="transaction-list" v-else>
            <li v-for="tx in recent" :key="tx.id" class="transaction">
              <div>
                <p class="strong">{{ tx.category }}</p>
                <p class="muted tiny">
                  {{ opLabel(tx) }} ·
                  <template v-if="tx.type === 'transfer'">
                    {{ tx.accountFrom }} → {{ tx.accountTo }}
                  </template>
                  <template v-else>
                    {{ tx.account }}
                  </template>
                  · {{ formatDate(tx.date) }}
                </p>
              </div>
              <p :class="['amount', tx.type === 'income' ? 'positive' : tx.type === 'expense' ? 'negative' : 'neutral']">
                {{ signedAmount(tx) }}
              </p>
            </li>
          </ul>
        </div>

        <div class="panel charts charts-filter">
          <div class="panel-head">
            <h3>Диапазон анализа</h3>
            <span class="chip">Период</span>
          </div>
          <div class="filters-grid">
            <label class="field">
              <span>С</span>
              <input v-model="rangeFrom" type="date" />
            </label>
            <label class="field">
              <span>По</span>
              <input v-model="rangeTo" type="date" />
            </label>
          </div>
        </div>

        <div class="panel charts">
          <div class="panel-head">
            <h3>Доходы по категориям</h3>
            <span class="chip">{{ incomeBreakdown.total ? formatCurrency(incomeBreakdown.total) : 'Нет данных' }}</span>
          </div>
          <div v-if="!incomeBreakdown.items.length || !incomeBreakdown.total" class="muted">Нет доходов в выбранном периоде.</div>
          <div v-else class="pie-wrap">
            <svg viewBox="0 0 200 200" class="pie">
              <circle cx="100" cy="100" r="92" fill="var(--color-card)" />
              <template v-for="slice in incomePie" :key="slice.name">
                <path :d="slice.d" :fill="slice.color" opacity="0.92" />
              </template>
              <circle cx="100" cy="100" r="48" fill="var(--color-card)" />
              <text x="100" y="95" text-anchor="middle" class="pie-total">{{ formatCurrency(incomeBreakdown.total) }}</text>
              <text x="100" y="115" text-anchor="middle" class="pie-sub">Доходы</text>
            </svg>
            <div class="chart-legend">
              <div v-for="slice in incomePie" :key="slice.name" class="legend-row">
                <span class="legend-dot" :style="{ background: slice.color }"></span>
                <div class="legend-text">
                  <p class="strong legend-name">{{ slice.name }}</p>
                  <p class="muted tiny">
                    {{ formatCurrency(slice.value) }} · {{ Math.round(slice.percent || (slice.share || 0) * 100) }}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel charts">
          <div class="panel-head">
            <h3>Расходы по категориям</h3>
            <span class="chip">{{ expenseBreakdown.total ? formatCurrency(expenseBreakdown.total) : 'Нет данных' }}</span>
          </div>
          <div v-if="!expenseBreakdown.items.length || !expenseBreakdown.total" class="muted">Нет расходов в выбранном периоде.</div>
          <div v-else class="pie-wrap">
            <svg viewBox="0 0 200 200" class="pie">
              <circle cx="100" cy="100" r="92" fill="var(--color-card)" />
              <template v-for="slice in expensePie" :key="slice.name">
                <path :d="slice.d" :fill="slice.color" opacity="0.92" />
              </template>
              <circle cx="100" cy="100" r="48" fill="var(--color-card)" />
              <text x="100" y="95" text-anchor="middle" class="pie-total">{{ formatCurrency(expenseBreakdown.total) }}</text>
              <text x="100" y="115" text-anchor="middle" class="pie-sub">Расходы</text>
            </svg>
            <div class="chart-legend">
              <div v-for="slice in expensePie" :key="slice.name" class="legend-row">
                <span class="legend-dot" :style="{ background: slice.color }"></span>
                <div class="legend-text">
                  <p class="strong legend-name">{{ slice.name }}</p>
                  <p class="muted tiny">
                    {{ formatCurrency(slice.value) }} · {{ Math.round(slice.percent || (slice.share || 0) * 100) }}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
