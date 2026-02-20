import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.API_PORT || 3001;
const DATA_DIR = path.join(__dirname, 'users');
const DEFAULT_ACCOUNT = 'РћР±С‰РёР№ СЃС‡РµС‚';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Cannot create data directory', err);
  }
}

function normalizeLogin(login) {
  if (!login) return null;
  const normalized = login.trim().toLowerCase();
  return /^[a-z0-9._-]+$/.test(normalized) ? normalized : null;
}

function userFilePath(login) {
  return path.join(DATA_DIR, `${login}.json`);
}

function ensureUserDefaults(data) {
  if (!Array.isArray(data.operations)) data.operations = [];
  if (!Array.isArray(data.goals)) data.goals = [];
  if (!Array.isArray(data.budgets)) data.budgets = [];
  if (!Array.isArray(data.accounts) || !data.accounts.length) data.accounts = [DEFAULT_ACCOUNT];
  return data;
}

async function loadUser(login) {
  const userFile = userFilePath(login);
  const raw = await fs.readFile(userFile, 'utf-8');
  return { data: ensureUserDefaults(JSON.parse(raw)), userFile };
}

async function saveUser(userFile, data) {
  await fs.writeFile(userFile, JSON.stringify(data, null, 2), 'utf-8');
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(payload));
}

function sendUserNotFound(res, message = 'user not found') {
  sendJson(res, 404, { error: message });
}

