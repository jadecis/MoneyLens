import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOperations } from '../contexts/OperationsContext.jsx';
import { fetchUserState } from '../services/operationsApi.js';

const categoryPresets = {
  expense: ['Продукты', 'Транспорт', 'Кафе', 'Подписки', 'Жилье', 'Здоровье', 'Другое'],
  income: ['Зарплата', 'Премия', 'Подарок', 'Проценты', 'Инвестиции', 'Другое'],
  transfer: ['Перевод между счетами'],
};
const DEFAULT_ACCOUNT = 'Общий счет';
const DEFAULT_CATEGORY_BY_TYPE = {
  expense: 'Другое',
  income: 'Другое',
  transfer: 'Перевод между счетами',
};

function formatCurrency(amount) {
  return (amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OperationsPage() {
  const operations = useOperations();
  const auth = useAuth();

  const defaultForm = () => ({
    id: null,
    type: 'expense',
    amount: '',
    account: operations.accountsList[0] || DEFAULT_ACCOUNT,
    accountFrom: operations.accountsList[0] || DEFAULT_ACCOUNT,
    accountTo: operations.accountsList[1] || operations.accountsList[0] || DEFAULT_ACCOUNT,
    category: DEFAULT_CATEGORY_BY_TYPE.expense,
    note: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [filters, setFilters] = useState({ type: 'all', account: 'all', category: 'all', search: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    const login = auth.user?.login;
    if (!login) {
      setBudgets([]);
      return;
    }
    fetchUserState(login)
      .then((resp) => setBudgets(Array.isArray(resp.budgets) ? resp.budgets : []))
      .catch(() => setBudgets([]));
  }, [auth.user?.login]);

  useEffect(() => {
    if (!operations.operations.length && !operations.loading) {
      operations.loadOperations().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const options = operations.accountsList.length ? operations.accountsList : [DEFAULT_ACCOUNT];
    const first = options[0] || DEFAULT_ACCOUNT;
    setForm((prev) => ({
      ...prev,
      account: options.includes(prev.account) ? prev.account : first,
      accountFrom: options.includes(prev.accountFrom) ? prev.accountFrom : first,
      accountTo: options.includes(prev.accountTo) ? prev.accountTo : options[1] || first,
    }));
  }, [operations.accountsList]);

  const isTransfer = form.type === 'transfer';
  const isEditing = Boolean(form.id);
  const accountOptions = operations.accountsList.length ? operations.accountsList : [DEFAULT_ACCOUNT];

  const clearFeedback = () => {
    setMessage('');
    setError('');
  };

  const categories = useMemo(() => {
    const base = categoryPresets[form.type] || categoryPresets.expense;
    if (form.type !== 'expense') return base;
    const budgetNames = budgets.map((b) => b.name).filter(Boolean);
    return Array.from(new Set([...budgetNames, ...base]));
  }, [budgets, form.type]);

  const normalizeCategory = (type, category) => {
    const normalized = (category || '').trim();
    if (type === 'transfer') return DEFAULT_CATEGORY_BY_TYPE.transfer;

    if (type === 'income') {
      return categoryPresets.income.includes(normalized) ? normalized : DEFAULT_CATEGORY_BY_TYPE.income;
    }

    const expenseAllowed = Array.from(
      new Set([
        ...budgets.map((b) => (b.name || '').trim()).filter(Boolean),
        ...categoryPresets.expense,
      ]),
    );
    return expenseAllowed.includes(normalized) ? normalized : DEFAULT_CATEGORY_BY_TYPE.expense;
  };

  const categoryOptions = useMemo(() => {
    const set = new Set();
    operations.operations.forEach((op) => op.category && set.add(op.category));
    budgets.forEach((b) => b.name && set.add(b.name));
    Object.values(categoryPresets).flat().forEach((c) => set.add(c));
    return Array.from(set);
  }, [budgets, operations.operations]);

  const filtered = useMemo(() => {
    return operations.sortedOperations.filter((op) => {
      if (filters.type !== 'all' && op.type !== filters.type) return false;
      if (filters.account !== 'all') {
        if (op.type === 'transfer') {
          if (op.accountFrom !== filters.account && op.accountTo !== filters.account) return false;
        } else if (op.account !== filters.account) {
          return false;
        }
      }
      if (filters.category !== 'all' && op.category !== filters.category) return false;
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const hay = `${op.category || ''} ${op.note || ''} ${op.account || ''} ${op.accountFrom || ''} ${op.accountTo || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.dateFrom && new Date(op.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(op.date) > new Date(filters.dateTo)) return false;
      return true;
    });
  }, [filters, operations.sortedOperations]);

  const resetForm = () => setForm(defaultForm());

  const startEdit = (op) => {
    clearFeedback();
    setForm({
      id: op.id,
      type: op.type,
      amount: op.amount,
      account: op.account || DEFAULT_ACCOUNT,
      accountFrom: op.accountFrom || DEFAULT_ACCOUNT,
      accountTo: op.accountTo || 'Копилка',
      category: op.category || 'Другое',
      note: op.note || '',
      date: op.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
  };

  const remove = async (op) => {
    clearFeedback();
    try {
      await operations.deleteOperation(op.id);
      setMessage('Операция удалена');
      if (isEditing && form.id === op.id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    const category = normalizeCategory(form.type, form.category);

    const payload =
      form.type === 'transfer'
        ? {
            type: 'transfer',
            amount,
            accountFrom: form.accountFrom,
            accountTo: form.accountTo,
            category,
            note: form.note,
            date: form.date,
          }
        : {
            type: form.type,
            amount,
            account: form.account,
            category,
            note: form.note,
            date: form.date,
          };

    setIsSaving(true);
    try {
      if (isEditing) {
        await operations.updateOperation(form.id, payload);
        setMessage('Операция обновлена');
      } else {
        await operations.addOperation(payload);
        setMessage('Операция добавлена');
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="content">
      <section className="section-head">
        <p className="pill">Операции</p>
        <h2>Добавление, редактирование и контроль</h2>
      </section>

      <div className="panel">
        <div className="panel-head">
          <h3>{isEditing ? 'Редактирование операции' : 'Новая операция'}</h3>
          <span className="chip">{isEditing ? 'Режим правки' : 'Быстрое добавление'}</span>
        </div>

        <form className="form column" onSubmit={handleSubmit}>
          <div className="type-switch">
            {[
              { value: 'expense', label: 'Расход' },
              { value: 'income', label: 'Доход' },
              { value: 'transfer', label: 'Перевод' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`ghost ${form.type === option.value ? 'active' : ''}`}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: option.value,
                    category: DEFAULT_CATEGORY_BY_TYPE[option.value],
                  }))
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="operations-grid">
            <label className="field">
              <span>Дата</span>
              <input value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} type="date" required />
            </label>

            <label className="field">
              <span>Сумма</span>
              <input value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} type="number" min="1" step="1" placeholder="0" required />
            </label>

            {!isTransfer && (
              <label className="field">
                <span>Счет</span>
                <select value={form.account} onChange={(e) => setForm((p) => ({ ...p, account: e.target.value }))}>
                  {accountOptions.map((acc) => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
              </label>
            )}

            {isTransfer && (
              <label className="field">
                <span>Со счета</span>
                <select value={form.accountFrom} onChange={(e) => setForm((p) => ({ ...p, accountFrom: e.target.value }))}>
                  {accountOptions.map((acc) => (
                    <option key={`from-${acc}`} value={acc}>{acc}</option>
                  ))}
                </select>
              </label>
            )}

            {isTransfer && (
              <label className="field">
                <span>На счет</span>
                <select value={form.accountTo} onChange={(e) => setForm((p) => ({ ...p, accountTo: e.target.value }))}>
                  {accountOptions.map((acc) => (
                    <option key={`to-${acc}`} value={acc}>{acc}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="field">
              <span>Категория</span>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label className="field full">
              <span>Комментарий (опционально)</span>
              <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows="2" />
            </label>
          </div>

          <div className="form-actions">
            <button className="primary" type="submit" disabled={isSaving}>{isEditing ? 'Сохранить изменения' : 'Добавить операцию'}</button>
            <button className="ghost" type="button" onClick={resetForm} disabled={isSaving}>Сбросить</button>
          </div>
        </form>

        {message && <p className="chip success">{message}</p>}
        {error && <p className="chip warning">{error}</p>}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Ваши операции</h3>
          <span className="chip">{filtered.length} записей</span>
        </div>

        <div className="filters">
          <div className="filters-grid">
            <label className="field">
              <span>Тип</span>
              <select value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
                <option value="all">Все</option>
                <option value="income">Доход</option>
                <option value="expense">Расход</option>
                <option value="transfer">Перевод</option>
              </select>
            </label>
            <label className="field">
              <span>Счет</span>
              <select value={filters.account} onChange={(e) => setFilters((p) => ({ ...p, account: e.target.value }))}>
                <option value="all">Все</option>
                {accountOptions.map((acc) => (
                  <option key={`f-${acc}`} value={acc}>{acc}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Категория</span>
              <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}>
                <option value="all">Все</option>
                {categoryOptions.map((cat) => (
                  <option key={`cat-${cat}`} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>С</span>
              <input value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} type="date" />
            </label>
            <label className="field">
              <span>По</span>
              <input value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} type="date" />
            </label>
            <label className="field full">
              <span>Поиск</span>
              <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} type="search" placeholder="Категория, комментарий, счет..." />
            </label>
          </div>
        </div>

        {!operations.sortedOperations.length && !operations.loading ? (
          <p className="muted">Пока нет операций.</p>
        ) : (
          <ul className="transaction-list manage">
            {filtered.map((op) => (
              <li key={op.id} className="transaction">
                <div>
                  <p className="strong">{op.category}</p>
                  <p className="muted tiny">{op.type === 'income' ? 'Доход' : op.type === 'expense' ? 'Расход' : 'Перевод'} · {op.type === 'transfer' ? `${op.accountFrom} → ${op.accountTo}` : op.account} · {formatDate(op.date)}</p>
                  {op.note && <p className="muted tiny">{op.note}</p>}
                </div>
                <div className="tx-actions">
                  <p className={`amount ${op.type === 'income' ? 'positive' : op.type === 'expense' ? 'negative' : 'neutral'}`}>{op.type === 'expense' ? '-' : ''}{formatCurrency(op.amount)}</p>
                  <button className="ghost" type="button" onClick={() => startEdit(op)}>Редактировать</button>
                  <button className="ghost danger" type="button" onClick={() => remove(op)}>Удалить</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
