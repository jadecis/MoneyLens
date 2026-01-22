<template>
  <footer class="footer">
    <div class="footer-brand">
      <button class="logo" type="button" @click="$emit('home')">
        <span class="logo-mark">ML</span>
        <span class="logo-text">MoneyLens</span>
      </button>
      <p class="muted">Помогаем видеть деньги насквозь и достигать целей.</p>
      <div class="support">
        <p class="muted">Нужна помощь? Мы рядом 24/7</p>
        <a class="chip" href="mailto:support@moneylens.app">support@moneylens.app</a>
        <a class="chip ghost" href="tel:+78001234567">8 800 123-45-67</a>
        <span class="muted tiny">Ответ в течение 5 минут</span>
      </div>
    </div>

    <div class="footer-columns">
      <div class="footer-col">
        <p class="label">Навигация</p>
        <a href="#about">О сервисе</a>
        <a href="#features">Возможности</a>
        <a href="#safety">Безопасность</a>
        <a href="#steps">Как это работает</a>
      </div>
      <div class="footer-col">
        <p class="label">Документы</p>
        <a href="#">Политика конфиденциальности</a>
        <a href="#">Пользовательское соглашение</a>
        <a href="#">Политика cookies</a>
      </div>
      <div class="footer-col">
        <p class="label">Контакты</p>
        <p class="muted">Email: support@moneylens.app</p>
        <p class="muted">Телефон: 8 800 123-45-67</p>
        <p class="muted">Офис: Москва, ул. Финансовая, 8</p>
      </div>
    </div>
  </footer>
</template>
