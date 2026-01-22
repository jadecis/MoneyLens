<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import $ from 'jquery';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';

const auth = useAuthStore();
const router = useRouter();

const formState = ref({
  name: '',
  phone: '',
  email: '',
  password: '',
});

const status = ref('');
const error = ref('');
const fieldErrors = ref({});

const userLogin = computed(() => auth.user?.value?.login || auth.user?.login || auth.user?.login);

function fillFromStore() {
  const profile = auth.user?.value?.profile || auth.user?.profile || {};
  formState.value = {
    name: profile.name || '',
    phone: profile.phone || '',
    email: profile.email || '',
    password: '',
  };
  $('#name').val(formState.value.name);
  $('#phone').val(formState.value.phone);
  $('#email').val(formState.value.email);
  $('#password').val('');
}

function validateFields(fields) {
  fieldErrors.value = {};
  if (!fields.name.trim()) {
    fieldErrors.value.name = 'Укажите ФИО.';
    return false;
  }
  if (!fields.phone.trim()) {
    fieldErrors.value.phone = 'Укажите номер телефона.';
    return false;
  }
  const phoneDigits = fields.phone.replace(/\D/g, '');
  if (phoneDigits.length < 8) {
    fieldErrors.value.phone = 'Телефон должен содержать минимум 8 цифр.';
    return false;
  }
  if (fields.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email)) {
    fieldErrors.value.email = 'Укажите корректный email.';
    return false;
  }
  if (fields.password && fields.password.length < 6) {
    fieldErrors.value.password = 'Пароль должен быть не короче 6 символов.';
    return false;
  }
  error.value = '';
  return true;
}

async function submitProfile(e) {
  e.preventDefault();
  const payload = {
    name: $('#name').val() || '',
    phone: $('#phone').val() || '',
    email: $('#email').val() || '',
    password: $('#password').val() || '',
  };
  if (!validateFields(payload)) return;
  try {
    status.value = 'Сохраняем...';
    await auth.updateProfile(payload);
    status.value = 'Изменения сохранены';
    $('#password').val('');
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('логин')) {
      error.value = 'Пользователь не найден. Перезайдите или зарегистрируйтесь.';
    } else {
      error.value = err.message || 'Не удалось сохранить профиль';
    }
  } finally {
    setTimeout(() => {
      status.value = '';
    }, 2000);
  }
}

function logout() {
  auth.logout();
  router.push({ name: 'landing' });
}

onMounted(() => {
  fillFromStore();
  $('#profile-form').on('submit', submitProfile);
});

watch(
  () => auth.user,
  () => {
    fillFromStore();
  },
  { deep: true },
);
</script>

<template>
  <main class="content">
    <section class="dashboard">
      <div class="section-head">
        <p class="pill">Личный кабинет</p>
        <h2>Данные пользователя</h2>
        <p class="muted">Обновляйте ФИО, телефон, email и пароль.</p>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <p class="label">Логин</p>
            <p class="strong">{{ userLogin }}</p>
          </div>
          <button class="ghost" type="button" @click="logout">Выйти</button>
        </div>

        <form id="profile-form" class="form column">
          <label class="field" :class="{ error: fieldErrors.name }">
            <span>ФИО</span>
            <input id="name" type="text" name="name" placeholder="Иванов Иван" />
            <small v-if="fieldErrors.name" class="error-text">{{ fieldErrors.name }}</small>
          </label>
          <label class="field" :class="{ error: fieldErrors.phone }">
            <span>Телефон</span>
            <input id="phone" type="tel" name="phone" placeholder="+7 900 000-00-00" />
            <small v-if="fieldErrors.phone" class="error-text">{{ fieldErrors.phone }}</small>
          </label>
          <label class="field" :class="{ error: fieldErrors.email }">
            <span>Email</span>
            <input id="email" type="email" name="email" placeholder="name@email.com" />
            <small v-if="fieldErrors.email" class="error-text">{{ fieldErrors.email }}</small>
          </label>
          <label class="field" :class="{ error: fieldErrors.password }">
            <span>Пароль</span>
            <input id="password" type="password" name="password" placeholder="Новый пароль (мин. 6 символов)" />
            <small v-if="fieldErrors.password" class="error-text">{{ fieldErrors.password }}</small>
          </label>
          <div class="form-actions">
            <button class="primary" type="submit">Сохранить</button>
          </div>
          <p v-if="status" class="muted small">{{ status }}</p>
          <p v-if="error" class="muted small" style="color: #dc2626">{{ error }}</p>
        </form>
      </div>
    </section>
  </main>
</template>
