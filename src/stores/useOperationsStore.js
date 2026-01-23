import { computed, reactive, toRefs, watch } from 'vue';
import {
  createOperation,
  deleteOperation,
  fetchOperations,
  updateOperation,
  fetchUserState,
  updateUserState,
} from '../services/operationsApi.js';
import { useAuthStore } from './useAuthStore.js';

const state = reactive({
  operations: [],
  accountsList: ['\u041e\u0431\u0449\u0438\u0439 \u0441\u0447\u0435\u0442'],
  loading: false,
  error: null,
  lastSync: null,
});

let watchAttached = false;

export function useOperationsStore() {
  const auth = useAuthStore();
  const login = computed(() => auth.user?.value?.login || auth.user?.login || null);

  const loadAccounts = async () => {
    if (!login.value) {
      state.accountsList = ['Общий счет'];
      return;
    }
    try {
      const resp = await fetchUserState(login.value);
      const accounts = Array.isArray(resp.accounts) && resp.accounts.length ? resp.accounts : ['Общий счет'];
      state.accountsList = accounts;
    } catch {
      state.accountsList = ['Общий счет'];
    }
  };

  const saveAccounts = async () => {
    if (!login.value) return;
    try {
      await updateUserState(login.value, { accounts: state.accountsList });
    } catch {
      // ignore
    }
  };

  const addAccountName = (name) => {
    const normalized = (name || '').trim();
    if (!normalized) return;
    if (!state.accountsList.includes(normalized)) {
      state.accountsList = [...state.accountsList, normalized];
      saveAccounts();
    }
  };

  const removeAccountName = (name) => {
    const normalized = (name || '').trim();
    if (!normalized) return;
    state.accountsList = state.accountsList.filter((n) => n !== normalized);
    saveAccounts();
  };

  const clear = () => {
    state.operations = [];
    state.error = null;
    state.lastSync = null;
    state.accountsList = ['Общий счет'];
  };

  const loadOperations = async () => {
    if (!login.value) {
      clear();
      return;
    }
    state.loading = true;
    state.error = null;
    try {
      const data = await fetchOperations(login.value);
      state.operations = Array.isArray(data.operations) ? data.operations : [];
      state.lastSync = new Date().toISOString();
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const addOperation = async (payload) => {
    if (!login.value) throw new Error('Пользователь не найден');
    state.loading = true;
    state.error = null;
    try {
      const { operation } = await createOperation(login.value, payload);
      state.operations = [...state.operations, operation];
      if (operation.account) addAccountName(operation.account);
      if (operation.accountFrom) addAccountName(operation.accountFrom);
      if (operation.accountTo) addAccountName(operation.accountTo);
      return operation;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const updateOperationById = async (id, payload) => {
    if (!login.value) throw new Error('Пользователь не найден');
    state.loading = true;
    state.error = null;
    try {
      const { operation } = await updateOperation(login.value, id, payload);
      state.operations = state.operations.map((op) => (op.id === id ? operation : op));
      if (operation.account) addAccountName(operation.account);
      if (operation.accountFrom) addAccountName(operation.accountFrom);
      if (operation.accountTo) addAccountName(operation.accountTo);
      return operation;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const deleteOperationById = async (id) => {
    if (!login.value) throw new Error('Пользователь не найден');
    state.loading = true;
    state.error = null;
    try {
      await deleteOperation(login.value, id);
      state.operations = state.operations.filter((op) => op.id !== id);
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const sortedOperations = computed(() =>
    [...state.operations].sort((a, b) => new Date(b.date) - new Date(a.date)),
  );

  const recentOperations = computed(() => sortedOperations.value.slice(0, 6));

  const totals = computed(() =>
    state.operations.reduce(
      (acc, op) => {
        const amount = Number(op.amount) || 0;
        if (op.type === 'income') acc.income += amount;
        else if (op.type === 'expense') acc.expense += amount;
        return acc;
      },
      { income: 0, expense: 0 },
    ),
  );

  const accounts = computed(() => {
    const map = new Map();
    state.accountsList.forEach((name) => {
      map.set(name, { name, balance: 0, inflow: 0, outflow: 0 });
    });
    const upsert = (name) => {
      if (!name) return null;
      if (!map.has(name)) {
        map.set(name, { name, balance: 0, inflow: 0, outflow: 0 });
      }
      return map.get(name);
    };

    state.operations.forEach((op) => {
      const amount = Number(op.amount) || 0;
      if (op.type === 'income') {
        const acc = upsert(op.account);
        if (acc) {
          acc.balance += amount;
          acc.inflow += amount;
        }
      } else if (op.type === 'expense') {
        const acc = upsert(op.account);
        if (acc) {
          acc.balance -= amount;
          acc.outflow += amount;
        }
      } else if (op.type === 'transfer') {
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
  });

  const totalBalance = computed(() => accounts.value.reduce((sum, acc) => sum + acc.balance, 0));

  const categoryTotals = computed(() => {
    const map = new Map();
    state.operations.forEach((op) => {
      if (op.type !== 'expense') return;
      const key = op.category || 'Другое';
      const prev = map.get(key) || 0;
      map.set(key, prev + (Number(op.amount) || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  });

  if (!watchAttached) {
    watchAttached = true;
    watch(
      () => login.value,
      (newLogin) => {
        if (newLogin) {
          loadAccounts();
          loadOperations();
        } else {
          clear();
        }
      },
      { immediate: true },
    );
  }

  return {
    ...toRefs(state),
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
    accountsList: computed(() => state.accountsList),
    addAccountName,
    removeAccountName,
    deleteAccount: async (accountName) => {
      const name = (accountName || '').trim();
      if (!name) return;
      const related = state.operations.filter(
        (op) => op.account === name || op.accountFrom === name || op.accountTo === name,
      );
      for (const op of related) {
        await deleteOperationById(op.id);
      }
      removeAccountName(name);
    },
  };
}
