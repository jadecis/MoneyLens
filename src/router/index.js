import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '../pages/LandingPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import OperationsPage from '../pages/OperationsPage.vue';
import GoalsPage from '../pages/GoalsPage.vue';
import BudgetsPage from '../pages/BudgetsPage.vue';
import AccountsPage from '../pages/AccountsPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import PrivacyPage from '../pages/PrivacyPage.vue';
import TermsPage from '../pages/TermsPage.vue';
import CookiesPage from '../pages/CookiesPage.vue';
import { useAuthStore } from '../stores/useAuthStore.js';

const routes = [
  { path: '/', name: 'landing', component: LandingPage, meta: { requiresAuth: false } },
  { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true } },
  { path: '/operations', name: 'operations', component: OperationsPage, meta: { requiresAuth: true } },
  { path: '/goals', name: 'goals', component: GoalsPage, meta: { requiresAuth: true } },
  { path: '/budgets', name: 'budgets', component: BudgetsPage, meta: { requiresAuth: true } },
  { path: '/accounts', name: 'accounts', component: AccountsPage, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
  { path: '/privacy', name: 'privacy', component: PrivacyPage, meta: { requiresAuth: false } },
  { path: '/terms', name: 'terms', component: TermsPage, meta: { requiresAuth: false } },
  { path: '/cookies', name: 'cookies', component: CookiesPage, meta: { requiresAuth: false } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  Promise.resolve(auth.ensureSession())
    .then(() => {
      if (auth.isAuthenticated.value && to.name === 'landing') {
        next({ name: 'dashboard' });
        return;
      }
      if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
        next({ name: 'landing' });
        return;
      }
      next();
    })
    .catch(() => next({ name: 'landing' }));
});

export default router;
