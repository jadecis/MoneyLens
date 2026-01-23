<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useOperationsStore } from '../stores/useOperationsStore.js';
import { fetchUserState, updateUserState } from '../services/operationsApi.js';

const auth = useAuthStore();
const ops = useOperationsStore();

const goals = ref([]);
const form = reactive({ id: null, name: '', target: '', saved: '' });
const contribution = reactive({ goalId: null, amount: '', from: 'Общий счет' });
const message = ref('');
const error = ref('');
const busy = ref(false);

async function loadGoals() {
  const login = auth.user?.value?.login || auth.user?.login;
  if (!login) {
    goals.value = [];
    return;
  }
  try {
    const resp = await fetchUserState(login);
    goals.value = Array.isArray(resp.goals) ? resp.goals : [];
  } catch {
    goals.value = [];
  }
}

async function persist() {
  const login = auth.user?.value?.login || auth.user?.login;
  if (!login) return;
  try {
    await updateUserState(login, { goals: goals.value });
  } catch {
    // ignore errors silently
  }
}

const enrichedGoals = computed(() =>
  goals.value.map((g) => ({
    ...g,
    target: Number(g.target) || 0,
    saved: Number(g.saved) || 0,
    progress: g.target ? Math.min(100, Math.round((Number(g.saved) / Number(g.target)) * 100)) : 0,
  })),
);

function resetForm() {
  form.id = null;
  form.name = '';
  form.target = '';
  form.saved = '';
}

function startEdit(goal) {
  form.id = goal.id;
  form.name = goal.name;
  form.target = goal.target;
  form.saved = goal.saved;
}

function removeGoal(id) {
  goals.value = goals.value.filter((g) => g.id !== id);
  persist();
  if (form.id === id) resetForm();
  message.value = 'Цель удалена';
}

async function handleSubmit() {
  error.value = '';
  message.value = '';
  if (!form.name.trim()) {
    error.value = 'Название цели обязательно';
    return;
  }
  const target = Number(form.target);
  if (!Number.isFinite(target) || target <= 0) {
    error.value = 'Целевой размер должен быть больше нуля';
    return;
  }
  const saved = Number(form.saved) || 0;
  const payload = { id: form.id || crypto.randomUUID(), name: form.name.trim(), target, saved };
  const idx = goals.value.findIndex((g) => g.id === payload.id);
  if (idx === -1) goals.value = [...goals.value, payload];
  else goals.value = goals.value.map((g) => (g.id === payload.id ? payload : g));
  persist();
  resetForm();
  message.value = 'Цель сохранена';
}

async function contributeToGoal(goal) {
  error.value = '';
  message.value = '';
  const amount = Number(contribution.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = 'Введите сумму взноса';
    return;
  }
  if (!contribution.from) {
    error.value = 'Укажите источник средств';
    return;
  }
  const gIndex = goals.value.findIndex((g) => g.id === goal.id);
  if (gIndex === -1) return;
  busy.value = true;
  try {
    // Оформляем как перевод между счетами, чтобы балансы обновились
    await ops.addOperation({
      type: 'transfer',
      amount,
      accountFrom: contribution.from,
      accountTo: goal.name,
      category: 'Цели',
      note: `Пополнение цели ${goal.name}`,
      date: new Date().toISOString().slice(0, 10),
    });
    const updated = { ...goals.value[gIndex], saved: (Number(goals.value[gIndex].saved) || 0) + amount };
    goals.value.splice(gIndex, 1, updated);
    persist();
    contribution.amount = '';
    message.value = 'Взнос зафиксирован';
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

const accountOptions = computed(() => {
  const set = new Set(['Общий счет', 'Копилка']);
  ops.accounts.value.forEach((a) => set.add(a.name));
  return Array.from(set);
});

onMounted(() => {
  loadGoals();
  if (!ops.operations.value.length && !ops.loading.value) {
    ops.loadOperations().catch(() => {});
  }
});

watch(
  () => auth.user?.value?.login || auth.user?.login,
  () => {
    loadGoals();
  },
);
</script>

<template>
  <main class="content">
    <section class="section-head">
      <p class="pill">Цели и копилки</p>
      <h2>Курс на достижения</h2>
      <p class="muted">Храните копилки, пополняйте их переводом со счетов и отслеживайте прогресс к целевым суммам.</p>
    </section>

    <div class="panel">
      <div class="panel-head">
        <h3>{{ form.id ? 'Редактирование цели' : 'Новая цель' }}</h3>
        <span class="chip">Цель · План · Факт</span>
      </div>
      <form class="form column" @submit.prevent="handleSubmit">
        <div class="operations-grid">
          <label class="field">
            <span>Название цели</span>
            <input v-model="form.name" type="text" placeholder="Подушка безопасности" required />
          </label>
          <label class="field">
            <span>Целевой размер</span>
            <input v-model="form.target" type="number" min="1" step="1" placeholder="150000" required />
          </label>
          <label class="field">
            <span>Уже накоплено (опционально)</span>
            <input v-model="form.saved" type="number" min="1" step="1" placeholder="0" />
          </label>
        </div>
        <div class="form-actions">
          <button class="primary" type="submit">{{ form.id ? 'Сохранить' : 'Добавить' }}</button>
          <button class="ghost" type="button" @click="resetForm">Сброс</button>
        </div>
      </form>
      <p v-if="message" class="chip success">{{ message }}</p>
      <p v-if="error" class="chip warning">{{ error }}</p>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Мои цели</h3>
        <span class="chip">{{ enrichedGoals.length }} активных</span>
      </div>
      <template v-if="!enrichedGoals.length">
        <p class="muted">Добавьте первую цель, чтобы начать копить.</p>
      </template>
      <div class="goal-list" v-else>
        <article v-for="goal in enrichedGoals" :key="goal.id" class="goal-card">
          <div class="goal-top">
            <div>
              <p class="strong">{{ goal.name }}</p>
              <p class="muted">{{ goal.saved.toLocaleString('ru-RU') }} / {{ goal.target.toLocaleString('ru-RU') }} в‚Ѕ</p>
            </div>
            <span class="chip">{{ goal.progress }}%</span>
          </div>
          <div class="progress">
            <div class="progress-fill" :style="{ width: `${goal.progress}%` }"></div>
          </div>
          <div class="operations-grid">
            <label class="field">
              <span>Счёт-источник</span>
              <select v-model="contribution.from">
                <option v-for="acc in accountOptions" :key="acc" :value="acc">{{ acc }}</option>
              </select>
            </label>
            <label class="field">
              <span>Сумма взноса</span>
              <input v-model="contribution.amount" type="number" min="1" step="1" placeholder="5000" />
            </label>
          </div>
          <div class="tx-actions">
            <button class="primary" type="button" :disabled="busy" @click="contributeToGoal(goal)">Пополнить</button>
            <button class="ghost" type="button" @click="startEdit(goal)">Редактировать</button>
            <button class="ghost danger" type="button" @click="removeGoal(goal.id)">Удалить</button>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>


