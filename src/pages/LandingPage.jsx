import { useRef, useState } from 'react';

export default function LandingPage({ onOpenModal }) {
  const heroCardRef = useRef(null);
  const [highlightDemo, setHighlightDemo] = useState(false);

  const scrollToDemo = () => {
    if (!heroCardRef.current) return;
    heroCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightDemo(true);
    setTimeout(() => setHighlightDemo(false), 1400);
  };

  return (
    <main className="content">
      <section className="hero" id="about">
        <div className="hero-copy">
          <p className="pill">Веб-приложение учета финансов</p>
          <h1>Видеть картину целиком. Планировать уверенно.</h1>
          <p className="lead">
            MoneyLens помогает понимать, как распределяются финансы, подсказывает, куда уходят деньги, и показывает путь к целям.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => onOpenModal('signup')}>
              Создать аккаунт
            </button>
            <button className="ghost" onClick={scrollToDemo}>
              Посмотреть демо
            </button>
          </div>
        </div>

        <div ref={heroCardRef} className={`hero-card ${highlightDemo ? 'highlight' : ''}`}>
          <div className="card-header">
            <p className="eyebrow">Демо-дашборд</p>
            <p className="muted">Обзор балансов и расходов</p>
          </div>
          <div className="balance-grid">
            <div className="balance-card">
              <p className="muted">Основной счет</p>
              <p className="balance-value">₽ 128 400</p>
              <p className="trend positive">+12% за месяц</p>
            </div>
            <div className="balance-card">
              <p className="muted">Накопления</p>
              <p className="balance-value">₽ 342 000</p>
              <p className="trend neutral">Движение стабильное</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="section-head">
          <p className="pill">Возможности</p>
          <h2>Все для прозрачного учета и планирования</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>Карманное планирование</h3>
            <p className="muted">Собирайте расходы по категориям, задавайте лимиты и держите бюджет под контролем.</p>
          </article>
          <article className="feature-card">
            <h3>Умная аналитика</h3>
            <p className="muted">Автоматические отчеты и подсказки по оптимизации ваших трат и накоплений.</p>
          </article>
          <article className="feature-card">
            <h3>Цели и копилки</h3>
            <p className="muted">Создавайте цели, накапливайте по правилам и отслеживайте прогресс в реальном времени.</p>
          </article>
        </div>
      </section>

      <section className="steps" id="steps">
        <div className="section-head">
          <p className="pill">Как это работает</p>
          <h2>Три шага к контролю</h2>
        </div>
        <div className="step-grid">
          <article className="step-card">
            <div className="step-icon">1</div>
            <div>
              <h3>Создайте учетку</h3>
              <p className="muted">Заведите личные и совместные кошельки, настройте категории расходов.</p>
            </div>
          </article>
          <article className="step-card">
            <div className="step-icon">2</div>
            <div>
              <h3>Добавляйте операции</h3>
              <p className="muted">Фиксируйте доходы, расходы и переводы между счетами.</p>
            </div>
          </article>
          <article className="step-card">
            <div className="step-icon">3</div>
            <div>
              <h3>Следите за целями</h3>
              <p className="muted">Используйте аналитику дашборда для оптимизации финансовых решений.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="safety" id="safety">
        <div className="section-head">
          <p className="pill">Безопасность</p>
          <h2>Ваши данные под защитой</h2>
          <p className="muted">Шифрование, резервные копии и строгий контроль доступа.</p>
        </div>
      </section>
    </main>
  );
}
