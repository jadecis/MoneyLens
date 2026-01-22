<script setup>
import { computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';

const props = defineProps({
  isAuthenticated: { type: Boolean, default: false },
  guestLinks: { type: Array, default: () => [] },
  authLinks: { type: Array, default: () => [] },
});

const emit = defineEmits(['login', 'trial', 'signup', 'cabinet', 'home', 'toggle-theme']);

const route = useRoute();
const router = useRouter();

const isLanding = computed(() => route.name === 'landing');

function goHome() {
  if (isLanding.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    router.push({ name: 'landing' });
  }
  emit('home');
}
</script>

<template>
  <header class="top-nav">
    <button class="logo" type="button" @click="goHome">
      <span class="logo-mark">ML</span>
      <span class="logo-text">MoneyLens</span>
    </button>

    <nav class="nav-links" v-if="!isAuthenticated">
      <a v-for="link in guestLinks" :key="link.label" :href="link.href">
        {{ link.label }}
      </a>
    </nav>
    <nav class="nav-links" v-else>
      <RouterLink
        v-for="link in authLinks"
        :key="link.label"
        :to="link.to"
        :class="{ active: route.name === link.name }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="nav-actions">
      <template v-if="!isAuthenticated">
        <button class="ghost" @click="emit('login')">Войти</button>
        <button class="primary" @click="emit('trial')">Регистрация</button>
      </template>
      <template v-else>
        <button class="primary" @click="emit('cabinet')">Личный кабинет</button>
      </template>
      <button class="ghost" title="Переключить тему" @click="emit('toggle-theme')">🌓</button>
    </div>
  </header>
</template>
