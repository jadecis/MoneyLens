import { useEffect, useMemo, useState } from 'react';
import { useOperations } from '../contexts/OperationsContext.jsx';

const DEFAULT_ACCOUNT = 'Общий счет';

function formatCurrency(amount) {
  return (amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

export default function AccountsPage() {
  const ops = useOperations();

  const [createForm, setCreateForm] = useState({ name: '', balance: '' });
  const [transferForm, setTransferForm] = useState({ from: '', to: '', amount: '' });
  const [quickForm, setQuickForm] = useState({ account: '', amount: '', type: 'income' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState('');

  const accountOptions = useMemo(() => (ops.accountsList.length ? ops.accountsList : [DEFAULT_ACCOUNT]), [ops.accountsList]);

  const accounts = ops.accounts;
  const totalBalance = ops.totalBalance || 0;

  const resetForms = () => {
    const first = accountOptions[0] || DEFAULT_ACCOUNT;
    setCreateForm({ name: '', balance: '' });
    setTransferForm({ from: first, to: accountOptions[1] || first, amount: '' });
    setQuickForm({ account: first, amount: '', type: 'income' });
  };

  useEffect(() => {
    if (!ops.operations.length && !ops.loading) {
      ops.loadOperations().catch(() => {});
    }
  }, []);

  useEffect(() => {
    resetForms();
  }, [accountOptions]);

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!createForm.name.trim()) {
      setError('Введите название счета');
      return;
    }

    const amount = Number(createForm.balance) || 0;
    setBusy(true);
    try {
      const name = createForm.name.trim();
      ops.addAccountName(name);
      if (amount > 0) {
        await ops.addOperation({
          type: 'income',
          amount,
          account: name,
          category: 'Открытие счета',
          note: 'Начальный баланс',
          date: new Date().toISOString().slice(0, 10),
        });
      }
      setMessage('Счет создан');
      resetForms();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickOp = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const amount = Number(quickForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Сумма должна быть больше нуля');
      return;
    }
    if (!quickForm.account) {
      setError('Выберите счет');
      return;
    }

    setBusy(true);
    try {
      await ops.addOperation({
        type: quickForm.type,
        amount,
        account: quickForm.account,
        category: quickForm.type === 'income' ? 'Пополнение' : 'Списание',
        note: 'Быстрая операция со страницы Счета',
        date: new Date().toISOString().slice(0, 10),
      });
      setMessage('Операция сохранена');
      setQuickForm((prev) => ({ ...prev, amount: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const amount = Number(transferForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Сумма должна быть больше нуля');
      return;
    }
    if (!transferForm.from || !transferForm.to || transferForm.from === transferForm.to) {
      setError('Выберите разные счета');
      return;
    }

    setBusy(true);
    try {
      await ops.addOperation({
        type: 'transfer',
        amount,
        accountFrom: transferForm.from,
        accountTo: transferForm.to,
        category: 'Перевод между счетами',
        note: 'Со страницы Счета',
        date: new Date().toISOString().slice(0, 10),
      });
      setMessage('Перевод выполнен');
      setTransferForm((prev) => ({ ...prev, amount: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async (name) => {
    if (!name) return;
    const confirmed = window.confirm(`Удалить счет «${name}» и все связанные операции?`);
    if (!confirmed) return;
    setMessage('');
    setError('');
    setDeleting(name);
    try {
      await ops.deleteAccount(name);
      setMessage(`Счет «${name}» удален`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting('');
    }
  };

  return (
    <main className="content">
      <section className="section-head">
        <p className="pill">Счета</p>
        <h2>Балансы и быстрые операции</h2>
      </section>

      <div className="panel kpi">
        <div className="panel-head">
          <h3>Общий баланс</h3>
          <span className="chip">Live</span>
        </div>
        <p className="kpi-value">{formatCurrency(totalBalance)}</p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Счета</h3>
          <span className="chip">{accounts.length} активных</span>
        </div>
        {!accounts.length ? (
          <p className="muted">Пока нет счетов.</p>
        ) : (
          <div className="account-list">
            {accounts.map((acc) => (
              <article key={acc.name} className="account-card">
                <div>
                  <p className="muted">{acc.name}</p>
                  <p className="balance-value">{formatCurrency(acc.balance)}</p>
                </div>
                <span className={`chip ${acc.change >= 0 ? 'success' : 'warning'}`}>
                  {acc.change >= 0 ? '+' : ''}{acc.change}%
                </span>
                <button className="ghost danger" type="button" disabled={deleting === acc.name || busy} onClick={() => removeAccount(acc.name)}>
                  {deleting === acc.name ? 'Удаляем...' : 'Удалить'}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Создать счет</h3>
          <span className="chip">Новый</span>
        </div>
        <form className="form column" onSubmit={handleCreateAccount}>
          <div className="operations-grid">
            <label className="field">
              <span>Название счета</span>
              <input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} type="text" required />
            </label>
            <label className="field">
              <span>Начальный баланс (опционально)</span>
              <input value={createForm.balance} onChange={(e) => setCreateForm((p) => ({ ...p, balance: e.target.value }))} type="number" min="1" step="1" />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={busy}>Создать</button>
            <button className="ghost" type="button" onClick={resetForms} disabled={busy}>Сбросить</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Быстрая операция</h3>
          <span className="chip">Пополнение / списание</span>
        </div>
        <form className="form column" onSubmit={handleQuickOp}>
          <div className="operations-grid">
            <label className="field">
              <span>Счет</span>
              <select value={quickForm.account} onChange={(e) => setQuickForm((p) => ({ ...p, account: e.target.value }))}>
                {accountOptions.map((acc) => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Тип</span>
              <select value={quickForm.type} onChange={(e) => setQuickForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="income">Пополнение</option>
                <option value="expense">Списание</option>
              </select>
            </label>
            <label className="field">
              <span>Сумма</span>
              <input value={quickForm.amount} onChange={(e) => setQuickForm((p) => ({ ...p, amount: e.target.value }))} type="number" min="1" step="1" required />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={busy}>Сохранить</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Перевод между счетами</h3>
          <span className="chip">Мгновенно</span>
        </div>
        <form className="form column" onSubmit={handleTransfer}>
          <div className="operations-grid">
            <label className="field">
              <span>Со счета</span>
              <select value={transferForm.from} onChange={(e) => setTransferForm((p) => ({ ...p, from: e.target.value }))}>
                {accountOptions.map((acc) => (
                  <option key={`from-${acc}`} value={acc}>{acc}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>На счет</span>
              <select value={transferForm.to} onChange={(e) => setTransferForm((p) => ({ ...p, to: e.target.value }))}>
                {accountOptions.map((acc) => (
                  <option key={`to-${acc}`} value={acc}>{acc}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Сумма</span>
              <input value={transferForm.amount} onChange={(e) => setTransferForm((p) => ({ ...p, amount: e.target.value }))} type="number" min="1" step="1" required />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={busy}>Перевести</button>
          </div>
        </form>
      </div>

      {message && <p className="chip success">{message}</p>}
      {error && <p className="chip warning">{error}</p>}
    </main>
  );
}

