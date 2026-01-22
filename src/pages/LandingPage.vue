<script setup>
import { ref } from 'vue';

const emit = defineEmits(['open-modal']);

const features = [
  {
    title: 'Карманное планирование',
    description: 'Собирайте расходы по категориям, задавайте лимиты и держите бюджет под контролем.',
  },
  {
    title: 'Умная аналитика',
    description: 'Автоматические отчеты и подсказки по оптимизации ваших трат и накоплений.',
  },
  {
    title: 'Совместный доступ',
    description: 'Делитесь кошельками с семьей или партнерами — прозрачно и безопасно.',
  },
  {
    title: 'Цели и копилки',
    description: 'Создавайте цели, накапливайте по правилам и отслеживайте прогресс в реальном времени.',
  },
];

const steps = [
  {
    title: 'Создайте учетку',
    description: 'Заведите личные и совместные кошельки, настройте категории расходов.',
  },
  {
    title: 'Добавляйте операции',
    description: 'Импортируйте выписки или вносите вручную. MoneyLens сам разложит траты по полкам.',
  },
  {
    title: 'Следите за целями',
    description: 'Включайте копилки, ставьте лимиты, получайте напоминания и рекомендации.',
  },
];

const heroCardRef = ref(null);
const highlightDemo = ref(false);

function scrollToDemo() {
  if (heroCardRef.value) {
    heroCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightDemo.value = true;
    setTimeout(() => (highlightDemo.value = false), 1400);
  }
}
</script>

<template>
  <main class="content">
    <section class="hero" id="about">
      <div class="hero-copy">
        <p class="pill">Веб-приложение учета финансов</p>
        <h1>Видеть картину целиком. Планировать уверенно.</h1>
        <p class="lead">
          MoneyLens помогает вам понимать, как распределяются финансы, подсказывает, куда уходят деньги,
          и показывает путь к целям.
        </p>
        <div class="hero-actions">
          <button class="primary" @click="emit('open-modal', 'signup')">Создать аккаунт</button>
          <button class="ghost" @click="scrollToDemo">Посмотреть демо</button>
        </div>
        <div class="stats">
          <div class="stat">
            <p class="stat-value">15 000+</p>
            <p class="muted">активных пользователей</p>
          </div>
          <div class="stat">
            <p class="stat-value">8%</p>
            <p class="muted">средняя экономия в первый месяц</p>
          </div>
          <div class="stat">
            <p class="stat-value">24/7</p>
            <p class="muted">доступ и поддержка</p>
          </div>
        </div>
      </div>
      <div ref="heroCardRef" class="hero-card" :class="{ highlight: highlightDemo }">
        <div class="card-header">
          <p class="eyebrow">Демо-дашборд</p>
          <p class="muted">Обзор балансов и расходов</p>
        </div>
        <div class="balance-grid">
          <div class="balance-card">
            <p class="muted">Основной счет</p>
            <p class="balance-value">₽ 128 400</p>
            <p class="trend positive">+12% за месяц</p>
          </div>
          <div class="balance-card">
            <p class="muted">Накопления</p>
            <p class="balance-value">₽ 342 000</p>
            <p class="trend neutral">Движение стабильное</p>
          </div>
        </div>
        <div class="spend-chart">
          <div class="chart-bar">
            <span>Дом</span>
            <div class="bar">
              <div class="fill" style="width: 72%"></div>
            </div>
            <span class="amount">72%</span>
          </div>
          <div class="chart-bar">
            <span>Продукты</span>
            <div class="bar">
              <div class="fill alt" style="width: 48%"></div>
            </div>
            <span class="amount">48%</span>
          </div>
          <div class="chart-bar">
            <span>Транспорт</span>
            <div class="bar">
              <div class="fill soft" style="width: 32%"></div>
            </div>
            <span class="amount">32%</span>
          </div>
        </div>
      </div>
    </section>

    <section class="feature-section" id="features">
      <div class="section-head">
        <p class="pill">Возможности</p>
        <h2>Все для прозрачного учета и планирования</h2>
        <p class="muted">
          MoneyLens собирает операции, раскладывает их по категориям и превращает в понятные подсказки
          для управления деньгами.
        </p>
      </div>
      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <h3>{{ feature.title }}</h3>
          <p class="muted">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section class="steps" id="steps">
      <div class="section-head">
        <p class="pill">Как это работает</p>
        <h2>Три шага к контролю</h2>
      </div>
      <div class="step-grid">
        <article v-for="step in steps" :key="step.title" class="step-card">
          <div class="step-icon">✓</div>
          <div>
            <h3>{{ step.title }}</h3>
            <p class="muted">{{ step.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="safety" id="safety">
      <div class="section-head">
        <p class="pill">Безопасность</p>
        <h2>Ваши данные под защитой</h2>
        <p class="muted">
          Шифрование, резервные копии и контроль доступа — MoneyLens следует практикам банковского
          уровня, чтобы ваши финансы оставались конфиденциальными.
        </p>
      </div>
      <div class="safety-grid">
        <div class="safety-card">
          <h3>Шифрование данных</h3>
          <p class="muted">Все данные передаются и хранятся с использованием современных алгоритмов.</p>
        </div>
        <div class="safety-card">
          <h3>Контроль доступа</h3>
          <p class="muted">Гранулярные роли и совместный доступ без риска утечек.</p>
        </div>
        <div class="safety-card">
          <h3>Резервные копии</h3>
          <p class="muted">Автоматические бэкапы и возможность восстановления истории операций.</p>
        </div>
      </div>
    </section>
  </main>
</template>
