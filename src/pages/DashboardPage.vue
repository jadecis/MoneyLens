<script setup>
import { computed, ref } from 'vue';

const accounts = ref([
  { name: 'Основной счет', balance: 128400, change: 12 },
  { name: 'Накопления', balance: 342000, change: 3 },
  { name: 'Карта трат', balance: 48200, change: -4 },
]);

const transactions = ref([
  { title: 'Продукты', amount: -3200, category: 'Дом', date: 'Сегодня' },
  { title: 'Кофе с друзьями', amount: -780, category: 'Досуг', date: 'Сегодня' },
  { title: 'Зарплата', amount: 180000, category: 'Доход', date: 'Вчера' },
  { title: 'Подписки', amount: -990, category: 'Сервисы', date: 'Вчера' },
  { title: 'Такси', amount: -620, category: 'Транспорт', date: 'Пн' },
]);

const goals = ref([
  { name: 'Резерв на 3 месяца', target: 360000, current: 240000 },
  { name: 'Путешествие', target: 180000, current: 62000 },
  { name: 'Обновление техники', target: 90000, current: 22000 },
]);

const budgets = ref([
  { name: 'Продукты', used: 48, limit: 70 },
  { name: 'Транспорт', used: 32, limit: 50 },
  { name: 'Развлечения', used: 18, limit: 40 },
]);

const totalBalance = computed(() =>
  accounts.value.reduce((sum, account) => sum + account.balance, 0),
);

const avgChange = computed(() => {
  if (!accounts.value.length) return 0;
  const sum = accounts.value.reduce((acc, item) => acc + item.change, 0);
  return Math.round(sum / accounts.value.length);
});

const goalsProgress = computed(() => {
  const totals = goals.value.reduce(
    (acc, goal) => {
      acc.current += goal.current;
      acc.target += goal.target;
      return acc;
    },
    { current: 0, target: 0 },
  );
  return totals.target ? Math.round((totals.current / totals.target) * 100) : 0;
});

const formatCurrency = (amount) =>
  amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
</script>

<template>
  <main class="content dashboard">
    <section class="dashboard" id="dashboard">
      <div class="section-head">
        <p class="pill">Личный кабинет</p>
        <h2>Финансовая панель MoneyLens</h2>
        <p class="muted">
          Балансы, операции, цели и бюджеты — все в одном окне. Настраивайте, отслеживайте, анализируйте.
        </p>
      </div>

      <div class="dashboard-grid">
        <div class="panel kpi">
          <div class="panel-head">
            <h3>Общий баланс</h3>
            <span class="chip success">+{{ avgChange }}% / мес</span>
          </div>
          <p class="kpi-value">{{ formatCurrency(totalBalance) }}</p>
          <p class="muted">По всем счетам и кошелькам</p>
          <div class="kpi-row">
            <div>
              <p class="label">Цели закрыты</p>
              <p class="strong">{{ goalsProgress }}%</p>
            </div>
            <div>
              <p class="label">Всего счетов</p>
              <p class="strong">{{ accounts.length }}</p>
            </div>
          </div>
        </div>

        <div class="panel accounts">
          <div class="panel-head">
            <h3>Счета</h3>
            <span class="chip">Ликвидность</span>
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

        <div class="panel goals">
          <div class="panel-head">
            <h3>Цели и копилки</h3>
            <span class="chip">Прогресс</span>
          </div>
          <div class="goal-list">
            <article v-for="goal in goals" :key="goal.name" class="goal-card">
              <div class="goal-top">
                <p class="strong">{{ goal.name }}</p>
                <p class="muted">{{ formatCurrency(goal.current) }} / {{ formatCurrency(goal.target) }}</p>
              </div>
              <div class="progress">
                <div
                  class="progress-fill"
                  :style="{ width: `${Math.min(100, Math.round((goal.current / goal.target) * 100))}%` }"
                ></div>
              </div>
            </article>
          </div>
        </div>

        <div class="panel budgets">
          <div class="panel-head">
            <h3>Бюджеты по категориям</h3>
            <span class="chip">Контроль</span>
          </div>
          <div class="budget-list">
            <article v-for="item in budgets" :key="item.name" class="budget-card">
              <div class="budget-top">
                <p class="strong">{{ item.name }}</p>
                <p class="muted">{{ item.used }} / {{ item.limit }} тыс ₽</p>
              </div>
              <div class="progress thin">
                <div
                  class="progress-fill alt"
                  :style="{ width: `${Math.min(100, Math.round((item.used / item.limit) * 100))}%` }"
                ></div>
              </div>
            </article>
          </div>
        </div>

        <div class="panel transactions">
          <div class="panel-head">
            <h3>Последние операции</h3>
            <span class="chip">Сегодня</span>
          </div>
          <ul class="transaction-list">
            <li v-for="tx in transactions" :key="tx.title + tx.date" class="transaction">
              <div>
                <p class="strong">{{ tx.title }}</p>
                <p class="muted tiny">{{ tx.category }} · {{ tx.date }}</p>
              </div>
              <p :class="['amount', tx.amount >= 0 ? 'positive' : 'negative']">
                {{ formatCurrency(tx.amount) }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </main>
</template>
