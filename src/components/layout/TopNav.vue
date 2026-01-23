<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';

const props = defineProps({
  isAuthenticated: { type: Boolean, default: false },
  guestLinks: { type: Array, default: () => [] },
  authLinks: { type: Array, default: () => [] },
});

const emit = defineEmits(['login', 'trial', 'signup', 'cabinet', 'home', 'toggle-theme']);

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);

const isLanding = computed(() => route.name === 'landing');

function goHome() {
  if (isLanding.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    router.push({ name: 'landing' });
  }
  emit('home');
  menuOpen.value = false;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}
</script>

<template>
  <header class="top-nav" :class="{ 'menu-open': menuOpen }">
    <div class="nav-left">
      <button class="logo" type="button" @click="goHome">
        <span class="logo-mark">ML</span>
        <span class="logo-text">MoneyLens</span>
      </button>
      <button class="menu-toggle" type="button" @click="toggleMenu" aria-label="Переключить меню">
        <span v-if="!menuOpen">☰</span>
        <span v-else>✕</span>
      </button>
    </div>

    <nav class="nav-links" v-if="!isAuthenticated" :class="{ open: menuOpen }">
      <a v-for="link in guestLinks" :key="link.label" :href="link.href" @click="closeMenu">
        {{ link.label }}
      </a>
    </nav>
    <nav class="nav-links" v-else :class="{ open: menuOpen }" @click="closeMenu">
      <RouterLink
        v-for="link in authLinks"
        :key="link.label"
        :to="link.to"
        :class="{ active: route.name === link.name }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="nav-actions" :class="{ open: menuOpen }">
      <template v-if="!isAuthenticated">
        <button class="ghost" @click="emit('login'); closeMenu()">Войти</button>
        <button class="primary" @click="emit('trial'); closeMenu()">Регистрация</button>
      </template>
      <template v-else>
        <button class="primary" @click="emit('cabinet'); closeMenu()">Личный кабинет</button>
      </template>
      <button class="ghost" title="Переключить тему" @click="emit('toggle-theme')">🌗</button>
    </div>
  </header>
</template>
