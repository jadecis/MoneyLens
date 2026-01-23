<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useOperationsStore } from '../stores/useOperationsStore.js';

const ops = useOperationsStore();

onMounted(() => {
  if (!ops.operations.value.length && !ops.loading.value) {
    ops.loadOperations().catch(() => {});
  }
});

const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

const accounts = computed(() => ops.accounts.value);
const totalBalance = computed(() => ops.totalBalance.value || 0);

const accountOptions = computed(() => (ops.accountsList.value.length ? ops.accountsList.value : ['Общий счет']));

const createForm = reactive({
  name: '',
  balance: '',
});

const transferForm = reactive({
  from: '',
  to: '',
  amount: '',
});

const quickForm = reactive({
  account: '',
  amount: '',
  type: 'income',
});

const message = ref('');
const error = ref('');
const busy = ref(false);
const deleting = ref('');

function resetForms() {
  createForm.name = '';
  createForm.balance = '';
  const first = accountOptions.value[0] || 'Общий счет';
  transferForm.from = first;
  transferForm.to = accountOptions.value[1] || first;
  transferForm.amount = '';
  quickForm.account = first;
  quickForm.amount = '';
  quickForm.type = 'income';
}

async function handleCreateAccount() {
  message.value = '';
  error.value = '';
  if (!createForm.name.trim()) {
    error.value = 'Введите название счета';
    return;
  }
  const amount = Number(createForm.balance) || 0;
  busy.value = true;
  try {
    ops.addAccountName(createForm.name.trim());
    if (amount > 0) {
      await ops.addOperation({
        type: 'income',
        amount,
        account: createForm.name.trim(),
        category: 'Открытие счета',
        note: 'Начальный баланс',
        date: new Date().toISOString().slice(0, 10),
      });
    }
    message.value = 'Счет создан';
    resetForms();
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function handleQuickOp() {
  message.value = '';
  error.value = '';
  const amount = Number(quickForm.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'Укажите сумму больше нуля';
    return;
  }
  if (!quickForm.account) {
    error.value = 'Выберите счет';
    return;
  }
  busy.value = true;
  try {
    await ops.addOperation({
      type: quickForm.type,
      amount,
      account: quickForm.account,
      category: quickForm.type === 'income' ? 'Пополнение' : 'Списание',
      note: 'Быстрая операция со страницы Счета',
      date: new Date().toISOString().slice(0, 10),
    });
    message.value = 'Операция сохранена';
    quickForm.amount = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function handleTransfer() {
  message.value = '';
  error.value = '';
  const amount = Number(transferForm.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'Сумма должна быть больше нуля';
    return;
  }
  if (!transferForm.from || !transferForm.to || transferForm.from === transferForm.to) {
    error.value = 'Выберите разные счета';
    return;
  }
  busy.value = true;
  try {
    await ops.addOperation({
      type: 'transfer',
      amount,
      accountFrom: transferForm.from,
      accountTo: transferForm.to,
      category: 'Перевод между счетами',
      note: 'Со страницы Счета',
      date: new Date().toISOString().slice(0, 10),
    });
    message.value = 'Перевод выполнен';
    transferForm.amount = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function removeAccount(name) {
  if (!name) return;
  const confirmed = window.confirm(`Удалить счет «${name}» и все связанные операции?`);
  if (!confirmed) return;
  message.value = '';
  error.value = '';
  deleting.value = name;
  try {
    await ops.deleteAccount(name);
    message.value = `Счет «${name}» удален`;
  } catch (err) {
    error.value = err.message;
  } finally {
    deleting.value = '';
  }
}

resetForms();
</script>

<template>
  <main class="content">
    <section class="section-head">
      <p class="pill">Счета</p>
      <h2>Балансы и быстрые операции</h2>
      <p class="muted">
        Создавайте счета, пополняйте, списывайте и переводите между ними. Все изменения синхронизируются с вашим
        профилем и дашбордом.
      </p>
    </section>

    <div class="panel kpi">
      <div class="panel-head">
        <h3>Общий баланс</h3>
        <span class="chip">Live</span>
      </div>
      <p class="kpi-value">{{ formatCurrency(totalBalance) }}</p>
      <p class="muted">Сумма по всем счетам</p>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Счета</h3>
        <span class="chip">{{ accounts.length }} активных</span>
      </div>
      <template v-if="!accounts.length">
        <p class="muted">Добавьте первый счет, чтобы начать учитывать балансы.</p>
      </template>
      <div class="account-list" v-else>
        <article v-for="acc in accounts" :key="acc.name" class="account-card">
          <div>
            <p class="muted">{{ acc.name }}</p>
            <p class="balance-value">{{ formatCurrency(acc.balance) }}</p>
          </div>
          <span :class="['chip', acc.change >= 0 ? 'success' : 'warning']">
            {{ acc.change >= 0 ? '+' : '' }}{{ acc.change }}%
          </span>
          <button
            class="ghost danger"
            type="button"
            :disabled="deleting === acc.name || busy"
            @click="removeAccount(acc.name)"
          >
            {{ deleting === acc.name ? 'Удаляем...' : 'Удалить' }}
          </button>
        </article>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Создать счет</h3>
        <span class="chip">Новый</span>
      </div>
      <form class="form column" @submit.prevent="handleCreateAccount">
        <div class="operations-grid">
          <label class="field">
            <span>Название счета</span>
            <input v-model="createForm.name" type="text" placeholder="Напр., Копилка" required />
          </label>
          <label class="field">
            <span>Начальный баланс (опционально)</span>
            <input v-model="createForm.balance" type="number" min="1" step="1" placeholder="0" />
          </label>
        </div>
        <div class="form-actions">
          <button class="primary" type="submit" :disabled="busy">Создать</button>
          <button class="ghost" type="button" @click="resetForms" :disabled="busy">Сбросить</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Быстрая операция по счету</h3>
        <span class="chip">Пополнение / списание</span>
      </div>
      <form class="form column" @submit.prevent="handleQuickOp">
        <div class="operations-grid">
          <label class="field">
            <span>Счет</span>
            <select v-model="quickForm.account">
              <option v-for="acc in accountOptions" :key="acc" :value="acc">{{ acc }}</option>
            </select>
          </label>
          <label class="field">
            <span>Тип</span>
            <select v-model="quickForm.type">
              <option value="income">Пополнение</option>
              <option value="expense">Списание</option>
            </select>
          </label>
          <label class="field">
            <span>Сумма</span>
            <input v-model="quickForm.amount" type="number" min="1" step="1" placeholder="0" required />
          </label>
        </div>
        <div class="form-actions">
          <button class="primary" type="submit" :disabled="busy">Сохранить</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Перевод между счетами</h3>
        <span class="chip">Мгновенно</span>
      </div>
      <form class="form column" @submit.prevent="handleTransfer">
        <div class="operations-grid">
          <label class="field">
            <span>Со счета</span>
            <select v-model="transferForm.from">
              <option v-for="acc in accountOptions" :key="`from-${acc}`" :value="acc">{{ acc }}</option>
            </select>
          </label>
          <label class="field">
            <span>На счет</span>
            <select v-model="transferForm.to">
              <option v-for="acc in accountOptions" :key="`to-${acc}`" :value="acc">{{ acc }}</option>
            </select>
          </label>
          <label class="field">
            <span>Сумма</span>
            <input v-model="transferForm.amount" type="number" min="1" step="1" placeholder="0" required />
          </label>
        </div>
        <div class="form-actions">
          <button class="primary" type="submit" :disabled="busy">Перевести</button>
        </div>
      </form>
    </div>

    <p v-if="message" class="chip success">{{ message }}</p>
    <p v-if="error" class="chip warning">{{ error }}</p>
  </main>
</template>
