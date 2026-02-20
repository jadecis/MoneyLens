import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOperations } from '../contexts/OperationsContext.jsx';
import { fetchUserState, updateUserState } from '../services/operationsApi.js';

export default function BudgetsPage() {
  const auth = useAuth();
  const ops = useOperations();

  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', limit: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const login = auth.user?.login;

  const loadBudgets = async () => {
    if (!login) {
      setBudgets([]);
      return;
    }
    try {
      const resp = await fetchUserState(login);
      setBudgets(Array.isArray(resp.budgets) ? resp.budgets : []);
    } catch {
      setBudgets([]);
    }
  };

  const persist = async (nextBudgets) => {
    if (!login) return;
    try {
      await updateUserState(login, { budgets: nextBudgets });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [login]);

  useEffect(() => {
    if (!ops.operations.length && !ops.loading) {
      ops.loadOperations().catch(() => {});
    }
  }, []);

  const categoryUsage = useMemo(() => new Map(ops.categoryTotals.map((item) => [item.name, item.value])), [ops.categoryTotals]);

  const enhancedBudgets = useMemo(
    () =>
      budgets.map((b) => {
        const used = Math.round(categoryUsage.get(b.name) || 0);
        const limit = Number(b.limit) || 0;
        return {
          ...b,
          used,
          progress: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
        };
      }),
    [budgets, categoryUsage],
  );

  const resetForm = () => setForm({ id: null, name: '', limit: '' });

  const startEdit = (budget) => setForm({ id: budget.id, name: budget.name, limit: budget.limit });

  const removeBudget = async (id) => {
    const nextBudgets = budgets.filter((b) => b.id !== id);
    setBudgets(nextBudgets);
    await persist(nextBudgets);
    setMessage('Бюджет удален');
    if (form.id === id) resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!form.name.trim()) {
      setError('Укажите категорию');
      return;
    }
    const limit = Number(form.limit);
    if (!Number.isFinite(limit) || limit <= 0) {
      setError('Лимит должен быть больше нуля');
      return;
    }

    setIsSaving(true);
    const payload = { id: form.id || crypto.randomUUID(), name: form.name.trim(), limit: Math.round(limit) };
    const exists = budgets.findIndex((b) => b.id === payload.id);
    const nextBudgets = exists === -1 ? [...budgets, payload] : budgets.map((b) => (b.id === payload.id ? payload : b));
    setBudgets(nextBudgets);
    await persist(nextBudgets);
    resetForm();
    setMessage('Бюджет сохранен');
    setIsSaving(false);
  };

  return (
    <main className="content">
      <section className="section-head">
        <p className="pill">Бюджеты</p>
        <h2>Лимиты по категориям</h2>
      </section>

      <div className="panel">
        <div className="panel-head">
          <h3>{form.id ? 'Редактирование бюджета' : 'Новый бюджет'}</h3>
          <span className="chip">Категория · Лимит</span>
        </div>
        <form className="form column" onSubmit={handleSubmit}>
          <div className="operations-grid">
            <label className="field">
              <span>Категория</span>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} type="text" required />
            </label>
            <label className="field">
              <span>Лимит в месяц</span>
              <input value={form.limit} onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))} type="number" min="1" step="1" required />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={isSaving}>{form.id ? 'Сохранить' : 'Добавить'}</button>
            <button className="ghost" type="button" onClick={resetForm} disabled={isSaving}>Сброс</button>
          </div>
        </form>
        {message && <p className="chip success">{message}</p>}
        {error && <p className="chip warning">{error}</p>}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Текущие бюджеты</h3>
          <span className="chip">{enhancedBudgets.length} категорий</span>
        </div>
        {!enhancedBudgets.length ? (
          <p className="muted">Пока нет бюджетов.</p>
        ) : (
          <div className="budget-list">
            {enhancedBudgets.map((item) => (
              <article key={item.id} className="budget-card">
                <div className="budget-top">
                  <p className="strong">{item.name}</p>
                  <p className="muted">{item.used.toLocaleString('ru-RU')} / {item.limit.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div className="progress thin">
                  <div className="progress-fill alt" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="tx-actions">
                  <button className="ghost" type="button" onClick={() => startEdit(item)}>Редактировать</button>
                  <button className="ghost danger" type="button" onClick={() => removeBudget(item.id)}>Удалить</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
