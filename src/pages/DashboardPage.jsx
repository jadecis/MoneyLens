import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useOperations } from '../contexts/OperationsContext.jsx';
import { fetchUserState } from '../services/operationsApi.js';

const PIE_COLORS = ['#22c55e', '#0ea5e9', '#a855f7', '#f97316', '#fbbf24', '#14b8a6', '#ef4444', '#6366f1'];

function formatCurrency(amount) {
  return (amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'L', cx, cy, 'Z'].join(' ');
}

function describeFullCircle(cx, cy, r) {
  return [`M ${cx - r} ${cy}`, `a ${r} ${r} 0 1 0 ${r * 2} 0`, `a ${r} ${r} 0 1 0 ${-r * 2} 0`].join(' ');
}

function buildPie(breakdown) {
  const slices = [];
  let cumulative = 0;

  breakdown.items.forEach((item, idx) => {
    const angle = (item.share || 0) * 360;
    const start = cumulative;
    const end = cumulative + angle;

    const d = angle >= 359.9 ? describeFullCircle(100, 100, 90) : describeArc(100, 100, 90, start, end);
    cumulative = angle >= 359.9 ? start + 360 : end;

    slices.push({
      ...item,
      d,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    });
  });

  return slices;
}

export default function DashboardPage() {
  const auth = useAuth();
  const ops = useOperations();
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  useEffect(() => {
    if (!ops.operations.length && !ops.loading) {
      ops.loadOperations().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    setRangeFrom(from.toISOString().slice(0, 10));
    setRangeTo(today.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    const login = auth.user?.login;
    if (!login) {
      setGoals([]);
      setBudgets([]);
      return;
    }
    fetchUserState(login)
      .then((resp) => {
        setGoals(Array.isArray(resp.goals) ? resp.goals : []);
        setBudgets(Array.isArray(resp.budgets) ? resp.budgets : []);
      })
      .catch(() => {
        setGoals([]);
        setBudgets([]);
      });
  }, [auth.user?.login]);

  const accounts = ops.accounts.length
    ? ops.accounts
    : [
        { name: 'Основной счет', balance: 0, inflow: 0, outflow: 0, change: 0 },
        { name: 'Копилка', balance: 0, inflow: 0, outflow: 0, change: 0 },
      ];

  const avgChange = useMemo(() => {
    if (!accounts.length) return 0;
    const sum = accounts.reduce((acc, item) => acc + (item.change || 0), 0);
    return Math.round(sum / accounts.length);
  }, [accounts]);

  const netChange = useMemo(() => {
    const income = ops.totals.income;
    const expense = ops.totals.expense;
    if (!income && !expense) return 0;
    return Math.round(((income - expense) / Math.max(expense || income, 1)) * 100);
  }, [ops.totals.expense, ops.totals.income]);

  const goalsProgress = goals.map((g) => {
    const target = Number(g.target) || 0;
    const saved = Number(g.saved) || 0;
    return {
      ...g,
      target,
      saved,
      progress: target ? Math.min(100, Math.round((saved / target) * 100)) : 0,
    };
  });

  const usageMap = new Map(ops.categoryTotals.map((item) => [item.name, item.value]));
  const budgetsProgress = budgets.map((b) => {
    const used = Math.round(usageMap.get(b.name) || 0);
    const limit = Math.round(Number(b.limit) || 0);
    const progress = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return { ...b, used, limit, progress };
  });

  const monthForecast = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = Math.max(today.getDate(), 1);
    const daysLeft = Math.max(daysInMonth - daysPassed, 0);

    const monthOps = ops.operations.filter((op) => {
      const d = new Date(op.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const incomeToDate = monthOps.reduce((sum, op) => (op.type === 'income' ? sum + (Number(op.amount) || 0) : sum), 0);
    const expenseToDate = monthOps.reduce((sum, op) => (op.type === 'expense' ? sum + (Number(op.amount) || 0) : sum), 0);

    const dailyIncome = incomeToDate / daysPassed;
    const dailyExpense = expenseToDate / daysPassed;
    const projectedIncome = incomeToDate + dailyIncome * daysLeft;
    const projectedExpense = expenseToDate + dailyExpense * daysLeft;
    const projectedMonthNet = projectedIncome - projectedExpense;
    const projectedBalance = ops.totalBalance + dailyIncome * daysLeft - dailyExpense * daysLeft;

    return {
      daysLeft,
      projectedIncome,
      projectedExpense,
      projectedMonthNet,
      projectedBalance,
    };
  }, [ops.operations, ops.totalBalance]);

  const weeklyReport = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const last7Start = new Date(end);
    last7Start.setDate(last7Start.getDate() - 6);
    const prev7Start = new Date(last7Start);
    prev7Start.setDate(prev7Start.getDate() - 7);
    const prev7End = new Date(last7Start);
    prev7End.setDate(prev7End.getDate() - 1);

    const inRange = (op, from, to) => {
      const d = new Date(op.date);
      return d >= from && d <= to;
    };

    const last7 = ops.operations.filter((op) => inRange(op, last7Start, end));
    const prev7 = ops.operations.filter((op) => inRange(op, prev7Start, prev7End));

    const sumByType = (list, type) => list.reduce((sum, op) => (op.type === type ? sum + (Number(op.amount) || 0) : sum), 0);
    const expense7 = sumByType(last7, 'expense');
    const income7 = sumByType(last7, 'income');
    const prevExpense7 = sumByType(prev7, 'expense');

    const expenseDeltaPct = prevExpense7 > 0 ? Math.round(((expense7 - prevExpense7) / prevExpense7) * 100) : 0;

    const categoryMap = new Map();
    last7.forEach((op) => {
      if (op.type !== 'expense') return;
      const key = op.category || 'Другое';
      categoryMap.set(key, (categoryMap.get(key) || 0) + (Number(op.amount) || 0));
    });
    const topCategory = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])[0];

    const prevCatMap = new Map();
    prev7.forEach((op) => {
      if (op.type !== 'expense') return;
      const key = op.category || 'Другое';
      prevCatMap.set(key, (prevCatMap.get(key) || 0) + (Number(op.amount) || 0));
    });
    let bestSaving = null;
    prevCatMap.forEach((prevValue, key) => {
      const current = categoryMap.get(key) || 0;
      const delta = prevValue - current;
      if (delta > 0 && (!bestSaving || delta > bestSaving.value)) {
        bestSaving = { name: key, value: delta };
      }
    });

    let recommendation = 'Зафиксируйте 1-2 крупных расхода заранее, чтобы сгладить неделю.';
    if (expense7 > income7) {
      recommendation = 'Расходы выше доходов за 7 дней: сократите самую большую категорию на 10-15%.';
    } else if (bestSaving) {
      recommendation = `Хорошая динамика по категории «${bestSaving.name}». Закрепите лимит на этом уровне.`;
    }

    return {
      expense7,
      income7,
      prevExpense7,
      expenseDeltaPct,
      topCategory,
      bestSaving,
      recommendation,
    };
  }, [ops.operations]);

  const daysSinceLastIncome = useMemo(() => {
    const latestIncome = ops.sortedOperations.find((op) => op.type === 'income');
    if (!latestIncome) return null;
    const now = new Date();
    const last = new Date(latestIncome.date);
    const diff = now.getTime() - last.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [ops.sortedOperations]);

  const financePulse = useMemo(() => {
    let score = 100;
    const balance = ops.totalBalance || 0;
    const overBudgetCount = budgetsProgress.filter((b) => b.limit > 0 && b.used > b.limit).length;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthOps = ops.operations.filter((op) => {
      const d = new Date(op.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthIncome = monthOps.reduce((sum, op) => (op.type === 'income' ? sum + (Number(op.amount) || 0) : sum), 0);
    const monthExpense = monthOps.reduce((sum, op) => (op.type === 'expense' ? sum + (Number(op.amount) || 0) : sum), 0);

    if (balance < 0) score -= 35;
    else if (balance < 5000) score -= 20;

    if (monthIncome > 0) {
      const ratio = (monthIncome - monthExpense) / monthIncome;
      if (ratio < 0) score -= 25;
      else if (ratio < 0.1) score -= 10;
      else if (ratio > 0.25) score += 4;
    }

    if (overBudgetCount > 0) score -= clamp(overBudgetCount * 8, 8, 30);
    if (daysSinceLastIncome !== null && daysSinceLastIncome > 10) score -= 10;

    const value = clamp(Math.round(score), 0, 100);
    const level = value >= 75 ? 'stable' : value >= 45 ? 'attention' : 'risk';
    const label = level === 'stable' ? 'Стабильно' : level === 'attention' ? 'Внимание' : 'Риск';
    return { value, level, label };
  }, [budgetsProgress, daysSinceLastIncome, ops.operations, ops.totalBalance]);

  const smartAlerts = useMemo(() => {
    const alerts = [];

    const overBudget = budgetsProgress
      .filter((b) => b.limit > 0 && b.used > b.limit)
      .sort((a, b) => b.used / b.limit - a.used / a.limit)
      .slice(0, 2);
    overBudget.forEach((b) => {
      alerts.push({
        id: `over-${b.id}`,
        level: 'danger',
        title: `Перерасход: ${b.name}`,
        text: `Лимит ${formatCurrency(b.limit)} уже превышен на ${formatCurrency(b.used - b.limit)}.`,
      });
    });

    const nearBudget = budgetsProgress
      .filter((b) => b.limit > 0 && b.used <= b.limit && b.used / b.limit >= 0.8)
      .sort((a, b) => b.used / b.limit - a.used / a.limit)
      .slice(0, 2);
    nearBudget.forEach((b) => {
      alerts.push({
        id: `near-${b.id}`,
        level: 'warning',
        title: `Лимит близко: ${b.name}`,
        text: `Использовано ${Math.round((b.used / b.limit) * 100)}% бюджета (${formatCurrency(b.used)} из ${formatCurrency(b.limit)}).`,
      });
    });

    if (daysSinceLastIncome !== null && daysSinceLastIncome >= 10) {
      alerts.push({
        id: 'income-gap',
        level: 'warning',
        title: 'Давно не было доходов',
        text: `Последний доход был ${daysSinceLastIncome} дн. назад.`,
      });
    }

    const negativeAccount = accounts.find((acc) => acc.balance < 0);
    if (negativeAccount) {
      alerts.push({
        id: `neg-${negativeAccount.name}`,
        level: 'danger',
        title: `Отрицательный баланс: ${negativeAccount.name}`,
        text: `Текущий баланс ${formatCurrency(negativeAccount.balance)}.`,
      });
    }

    if (weeklyReport.prevExpense7 > 0 && weeklyReport.expense7 > weeklyReport.prevExpense7 * 1.25) {
      alerts.push({
        id: 'expense-spike',
        level: 'warning',
        title: 'Скачок расходов за неделю',
        text: `Траты выросли на ${weeklyReport.expenseDeltaPct}% к прошлой неделе.`,
      });
    }

    if (!alerts.length) {
      alerts.push({
        id: 'all-good',
        level: 'info',
        title: 'Критичных сигналов нет',
        text: 'Баланс и траты в допустимых границах.',
      });
    }

    return alerts.slice(0, 5);
  }, [accounts, budgetsProgress, daysSinceLastIncome, weeklyReport]);

  const filteredByRange = useMemo(
    () =>
      ops.sortedOperations.filter((op) => {
        if (rangeFrom && new Date(op.date) < new Date(rangeFrom)) return false;
        if (rangeTo && new Date(op.date) > new Date(rangeTo)) return false;
        return true;
      }),
    [ops.sortedOperations, rangeFrom, rangeTo],
  );

  const categoryBreakdown = useMemo(() => {
    const makeBreakdown = (type) => {
      const map = new Map();
      let total = 0;

      filteredByRange.forEach((op) => {
        if (op.type !== type) return;
        const amount = Number(op.amount) || 0;
        total += amount;
        const key = op.category || 'Другое';
        map.set(key, (map.get(key) || 0) + amount);
      });

      const items = Array.from(map.entries())
        .map(([name, value]) => {
          const share = total ? value / total : 0;
          return {
            name,
            value,
            share,
            percent: Math.round(share * 100),
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      return { total, items };
    };

    return {
      income: makeBreakdown('income'),
      expense: makeBreakdown('expense'),
    };
  }, [filteredByRange]);

  const incomePie = useMemo(() => buildPie(categoryBreakdown.income), [categoryBreakdown.income]);
  const expensePie = useMemo(() => buildPie(categoryBreakdown.expense), [categoryBreakdown.expense]);

  return (
    <main className="content dashboard">
      <section className="dashboard" id="dashboard">
        <div className="section-head">
          <p className="pill">Личный кабинет</p>
          <h2>Дашборд MoneyLens</h2>
          <p className="muted">Актуальные балансы, цели, бюджеты и последние операции синхронизированы с вашим профилем.</p>
        </div>

        <div className="dashboard-grid">
          <div className="panel kpi">
            <div className="panel-head">
              <h3>Общий баланс</h3>
              <span className="chip success">{netChange >= 0 ? '+' : ''}{netChange}% / мес</span>
            </div>
            <p className="kpi-value">{formatCurrency(ops.totalBalance)}</p>
            <div className="kpi-row">
              <div>
                <p className="label">Средний прирост</p>
                <p className="strong">{avgChange}%</p>
              </div>
              <div>
                <p className="label">Всего счетов</p>
                <p className="strong">{accounts.length}</p>
              </div>
            </div>
          </div>

          <div className="panel insight pulse">
            <div className="panel-head">
              <h3>Финансовый пульс</h3>
              <span className={`chip ${financePulse.level === 'stable' ? 'success' : financePulse.level === 'attention' ? 'warning' : ''}`}>
                {financePulse.label}
              </span>
            </div>
            <p className="kpi-value">{financePulse.value}/100</p>
            <div className="progress">
              <div
                className={`progress-fill ${financePulse.level === 'stable' ? 'income' : financePulse.level === 'risk' ? 'expense' : ''}`}
                style={{ width: `${financePulse.value}%` }}
              />
            </div>
            <p className="muted tiny">Индекс учитывает баланс, стабильность доходов и риск перерасхода по бюджетам.</p>
          </div>

          <div className="panel insight forecast">
            <div className="panel-head">
              <h3>Прогноз до конца месяца</h3>
              <span className="chip">{monthForecast.daysLeft} дн. осталось</span>
            </div>
            <p className="strong">Ожидаемый остаток: {formatCurrency(monthForecast.projectedBalance)}</p>
            <p className="muted tiny">Прогнозный итог месяца: {monthForecast.projectedMonthNet >= 0 ? '+' : ''}{formatCurrency(monthForecast.projectedMonthNet)}</p>
            <div className="kpi-row">
              <div>
                <p className="label">Доходы (прогноз)</p>
                <p className="strong">{formatCurrency(monthForecast.projectedIncome)}</p>
              </div>
              <div>
                <p className="label">Расходы (прогноз)</p>
                <p className="strong">{formatCurrency(monthForecast.projectedExpense)}</p>
              </div>
            </div>
          </div>

          <div className="panel insight weekly">
            <div className="panel-head">
              <h3>Недельный авто-отчёт</h3>
              <span className={`chip ${weeklyReport.expenseDeltaPct <= 0 ? 'success' : 'warning'}`}>
                {weeklyReport.expenseDeltaPct > 0 ? '+' : ''}{weeklyReport.expenseDeltaPct}% расходы
              </span>
            </div>
            <p className="muted">За 7 дней: доходы {formatCurrency(weeklyReport.income7)}, расходы {formatCurrency(weeklyReport.expense7)}</p>
            {weeklyReport.topCategory && (
              <p className="tiny">Топ расход: <span className="strong">{weeklyReport.topCategory[0]}</span> ({formatCurrency(weeklyReport.topCategory[1])})</p>
            )}
            {weeklyReport.bestSaving && (
              <p className="tiny">Экономия: <span className="strong">{weeklyReport.bestSaving.name}</span> (−{formatCurrency(weeklyReport.bestSaving.value)})</p>
            )}
            <p className="muted tiny">{weeklyReport.recommendation}</p>
          </div>

          <div className="panel insight alerts">
            <div className="panel-head">
              <h3>Важные уведомления</h3>
              <span className="chip">{smartAlerts.length}</span>
            </div>
            <div className="alerts-list">
              {smartAlerts.map((alert) => (
                <article key={alert.id} className={`alert-card ${alert.level}`}>
                  <p className="strong">{alert.title}</p>
                  <p className="muted tiny">{alert.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel accounts clickable" role="button" tabIndex={0} onClick={() => navigate('/accounts')}>
            <div className="panel-head">
              <h3>Счета</h3>
              <span className="chip">Динамика</span>
            </div>
            <div className="account-list">
              {accounts.map((account) => (
                <article key={account.name} className="account-card">
                  <div>
                    <p className="muted">{account.name}</p>
                    <p className="balance-value">{formatCurrency(account.balance)}</p>
                  </div>
                  <span className={`chip ${account.change >= 0 ? 'success' : 'warning'}`}>
                    {account.change >= 0 ? '+' : ''}{account.change}%
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="panel goals clickable" role="button" tabIndex={0} onClick={() => navigate('/goals')}>
            <div className="panel-head">
              <h3>Цели и копилки</h3>
              <span className="chip">{goalsProgress.length} активных</span>
            </div>
            {!goalsProgress.length ? (
              <p className="muted">Пока нет целей.</p>
            ) : (
              <div className="goal-list">
                {goalsProgress.map((goal) => (
                  <article key={goal.id} className="goal-card">
                    <div className="goal-top">
                      <p className="strong">{goal.name}</p>
                      <p className="muted">{formatCurrency(goal.saved)} / {formatCurrency(goal.target)}</p>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel budgets clickable" role="button" tabIndex={0} onClick={() => navigate('/budgets')}>
            <div className="panel-head">
              <h3>Бюджеты</h3>
              <span className="chip">{budgetsProgress.length} активных</span>
            </div>
            {!budgetsProgress.length ? (
              <p className="muted">Пока нет бюджетов.</p>
            ) : (
              <div className="budget-list">
                {budgetsProgress.map((item) => (
                  <article key={item.id} className="budget-card">
                    <div className="budget-top">
                      <p className="strong">{item.name}</p>
                      <p className="muted">{formatCurrency(item.used)} / {formatCurrency(item.limit)}</p>
                    </div>
                    <div className="progress thin">
                      <div className="progress-fill alt" style={{ width: `${item.progress}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel transactions clickable" role="button" tabIndex={0} onClick={() => navigate('/operations')}>
            <div className="panel-head">
              <h3>Последние операции</h3>
              <span className="chip">{ops.recentOperations.length ? 'Обновлено' : 'Нет данных'}</span>
            </div>
            {!ops.recentOperations.length ? (
              <p className="muted">Пока нет операций.</p>
            ) : (
              <ul className="transaction-list">
                {ops.recentOperations.map((tx) => (
                  <li key={tx.id} className="transaction">
                    <div>
                      <p className="strong">{tx.category}</p>
                      <p className="muted tiny">
                        {tx.type === 'income' ? 'Доход' : tx.type === 'expense' ? 'Расход' : 'Перевод'} · {tx.account || `${tx.accountFrom} → ${tx.accountTo}`} · {formatDate(tx.date)}
                      </p>
                    </div>
                    <p className={`amount ${tx.type === 'income' ? 'positive' : tx.type === 'expense' ? 'negative' : 'neutral'}`}>
                      {tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel charts charts-filter">
            <div className="panel-head">
              <h3>Диапазон анализа</h3>
              <span className="chip">Период</span>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>С</span>
                <input value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} type="date" />
              </label>
              <label className="field">
                <span>По</span>
                <input value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} type="date" />
              </label>
            </div>
          </div>

          <div className="panel charts">
            <div className="panel-head">
              <h3>Доходы по категориям</h3>
              <span className="chip">{categoryBreakdown.income.total ? formatCurrency(categoryBreakdown.income.total) : 'Нет данных'}</span>
            </div>
            {!categoryBreakdown.income.items.length || !categoryBreakdown.income.total ? (
              <div className="muted">Нет доходов в выбранном периоде.</div>
            ) : (
              <div className="pie-wrap">
                <svg viewBox="0 0 200 200" className="pie">
                  <circle cx="100" cy="100" r="92" fill="var(--color-card)" />
                  {incomePie.map((slice) => (
                    <path key={slice.name} d={slice.d} fill={slice.color} opacity="0.92" />
                  ))}
                  <circle cx="100" cy="100" r="48" fill="var(--color-card)" />
                  <text x="100" y="95" textAnchor="middle" className="pie-total">{formatCurrency(categoryBreakdown.income.total)}</text>
                  <text x="100" y="115" textAnchor="middle" className="pie-sub">Доходы</text>
                </svg>
                <div className="chart-legend">
                  {incomePie.map((slice) => (
                    <div key={slice.name} className="legend-row">
                      <span className="legend-dot" style={{ background: slice.color }} />
                      <div className="legend-text">
                        <p className="strong legend-name">{slice.name}</p>
                        <p className="muted tiny">{formatCurrency(slice.value)} · {Math.round(slice.percent || (slice.share || 0) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel charts">
            <div className="panel-head">
              <h3>Расходы по категориям</h3>
              <span className="chip">{categoryBreakdown.expense.total ? formatCurrency(categoryBreakdown.expense.total) : 'Нет данных'}</span>
            </div>
            {!categoryBreakdown.expense.items.length || !categoryBreakdown.expense.total ? (
              <div className="muted">Нет расходов в выбранном периоде.</div>
            ) : (
              <div className="pie-wrap">
                <svg viewBox="0 0 200 200" className="pie">
                  <circle cx="100" cy="100" r="92" fill="var(--color-card)" />
                  {expensePie.map((slice) => (
                    <path key={slice.name} d={slice.d} fill={slice.color} opacity="0.92" />
                  ))}
                  <circle cx="100" cy="100" r="48" fill="var(--color-card)" />
                  <text x="100" y="95" textAnchor="middle" className="pie-total">{formatCurrency(categoryBreakdown.expense.total)}</text>
                  <text x="100" y="115" textAnchor="middle" className="pie-sub">Расходы</text>
                </svg>
                <div className="chart-legend">
                  {expensePie.map((slice) => (
                    <div key={slice.name} className="legend-row">
                      <span className="legend-dot" style={{ background: slice.color }} />
                      <div className="legend-text">
                        <p className="strong legend-name">{slice.name}</p>
                        <p className="muted tiny">{formatCurrency(slice.value)} · {Math.round(slice.percent || (slice.share || 0) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}


