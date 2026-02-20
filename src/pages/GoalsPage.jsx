import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOperations } from '../contexts/OperationsContext.jsx';
import { fetchUserState, updateUserState } from '../services/operationsApi.js';

export default function GoalsPage() {
  const auth = useAuth();
  const ops = useOperations();

  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', target: '', saved: '' });
  const [contribution, setContribution] = useState({ amount: '', from: 'Общий счет' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const login = auth.user?.login;

  const loadGoals = async () => {
    if (!login) {
      setGoals([]);
      return;
    }
    try {
      const resp = await fetchUserState(login);
      setGoals(Array.isArray(resp.goals) ? resp.goals : []);
    } catch {
      setGoals([]);
    }
  };

  const persist = async (nextGoals) => {
    if (!login) return;
    try {
      await updateUserState(login, { goals: nextGoals });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadGoals();
  }, [login]);

  useEffect(() => {
    if (!ops.operations.length && !ops.loading) {
      ops.loadOperations().catch(() => {});
    }
  }, []);

  const enrichedGoals = useMemo(
    () =>
      goals.map((g) => {
        const target = Number(g.target) || 0;
        const saved = Number(g.saved) || 0;
        return {
          ...g,
          target,
          saved,
          progress: target ? Math.min(100, Math.round((saved / target) * 100)) : 0,
        };
      }),
    [goals],
  );

  const accountOptions = useMemo(() => {
    const set = new Set(['Общий счет', 'Копилка']);
    ops.accounts.forEach((a) => set.add(a.name));
    return Array.from(set);
  }, [ops.accounts]);

  const resetForm = () => setForm({ id: null, name: '', target: '', saved: '' });

  const startEdit = (goal) => {
    setForm({ id: goal.id, name: goal.name, target: goal.target, saved: goal.saved });
  };

  const removeGoal = async (id) => {
    const nextGoals = goals.filter((g) => g.id !== id);
    setGoals(nextGoals);
    await persist(nextGoals);
    if (form.id === id) resetForm();
    setMessage('Цель удалена');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.name.trim()) {
      setError('Название цели обязательно');
      return;
    }
    const target = Number(form.target);
    if (!Number.isFinite(target) || target <= 0) {
      setError('Целевой размер должен быть больше нуля');
      return;
    }

    const payload = {
      id: form.id || crypto.randomUUID(),
      name: form.name.trim(),
      target,
      saved: Number(form.saved) || 0,
    };

    const exists = goals.findIndex((g) => g.id === payload.id);
    const nextGoals = exists === -1 ? [...goals, payload] : goals.map((g) => (g.id === payload.id ? payload : g));
    setGoals(nextGoals);
    await persist(nextGoals);
    resetForm();
    setMessage('Цель сохранена');
  };

  const contributeToGoal = async (goal) => {
    setError('');
    setMessage('');
    const amount = Number(contribution.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Введите сумму взноса');
      return;
    }
    if (!contribution.from) {
      setError('Укажите источник средств');
      return;
    }

    setBusy(true);
    try {
      await ops.addOperation({
        type: 'transfer',
        amount,
        accountFrom: contribution.from,
        accountTo: goal.name,
        category: 'Цели',
        note: `Пополнение цели ${goal.name}`,
        date: new Date().toISOString().slice(0, 10),
      });

      const nextGoals = goals.map((g) => (g.id === goal.id ? { ...g, saved: (Number(g.saved) || 0) + amount } : g));
      setGoals(nextGoals);
      await persist(nextGoals);
      setContribution((prev) => ({ ...prev, amount: '' }));
      setMessage('Взнос зафиксирован');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="content">
      <section className="section-head">
        <p className="pill">Цели и копилки</p>
        <h2>Курс на достижения</h2>
      </section>

      <div className="panel">
        <div className="panel-head">
          <h3>{form.id ? 'Редактирование цели' : 'Новая цель'}</h3>
          <span className="chip">Цель · План · Факт</span>
        </div>
        <form className="form column" onSubmit={handleSubmit}>
          <div className="operations-grid">
            <label className="field">
              <span>Название цели</span>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} type="text" required />
            </label>
            <label className="field">
              <span>Целевой размер</span>
              <input value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} type="number" min="1" step="1" required />
            </label>
            <label className="field">
              <span>Уже накоплено</span>
              <input value={form.saved} onChange={(e) => setForm((p) => ({ ...p, saved: e.target.value }))} type="number" min="0" step="1" />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit">{form.id ? 'Сохранить' : 'Добавить'}</button>
            <button className="ghost" type="button" onClick={resetForm}>Сброс</button>
          </div>
        </form>
        {message && <p className="chip success">{message}</p>}
        {error && <p className="chip warning">{error}</p>}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Мои цели</h3>
          <span className="chip">{enrichedGoals.length} активных</span>
        </div>
        {!enrichedGoals.length ? (
          <p className="muted">Пока нет целей.</p>
        ) : (
          <div className="goal-list">
            {enrichedGoals.map((goal) => (
              <article key={goal.id} className="goal-card">
                <div className="goal-top">
                  <div>
                    <p className="strong">{goal.name}</p>
                    <p className="muted">{goal.saved.toLocaleString('ru-RU')} / {goal.target.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <span className="chip">{goal.progress}%</span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="operations-grid">
                  <label className="field">
                    <span>Счет-источник</span>
                    <select value={contribution.from} onChange={(e) => setContribution((p) => ({ ...p, from: e.target.value }))}>
                      {accountOptions.map((acc) => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Сумма взноса</span>
                    <input value={contribution.amount} onChange={(e) => setContribution((p) => ({ ...p, amount: e.target.value }))} type="number" min="1" step="1" />
                  </label>
                </div>
                <div className="tx-actions">
                  <button className="primary" type="button" disabled={busy} onClick={() => contributeToGoal(goal)}>Пополнить</button>
                  <button className="ghost" type="button" onClick={() => startEdit(goal)}>Редактировать</button>
                  <button className="ghost danger" type="button" onClick={() => removeGoal(goal.id)}>Удалить</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
