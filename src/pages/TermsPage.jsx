export default function TermsPage() {
  return (
    <main className="content">
      <section className="section-head">
        <p className="pill">Документ</p>
        <h2>Пользовательское соглашение MoneyLens</h2>
        <p className="muted">Условия использования сервиса и обязательства сторон.</p>
      </section>

      <div className="panel">
        <h3>1. Общие положения</h3>
        <p className="muted">Регистрируясь, вы подтверждаете согласие с правилами использования сервиса.</p>
      </div>

      <div className="panel">
        <h3>2. Аккаунт и безопасность</h3>
        <p className="muted">Пользователь отвечает за сохранность логина и пароля.</p>
      </div>

      <div className="panel">
        <h3>3. Ответственность</h3>
        <p className="muted">Сервис предоставляется «как есть», финансовые решения пользователь принимает самостоятельно.</p>
      </div>
    </main>
  );
}
