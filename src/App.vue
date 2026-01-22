<script setup>
import { computed, onMounted, ref } from 'vue';
import $ from 'jquery';
import { RouterView, useRouter } from 'vue-router';
import TopNav from './components/layout/TopNav.vue';
import SiteFooter from './components/layout/SiteFooter.vue';
import { useAuthStore } from './stores/useAuthStore.js';

const guestLinks = [
  { label: 'О сервисе', href: '#about' },
  { label: 'Возможности', href: '#features' },
  { label: 'Как это работает', href: '#steps' },
  { label: 'Безопасность', href: '#safety' },
];

const authLinks = [
  { label: 'Главная', to: { name: 'dashboard' }, name: 'dashboard' },
  { label: 'Добавление операций', to: { name: 'operations' }, name: 'operations' },
  { label: 'Цели и копилки', to: { name: 'goals' }, name: 'goals' },
  { label: 'Бюджеты', to: { name: 'budgets' }, name: 'budgets' },
  { label: 'Счета', to: { name: 'accounts' }, name: 'accounts' },
];

const auth = useAuthStore();
const { isAuthenticated } = auth;
const router = useRouter();

const modalOpen = ref(false);
const modalMode = ref('login');
const toast = ref('');
const fieldErrors = ref({});
const isDark = ref(false);
let toastTimer;

const isRegister = computed(() => modalMode.value === 'signup');

const modalTitle = computed(() => (isRegister.value ? 'Регистрация' : 'Войти в MoneyLens'));

const modalCta = computed(() => (isRegister.value ? 'Зарегистрироваться' : 'Войти'));

function openModal(mode = 'login') {
  modalMode.value = mode;
  modalOpen.value = true;
  fieldErrors.value = {};
  setTimeout(() => $('#login').trigger('focus'), 50);
}

function closeModal() {
  modalOpen.value = false;
  fieldErrors.value = {};
}

function setToast(message) {
  toast.value = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 3000);
}

async function handleSubmit(event) {
  event.preventDefault();
  fieldErrors.value = {};
  const payload = {
    login: ($('#login').val() || '').toString().trim(),
    password: ($('#password').val() || '').toString(),
    name: ($('#name').val() || '').toString(),
    email: ($('#email').val() || '').toString(),
    phone: ($('#phone').val() || '').toString(),
  };

  const loginValid = /^[a-z0-9._-]+$/i.test(payload.login || '');

  if (!payload.login || !payload.password || (isRegister.value && !payload.name)) {
    fieldErrors.value = {
      ...(payload.login ? {} : { login: 'Укажите логин' }),
      ...(payload.password ? {} : { password: 'Укажите пароль' }),
      ...(isRegister.value && !payload.name ? { name: 'Укажите имя' } : {}),
    };
    setToast('Заполните обязательные поля');
    return;
  }

  if (!loginValid) {
    fieldErrors.value.login = 'Только латиница, цифры, точки, дефис и нижнее подчеркивание';
    setToast('Логин содержит недопустимые символы');
    return;
  }

  if (isRegister.value) {
    if (payload.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
      fieldErrors.value.email = 'Некорректный email';
    }
    if (payload.phone) {
      const phoneDigits = payload.phone.replace(/\D/g, '');
      if (phoneDigits.length < 8) {
        fieldErrors.value.phone = 'Телефон должен содержать минимум 8 цифр';
      }
    }
    if (payload.password.length < 6) {
      fieldErrors.value.password = 'Пароль должен быть не короче 6 символов';
    }
    if (Object.keys(fieldErrors.value).length) {
      setToast('Проверьте ошибки в форме');
      return;
    }
  }

  try {
    if (!isRegister.value) {
      await auth.login(payload);
    } else {
      await auth.register(payload);
    }
    setToast('Добро пожаловать! Профиль загружен.');
    modalOpen.value = false;
    router.push({ name: 'dashboard' });
  } catch (err) {
    setToast(err.message || 'Ошибка авторизации');
    if (!isRegister.value) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('логин')) fieldErrors.value.login = err.message;
      if (msg.includes('парол')) fieldErrors.value.password = err.message;
    }
  }
}

function goToCabinet() {
  router.push({ name: 'profile' });
}

function goHome() {
  if (router.currentRoute.value.name !== 'landing') {
    router.push({ name: 'landing' }).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('theme-dark', isDark.value);
}

onMounted(() => {
  auth.bootstrap();
});
</script>

<template>
  <div class="page" :class="{ dark: isDark }">
    <TopNav
      :is-authenticated="isAuthenticated"
      :guest-links="guestLinks"
      :auth-links="authLinks"
      @login="openModal('login')"
      @trial="openModal('signup')"
      @cabinet="goToCabinet"
      @home="goHome"
      @toggle-theme="toggleTheme"
    />

    <RouterView v-slot="{ Component }">
      <component :is="Component" @open-modal="openModal" />
    </RouterView>

    <SiteFooter @home="goHome" />

    <div v-if="modalOpen" class="overlay" @click.self="closeModal">
      <div class="modal">
        <header class="modal-head">
          <h3>{{ modalTitle }}</h3>
          <button class="icon-btn" aria-label="Закрыть" @click="closeModal">✕</button>
        </header>
        <p class="muted small">
          Введите логин, пароль и имя. Если данные неверные, подсветим поле и покажем причину ошибки.
        </p>
        <form class="form" @submit="handleSubmit">
          <label class="field" :class="{ error: fieldErrors.login }">
            <span>Логин</span>
            <input id="login" type="text" name="login" placeholder="mylogin" required />
            <small v-if="fieldErrors.login" class="error-text">{{ fieldErrors.login }}</small>
          </label>
          <label class="field" :class="{ error: fieldErrors.password }">
            <span>Пароль</span>
            <input id="password" type="password" name="password" placeholder="••••••" required />
            <small v-if="fieldErrors.password" class="error-text">{{ fieldErrors.password }}</small>
          </label>
          <template v-if="isRegister">
            <label class="field" :class="{ error: fieldErrors.name }">
              <span>Имя</span>
              <input id="name" type="text" name="name" placeholder="Мария" required />
              <small v-if="fieldErrors.name" class="error-text">{{ fieldErrors.name }}</small>
            </label>
            <label class="field" :class="{ error: fieldErrors.phone }">
              <span>Телефон (опционально)</span>
              <input id="phone" type="tel" name="phone" placeholder="+7 900 000-00-00" />
              <small v-if="fieldErrors.phone" class="error-text">{{ fieldErrors.phone }}</small>
            </label>
            <label class="field" :class="{ error: fieldErrors.email }">
              <span>Email (опционально)</span>
              <input id="email" type="email" name="email" placeholder="name@email.com" />
              <small v-if="fieldErrors.email" class="error-text">{{ fieldErrors.email }}</small>
            </label>
          </template>
          <button class="primary full" type="submit">{{ modalCta }}</button>
        </form>
        <p class="muted tiny">
          Проверьте корректность логина и пароля перед отправкой формы.
        </p>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>
