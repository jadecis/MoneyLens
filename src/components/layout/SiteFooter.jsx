import { Link } from 'react-router-dom';

export default function SiteFooter({ onHome }) {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <button className="logo" type="button" onClick={onHome}>
          <span className="logo-mark">ML</span>
          <span className="logo-text">MoneyLens</span>
        </button>
        <p className="muted">Помогаем видеть деньги насквозь и достигать целей.</p>
        <div className="support">
          <p className="muted">Нужна помощь? Мы рядом 24/7</p>
          <a className="chip" href="mailto:support@moneylens.app">
            support@moneylens.app
          </a>
          <a className="chip ghost" href="tel:+78001234567">
            8 800 123-45-67
          </a>
          <span className="muted tiny">Ответ в течение 5 минут</span>
        </div>
      </div>

      <div className="footer-columns">
        <div className="footer-col">
          <p className="label">Навигация</p>
          <a href="/#about">О сервисе</a>
          <a href="/#features">Возможности</a>
          <a href="/#safety">Безопасность</a>
          <a href="/#steps">Как это работает</a>
        </div>
        <div className="footer-col">
          <p className="label">Документы</p>
          <Link to="/privacy" target="_blank">
            Политика конфиденциальности
          </Link>
          <Link to="/terms" target="_blank">
            Пользовательское соглашение
          </Link>
          <Link to="/cookies" target="_blank">
            Политика cookies
          </Link>
        </div>
        <div className="footer-col">
          <p className="label">Контакты</p>
          <p className="muted">Email: support@moneylens.app</p>
          <p className="muted">Телефон: 8 800 123-45-67</p>
          <p className="muted">Офис: Москва, ул. Финансовая, 8</p>
        </div>
      </div>
    </footer>
  );
}
