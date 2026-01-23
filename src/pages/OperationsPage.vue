<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useOperationsStore } from '../stores/useOperationsStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { watch } from 'vue';
import { fetchUserState } from '../services/operationsApi.js';

const operations = useOperationsStore();
const auth = useAuthStore();

const typeOptions = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
  { value: 'transfer', label: 'Перевод' },
];

const categoryPresets = {
  expense: ['Продукты', 'Транспорт', 'Кафе', 'Подписки', 'Жилье', 'Здоровье', 'Другое'],
  income: ['Зарплата', 'Премия', 'Подарок', 'Проценты', 'Инвестиции', 'Другое'],
  transfer: ['Перевод между счетами'],
};

const defaultForm = () => ({
  id: null,
  type: 'expense',
  amount: '',
  account: operations.accountsList.value[0] || 'Общий счет',
  accountFrom: operations.accountsList.value[0] || 'Общий счет',
  accountTo: operations.accountsList.value[1] || operations.accountsList.value[0] || 'Общий счет',
  category: 'Продукты',
  note: '',
  date: new Date().toISOString().slice(0, 10),
});

const form = reactive(defaultForm());
const message = ref('');
const error = ref('');
const isSaving = ref(false);
const budgets = ref([]);

const isTransfer = computed(() => form.type === 'transfer');
const isEditing = computed(() => Boolean(form.id));

const accountOptions = computed(() =>
  operations.accountsList.value.length ? operations.accountsList.value : ['Общий счет'],
);

const categories = computed(() => {
  const base = categoryPresets[form.type] || categoryPresets.expense;
  if (form.type === 'expense') {
    const budgetNames = budgets.value.map((b) => b.name).filter(Boolean);
    return Array.from(new Set([...budgetNames, ...base]));
  }
  return base;
});

const sorted = computed(() => operations.sortedOperations.value);

const categoryOptions = computed(() => {
  const set = new Set();
  operations.operations.value.forEach((op) => {
    if (op.category) set.add(op.category);
  });
  budgets.value.forEach((b) => b.name && set.add(b.name));
  // fallback presets
  Object.values(categoryPresets).flat().forEach((c) => set.add(c));
  return Array.from(set);
});

const filters = reactive({
  type: 'all',
  account: 'all',
  category: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
});

async function loadBudgets() {
  const login = auth.user?.value?.login || auth.user?.login;
  if (!login) {
    budgets.value = [];
    return;
  }
  try {
    const resp = await fetchUserState(login);
    budgets.value = Array.isArray(resp.budgets) ? resp.budgets : [];
  } catch {
    budgets.value = [];
  }
}

