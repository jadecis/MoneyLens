import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createOperation,
  deleteOperation,
  fetchOperations,
  fetchUserState,
  updateOperation,
  updateUserState,
} from '../services/operationsApi.js';
import { useAuth } from './AuthContext.jsx';

const OperationsContext = createContext(null);

export function OperationsProvider({ children }) {
  const auth = useAuth();
  const login = auth.user?.login || null;

  const [operations, setOperations] = useState([]);
  const [accountsList, setAccountsList] = useState(['Общий счет']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const clear = useCallback(() => {
    setOperations([]);
    setError(null);
    setLastSync(null);
    setAccountsList(['Общий счет']);
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!login) {
      setAccountsList(['Общий счет']);
      return;
    }
    try {
      const resp = await fetchUserState(login);
      const accounts = Array.isArray(resp.accounts) && resp.accounts.length ? resp.accounts : ['Общий счет'];
      setAccountsList(accounts);
    } catch {
      setAccountsList(['Общий счет']);
    }
  }, [login]);

  const saveAccounts = useCallback(
    async (nextAccounts) => {
      if (!login) return;
      try {
        await updateUserState(login, { accounts: nextAccounts });
      } catch {
        // ignore
      }
    },
    [login],
  );

  const addAccountName = useCallback(
    (name) => {
      const normalized = (name || '').trim();
      if (!normalized) return;
      setAccountsList((prev) => {
        if (prev.includes(normalized)) return prev;
        const next = [...prev, normalized];
        saveAccounts(next);
        return next;
      });
    },
    [saveAccounts],
  );

  const removeAccountName = useCallback(
    (name) => {
      const normalized = (name || '').trim();
      if (!normalized) return;
      setAccountsList((prev) => {
        const next = prev.filter((item) => item !== normalized);
        saveAccounts(next);
        return next;
      });
    },
    [saveAccounts],
  );

  const loadOperations = useCallback(async () => {
    if (!login) {
      clear();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOperations(login);
      setOperations(Array.isArray(data.operations) ? data.operations : []);
      setLastSync(new Date().toISOString());
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clear, login]);

  const addOperation = useCallback(
    async (payload) => {
      if (!login) throw new Error('Пользователь не найден');
      setLoading(true);
      setError(null);
      try {
        const { operation } = await createOperation(login, payload);
        setOperations((prev) => [...prev, operation]);
        if (operation.account) addAccountName(operation.account);
        if (operation.accountFrom) addAccountName(operation.accountFrom);
        if (operation.accountTo) addAccountName(operation.accountTo);
        return operation;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addAccountName, login],
  );

  const updateOperationById = useCallback(
    async (id, payload) => {
      if (!login) throw new Error('Пользователь не найден');
      setLoading(true);
      setError(null);
      try {
        const { operation } = await updateOperation(login, id, payload);
        setOperations((prev) => prev.map((op) => (op.id === id ? operation : op)));
        if (operation.account) addAccountName(operation.account);
        if (operation.accountFrom) addAccountName(operation.accountFrom);
        if (operation.accountTo) addAccountName(operation.accountTo);
        return operation;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addAccountName, login],
  );

  const deleteOperationById = useCallback(
    async (id) => {
      if (!login) throw new Error('Пользователь не найден');
      setLoading(true);
      setError(null);
      try {
        await deleteOperation(login, id);
        setOperations((prev) => prev.filter((op) => op.id !== id));
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [login],
  );

  const deleteAccount = useCallback(
    async (accountName) => {
      const name = (accountName || '').trim();
      if (!name) return;
      const related = operations.filter((op) => op.account === name || op.accountFrom === name || op.accountTo === name);
      for (const op of related) {
        await deleteOperationById(op.id);
      }
      removeAccountName(name);
    },
    [deleteOperationById, operations, removeAccountName],
  );

  useEffect(() => {
    if (login) {
      loadAccounts();
      loadOperations().catch(() => {});
    } else {
      clear();
    }
  }, [clear, loadAccounts, loadOperations, login]);

  const sortedOperations = useMemo(
    () => [...operations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [operations],
  );

  const recentOperations = useMemo(() => sortedOperations.slice(0, 6), [sortedOperations]);

  const totals = useMemo(
    () =>
      operations.reduce(
        (acc, op) => {
          const amount = Number(op.amount) || 0;
          if (op.type === 'income') acc.income += amount;
          if (op.type === 'expense') acc.expense += amount;
          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [operations],
  );

  const accounts = useMemo(() => {
    const map = new Map();
    accountsList.forEach((name) => {
      map.set(name, { name, balance: 0, inflow: 0, outflow: 0 });
    });

    const upsert = (name) => {
      if (!name) return null;
      if (!map.has(name)) map.set(name, { name, balance: 0, inflow: 0, outflow: 0 });
      return map.get(name);
    };

    operations.forEach((op) => {
      const amount = Number(op.amount) || 0;
      if (op.type === 'income') {
        const acc = upsert(op.account);
        if (acc) {
          acc.balance += amount;
          acc.inflow += amount;
        }
      }
      if (op.type === 'expense') {
        const acc = upsert(op.account);
        if (acc) {
          acc.balance -= amount;
          acc.outflow += amount;
        }
      }
      if (op.type === 'transfer') {
        const from = upsert(op.accountFrom);
        const to = upsert(op.accountTo);
        if (from) {
          from.balance -= amount;
          from.outflow += amount;
        }
        if (to) {
          to.balance += amount;
          to.inflow += amount;
        }
      }
    });

    return Array.from(map.values())
      .map((acc) => ({
        ...acc,
        change:
          acc.inflow + acc.outflow === 0
            ? 0
            : Math.round(((acc.inflow - acc.outflow) / (acc.inflow + acc.outflow)) * 100),
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [accountsList, operations]);

  const totalBalance = useMemo(() => accounts.reduce((sum, item) => sum + item.balance, 0), [accounts]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    operations.forEach((op) => {
      if (op.type !== 'expense') return;
      const key = op.category || 'Другое';
      map.set(key, (map.get(key) || 0) + (Number(op.amount) || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [operations]);

  const value = useMemo(
    () => ({
      operations,
      accountsList,
      loading,
      error,
      lastSync,
      loadOperations,
      addOperation,
      updateOperation: updateOperationById,
      deleteOperation: deleteOperationById,
      sortedOperations,
      recentOperations,
      totals,
      accounts,
      totalBalance,
      categoryTotals,
      clear,
      addAccountName,
      removeAccountName,
      deleteAccount,
    }),
    [
      accounts,
      accountsList,
      addAccountName,
      addOperation,
      categoryTotals,
      clear,
      deleteAccount,
      deleteOperationById,
      error,
      lastSync,
      loadOperations,
      loading,
      operations,
      recentOperations,
      removeAccountName,
      sortedOperations,
      totalBalance,
      totals,
      updateOperationById,
    ],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const ctx = useContext(OperationsContext);
  if (!ctx) throw new Error('useOperations должен использоваться внутри OperationsProvider');
  return ctx;
}
