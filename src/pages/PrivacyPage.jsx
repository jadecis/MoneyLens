export default function PrivacyPage() {
  return (
    <main className="content">
      <section className="section-head">
        <p className="pill">Документ</p>
        <h2>Политика конфиденциальности MoneyLens</h2>
        <p className="muted">Рассказываем, какие данные собираем, зачем используем и как защищаем вашу информацию.</p>
      </section>

      <div className="panel">
        <h3>1. Какие данные мы обрабатываем</h3>
        <p className="muted">Учетные данные, финансовые записи, цели, бюджеты и технические метаданные сессии.</p>
      </div>

      <div className="panel">
        <h3>2. Для чего используются данные</h3>
        <p className="muted">Для работы дашборда, синхронизации операций и поддержки ваших запросов.</p>
      </div>

      <div className="panel">
        <h3>3. Хранение и безопасность</h3>
        <p className="muted">Передача данных защищена, используются резервные копии и контроль доступа.</p>
      </div>
    </main>
  );
}