const filtered = computed(() => {
  return sorted.value.filter((op) => {
    if (filters.type !== 'all' && op.type !== filters.type) return false;
    if (filters.account !== 'all') {
      if (op.type === 'transfer') {
        if (op.accountFrom !== filters.account && op.accountTo !== filters.account) return false;
      } else if (op.account !== filters.account) {
        return false;
      }
    }
    if (filters.category !== 'all' && op.category !== filters.category) return false;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const hay = `${op.category} ${op.note || ''} ${op.account || ''} ${op.accountFrom || ''} ${op.accountTo || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.dateFrom && new Date(op.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(op.date) > new Date(filters.dateTo)) return false;
    return true;
  });
});

const formatCurrency = (amount) =>
  (amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

const formatDate = (value) =>
  new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });

const signedAmount = (op) => {
  if (op.type === 'income') return formatCurrency(op.amount);
  if (op.type === 'expense') return formatCurrency(-op.amount);
  return formatCurrency(0);
};

function resetForm() {
  Object.assign(form, defaultForm());
}

function startEdit(op) {
  message.value = '';
  error.value = '';
  Object.assign(form, {
    id: op.id,
    type: op.type,
    amount: op.amount,
    account: op.account || 'Основной счет',
    accountFrom: op.accountFrom || 'Основной счет',
    accountTo: op.accountTo || 'Накопления',
    category: op.category || 'Другое',
    note: op.note || '',
    date: op.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  });
}

async function remove(op) {
  message.value = '';
  error.value = '';
  try {
    await operations.deleteOperation(op.id);
    message.value = 'Операция удалена';
    if (isEditing.value && form.id === op.id) resetForm();
  } catch (err) {
    error.value = err.message;
  }
}

async function handleSubmit() {
  error.value = '';
  message.value = '';
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'Введите корректную сумму';
    return;
  }

  const payload =
    form.type === 'transfer'
      ? {
          type: 'transfer',
          amount,
          accountFrom: form.accountFrom,
          accountTo: form.accountTo,
          category: form.category || 'Перевод',
          note: form.note,
          date: form.date,
        }
      : {
          type: form.type,
          amount,
          account: form.account,
          category: form.category,
          note: form.note,
          date: form.date,
        };

  isSaving.value = true;
  try {
    if (isEditing.value) {
      await operations.updateOperation(form.id, payload);
      message.value = 'Операция обновлена';
    } else {
      await operations.addOperation(payload);
      message.value = 'Операция добавлена';
    }
    resetForm();
  } catch (err) {
    error.value = err.message;
  } finally {
    isSaving.value = false;
  }
}

onMounted(async () => {
  await loadBudgets();
  if (!operations.operations.value.length && !operations.loading.value) {
    operations.loadOperations().catch(() => {});
  }
});

watch(
  () => accountOptions.value,
  (options) => {
    const first = options[0] || 'Общий счет';
    if (!options.includes(form.account)) form.account = first;
    if (!options.includes(form.accountFrom)) form.accountFrom = first;
    if (!options.includes(form.accountTo)) form.accountTo = options[1] || first;
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <main class="content">
    <section class="section-head">
      <p class="pill">Операции</p>
      <h2>Добавление, редактирование и контроль</h2>
      <p class="muted">
        Фиксируйте доходы, расходы и переводы между счетами. Все операции сохраняются в ваш файл пользователя и
        подтягиваются при повторном входе.
      </p>
    </section>

    <div class="panel">
      <div class="panel-head">
        <h3>{{ isEditing ? 'Редактирование операции' : 'Новая операция' }}</h3>
        <span class="chip">{{ isEditing ? 'Режим правки' : 'Быстрое добавление' }}</span>
      </div>

      <form class="form column" @submit.prevent="handleSubmit">
        <div class="type-switch">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            :class="['ghost', form.type === option.value ? 'active' : '']"
            @click="form.type = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="operations-grid">
          <label class="field">
            <span>Дата</span>
            <input v-model="form.date" type="date" required />
          </label>

          <label class="field">
            <span>Сумма</span>
            <input v-model="form.amount" type="number" min="1" step="1" placeholder="0" required />
          </label>

          <label v-if="!isTransfer" class="field">
            <span>Счет</span>
            <select v-model="form.account">
              <option v-for="acc in accountOptions" :key="acc" :value="acc">{{ acc }}</option>
            </select>
          </label>

          <label v-if="isTransfer" class="field">
            <span>Со счета</span>
            <select v-model="form.accountFrom">
              <option v-for="acc in accountOptions" :key="`from-${acc}`" :value="acc">{{ acc }}</option>
            </select>
          </label>

          <label v-if="isTransfer" class="field">
            <span>На счет</span>
            <select v-model="form.accountTo">
              <option v-for="acc in accountOptions" :key="`to-${acc}`" :value="acc">{{ acc }}</option>
            </select>
          </label>

          <label class="field">
            <span>Категория</span>
            <select v-model="form.category">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </label>

          <label class="field full">
            <span>Комментарий (опционально)</span>
            <textarea v-model="form.note" rows="2" placeholder="Чек, ссылка или заметка"></textarea>
          </label>
        </div>

        <div class="form-actions">
          <button class="primary" type="submit" :disabled="isSaving">
            {{ isEditing ? 'Сохранить изменения' : 'Добавить операцию' }}
          </button>
          <button class="ghost" type="button" @click="resetForm" :disabled="isSaving">Сбросить</button>
        </div>
      </form>

      <p v-if="message" class="chip success">{{ message }}</p>
      <p v-if="error" class="chip warning">{{ error }}</p>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Ваши операции</h3>
        <span class="chip">{{ filtered.length }} записей</span>
      </div>

      <div class="filters">
        <div class="filters-grid">
          <label class="field">
            <span>Тип</span>
            <select v-model="filters.type">
              <option value="all">Все</option>
              <option value="income">Доходы</option>
              <option value="expense">Расходы</option>
              <option value="transfer">Переводы</option>
            </select>
          </label>
          <label class="field">
            <span>Счет</span>
            <select v-model="filters.account">
              <option value="all">Все</option>
              <option v-for="acc in accountOptions" :key="`f-${acc}`" :value="acc">{{ acc }}</option>
            </select>
          </label>
          <label class="field">
            <span>Категория</span>
            <select v-model="filters.category">
              <option value="all">Все</option>
              <option v-for="cat in categoryOptions" :key="`cat-${cat}`" :value="cat">{{ cat }}</option>
            </select>
          </label>
          <label class="field">
            <span>С</span>
            <input v-model="filters.dateFrom" type="date" />
          </label>
          <label class="field">
            <span>По</span>
            <input v-model="filters.dateTo" type="date" />
          </label>
          <label class="field full">
            <span>Поиск</span>
            <input v-model="filters.search" type="search" placeholder="Категория, заметка, счет..." />
          </label>
        </div>
      </div>

      <template v-if="!sorted.length && !operations.loading.value">
        <p class="muted">Пока пусто. Добавьте первую операцию, чтобы увидеть историю.</p>
      </template>

      <ul class="transaction-list manage" v-else>
        <li v-for="op in filtered" :key="op.id" class="transaction">
          <div>
            <p class="strong">{{ op.category }}</p>
            <p class="muted tiny">
              {{ op.type === 'income' ? 'Доход' : op.type === 'expense' ? 'Расход' : 'Перевод' }}
              ·
              <template v-if="op.type === 'transfer'">
                {{ op.accountFrom }} → {{ op.accountTo }}
              </template>
              <template v-else>
                {{ op.account }}
              </template>
              · {{ formatDate(op.date) }}
            </p>
            <p v-if="op.note" class="muted tiny">{{ op.note }}</p>
          </div>
          <div class="tx-actions">
            <p
              :class="['amount', op.type === 'income' ? 'positive' : op.type === 'expense' ? 'negative' : 'neutral']"
            >
              {{ signedAmount(op) }}
            </p>
            <button class="ghost" type="button" @click="startEdit(op)">Редактировать</button>
            <button class="ghost danger" type="button" @click="remove(op)">Удалить</button>
          </div>
        </li>
      </ul>
    </div>
  </main>
</template>
