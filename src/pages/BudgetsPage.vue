<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useOperationsStore } from '../stores/useOperationsStore.js';

const auth = useAuthStore();
const ops = useOperationsStore();

const storageKey = computed(() => `ml-budgets-${auth.user?.value?.login || auth.user?.login || 'guest'}`);

const budgets = ref([]);
const form = reactive({ id: null, name: '', limit: '' });
const message = ref('');
const error = ref('');
const isSaving = ref(false);

const categoryUsage = computed(() => {
  const map = new Map();
  ops.categoryTotals.value.forEach((item) => map.set(item.name, item.value));
  return map;
});

const enhancedBudgets = computed(() =>
  budgets.value.map((b) => ({
    ...b,
    used: Math.round(categoryUsage.value.get(b.name) || 0),
    progress: b.limit ? Math.min(100, Math.round(((categoryUsage.value.get(b.name) || 0) / b.limit) * 100)) : 0,
  })),
);

function loadBudgets() {
  try {
    const raw = localStorage.getItem(storageKey.value);
    budgets.value = raw ? JSON.parse(raw) : [];
  } catch {
    budgets.value = [];
  }
}

function persist() {
  localStorage.setItem(storageKey.value, JSON.stringify(budgets.value));
}

function resetForm() {
  form.id = null;
  form.name = '';
  form.limit = '';
}

function startEdit(budget) {
  form.id = budget.id;
  form.name = budget.name;
  form.limit = budget.limit;
}

function removeBudget(id) {
  budgets.value = budgets.value.filter((b) => b.id !== id);
  persist();
  message.value = 'Бюджет удален';
  if (form.id === id) resetForm();
}

async function handleSubmit() {
  message.value = '';
  error.value = '';
  if (!form.name.trim()) {
    error.value = 'Укажите категорию';
    return;
  }
  const limit = Number(form.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    error.value = 'Лимит должен быть больше нуля';
    return;
  }
  isSaving.value = true;
  const payload = { id: form.id || crypto.randomUUID(), name: form.name.trim(), limit: Math.round(limit) };
  const exists = budgets.value.findIndex((b) => b.id === payload.id);
  if (exists === -1) budgets.value = [...budgets.value, payload];
  else budgets.value = budgets.value.map((b) => (b.id === payload.id ? payload : b));
  persist();
  resetForm();
  message.value = 'Бюджет сохранен';
  isSaving.value = false;
}

onMounted(() => {
  loadBudgets();
  if (!ops.operations.value.length && !ops.loading.value) {
    ops.loadOperations().catch(() => {});
  }
});
</script>

<template>
  <main class="content">
    <section class="section-head">
      <p class="pill">Бюджеты</p>
      <h2>Лимиты по категориям</h2>
      <p class="muted">
        Назначайте лимиты на категории расходов и отслеживайте использование в реальном времени по сохраненным операциям.
      </p>
    </section>

    <div class="panel">
      <div class="panel-head">
        <h3>{{ form.id ? 'Редактирование бюджета' : 'Новый бюджет' }}</h3>
        <span class="chip">Категория · Лимит</span>
      </div>
      <form class="form column" @submit.prevent="handleSubmit">
        <div class="operations-grid">
          <label class="field">
            <span>Категория</span>
            <input v-model="form.name" type="text" placeholder="Напр., Продукты" required />
          </label>
          <label class="field">
            <span>Лимит в месяц</span>
            <input v-model="form.limit" type="number" min="0" step="100" placeholder="30000" required />
          </label>
        </div>
        <div class="form-actions">
          <button class="primary" type="submit" :disabled="isSaving">{{ form.id ? 'Сохранить' : 'Добавить' }}</button>
          <button class="ghost" type="button" @click="resetForm" :disabled="isSaving">Сброс</button>
        </div>
      </form>
      <p v-if="message" class="chip success">{{ message }}</p>
      <p v-if="error" class="chip warning">{{ error }}</p>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Текущие бюджеты</h3>
        <span class="chip">{{ enhancedBudgets.length }} категорий</span>
      </div>
      <template v-if="!enhancedBudgets.length">
        <p class="muted">Добавьте лимит, чтобы начать контроль расходов.</p>
      </template>
      <div class="budget-list" v-else>
        <article v-for="item in enhancedBudgets" :key="item.id" class="budget-card">
          <div class="budget-top">
            <p class="strong">{{ item.name }}</p>
            <p class="muted">{{ item.used.toLocaleString('ru-RU') }} / {{ item.limit.toLocaleString('ru-RU') }} ₽</p>
          </div>
          <div class="progress thin">
            <div class="progress-fill alt" :style="{ width: `${item.progress}%` }"></div>
          </div>
          <div class="tx-actions">
            <button class="ghost" type="button" @click="startEdit(item)">Редактировать</button>
            <button class="ghost danger" type="button" @click="removeBudget(item.id)">Удалить</button>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