function isOperationValidationError(err) {
  if (!err?.message) return false;
  return err.message === 'invalid type' || err.message.includes('account') || err.message.includes('amount');
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

async function handleRegister(req, res) {
  try {
    const body = await readBody(req);
    const login = normalizeLogin(body.login);
    const password = body.password?.trim();

    if (!login || !password) {
      sendJson(res, 400, { error: 'login and password are required' });
      return;
    }

    const userFile = userFilePath(login);
    try {
      await fs.access(userFile);
      sendJson(res, 409, { error: 'user already exists' });
      return;
    } catch {
      // user does not exist
    }

    const profile = { name: body.name || '', email: body.email || '' };
    if (body.phone) profile.phone = body.phone;

    const initialUser = ensureUserDefaults({
      login,
      password,
      profile,
      operations: [],
      goals: [],
      budgets: [],
      accounts: [DEFAULT_ACCOUNT],
    });

    await saveUser(userFile, initialUser);
    sendJson(res, 200, { ok: true, login });
  } catch (err) {
    console.error('Register error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleLogin(req, res) {
  try {
    const body = await readBody(req);
    const login = normalizeLogin(body.login);
    const password = body.password?.trim();

    if (!login || !password) {
      sendJson(res, 400, { error: 'login and password are required' });
      return;
    }

    let stored;
    try {
      ({ data: stored } = await loadUser(login));
    } catch {
      sendUserNotFound(res, 'Р›РѕРіРёРЅ РЅРµ РЅР°Р№РґРµРЅ');
      return;
    }

    if (stored.password !== password) {
      sendJson(res, 401, { error: 'РќРµРїСЂР°РІРёР»СЊРЅС‹Р№ РїР°СЂРѕР»СЊ' });
      return;
    }

    sendJson(res, 200, { ok: true, user: { login: stored.login, profile: stored.profile || {} } });
  } catch (err) {
    console.error('Login error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleGetUser(res, login) {
  try {
    const { data } = await loadUser(login);
    sendJson(res, 200, { ok: true, user: { login: data.login, profile: data.profile || {} } });
  } catch {
    sendUserNotFound(res);
  }
}

async function handleUpdateUser(req, res, login) {
  try {
    const body = await readBody(req);
    let stored;

    try {
      ({ data: stored } = await loadUser(login));
    } catch {
      if (!body.password) {
        sendUserNotFound(res, 'Р›РѕРіРёРЅ РЅРµ РЅР°Р№РґРµРЅ');
        return;
      }
      stored = { login, password: body.password, profile: {}, operations: [] };
    }

    const safeStored = ensureUserDefaults(stored);
    const updated = {
      login: safeStored.login,
      password: body.password?.trim() || safeStored.password,
      profile: {
        name: body.name ?? safeStored.profile?.name ?? '',
        email: body.email ?? safeStored.profile?.email ?? '',
        phone: body.phone ?? safeStored.profile?.phone ?? '',
      },
      operations: safeStored.operations,
      goals: safeStored.goals,
      budgets: safeStored.budgets,
      accounts: safeStored.accounts,
    };

    await saveUser(userFilePath(login), updated);
    sendJson(res, 200, { ok: true, user: { login: updated.login, profile: updated.profile } });
  } catch (err) {
    console.error('Update user error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleGetState(res, login) {
  try {
    const { data } = await loadUser(login);
    sendJson(res, 200, {
      ok: true,
      goals: data.goals,
      budgets: data.budgets,
      accounts: data.accounts,
    });
  } catch (err) {
    const status = err.code === 'ENOENT' ? 404 : 500;
    sendJson(res, status, { error: err.code === 'ENOENT' ? 'user not found' : 'internal error' });
  }
}

async function handleUpdateState(req, res, login) {
  try {
    const body = await readBody(req);
    const { data, userFile } = await loadUser(login);

    if (Array.isArray(body.goals)) data.goals = body.goals;
    if (Array.isArray(body.budgets)) data.budgets = body.budgets;
    if (Array.isArray(body.accounts)) data.accounts = body.accounts.length ? body.accounts : [DEFAULT_ACCOUNT];

    await saveUser(userFile, data);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    const status = err.code === 'ENOENT' ? 404 : 500;
    sendJson(res, status, { error: err.code === 'ENOENT' ? 'user not found' : 'internal error' });
  }
}

function validateOperation(body) {
  const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
  const amount = Number(body.amount);

  if (!['income', 'expense', 'transfer'].includes(type)) {
    throw new Error('invalid type');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be positive number');
  }

  const base = {
    type,
    amount,
    category: (body.category || '').toString().trim() || 'Uncategorized',
    note: (body.note || '').toString().trim(),
    date: body.date ? new Date(body.date).toISOString() : new Date().toISOString(),
    account: (body.account || '').toString().trim() || null,
    accountFrom: (body.accountFrom || '').toString().trim() || null,
    accountTo: (body.accountTo || '').toString().trim() || null,
  };

  if (type === 'transfer') {
    if (!base.accountFrom || !base.accountTo || base.accountFrom === base.accountTo) {
      throw new Error('transfer requires different source and destination accounts');
    }
  } else if (!base.account) {
    throw new Error('account is required for income/expense');
  }

  return base;
}

async function handleGetOperations(res, login) {
  try {
    const { data } = await loadUser(login);
    sendJson(res, 200, { ok: true, operations: data.operations || [] });
  } catch (err) {
    const status = err.code === 'ENOENT' ? 404 : 500;
    sendJson(res, status, { error: err.code === 'ENOENT' ? 'user not found' : 'internal error' });
  }
}

async function handleCreateOperation(req, res, login) {
  try {
    const body = await readBody(req);
    const parsed = validateOperation(body);
    const { data, userFile } = await loadUser(login);

    const id = body.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const now = new Date().toISOString();
    const operation = { ...parsed, id, createdAt: now, updatedAt: now };

    data.operations.push(operation);
    await saveUser(userFile, data);
    sendJson(res, 200, { ok: true, operation });
  } catch (err) {
    if (isOperationValidationError(err)) {
      sendJson(res, 400, { error: err.message });
      return;
    }
    if (err.code === 'ENOENT') {
      sendUserNotFound(res);
      return;
    }
    console.error('Create operation error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleUpdateOperation(req, res, login, opId) {
  try {
    const body = await readBody(req);
    const parsed = validateOperation(body);
    const { data, userFile } = await loadUser(login);

    const idx = data.operations.findIndex((op) => op.id === opId);
    if (idx === -1) {
      sendJson(res, 404, { error: 'operation not found' });
      return;
    }

    const updated = {
      ...data.operations[idx],
      ...parsed,
      updatedAt: new Date().toISOString(),
      id: opId,
    };

    data.operations[idx] = updated;
    await saveUser(userFile, data);
    sendJson(res, 200, { ok: true, operation: updated });
  } catch (err) {
    if (isOperationValidationError(err)) {
      sendJson(res, 400, { error: err.message });
      return;
    }
    if (err.code === 'ENOENT') {
      sendUserNotFound(res);
      return;
    }
    console.error('Update operation error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleDeleteOperation(res, login, opId) {
  try {
    const { data, userFile } = await loadUser(login);
    const next = data.operations.filter((op) => op.id !== opId);

    if (next.length === data.operations.length) {
      sendJson(res, 404, { error: 'operation not found' });
      return;
    }

    data.operations = next;
    await saveUser(userFile, data);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    const status = err.code === 'ENOENT' ? 404 : 500;
    sendJson(res, status, { error: err.code === 'ENOENT' ? 'user not found' : 'internal error' });
  }
}

async function requestHandler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/register' && req.method === 'POST') {
    await handleRegister(req, res);
    return;
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    await handleLogin(req, res);
    return;
  }

  if (!url.pathname.startsWith('/api/users/')) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  const [, , , loginSegment, subPath, opId] = url.pathname.split('/');
  const login = normalizeLogin(loginSegment);

  if (!login) {
    sendJson(res, 400, { error: 'invalid login' });
    return;
  }

  if (subPath === 'state') {
    if (req.method === 'GET') await handleGetState(res, login);
    else if (req.method === 'PUT') await handleUpdateState(req, res, login);
    else sendJson(res, 404, { error: 'not found' });
    return;
  }

  if (subPath === 'operations') {
    if (req.method === 'GET') await handleGetOperations(res, login);
    else if (req.method === 'POST') await handleCreateOperation(req, res, login);
    else if (req.method === 'PUT' && opId) await handleUpdateOperation(req, res, login, opId);
    else if (req.method === 'DELETE' && opId) await handleDeleteOperation(res, login, opId);
    else sendJson(res, 404, { error: 'not found' });
    return;
  }

  if (req.method === 'GET') {
    await handleGetUser(res, login);
    return;
  }

  if (req.method === 'PUT') {
    await handleUpdateUser(req, res, login);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

async function start() {
  await ensureDataDir();
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`Auth API listening on http://localhost:${PORT}`);
  });
}

start();
