import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.API_PORT || 3001;
const DATA_DIR = path.join(__dirname, 'users');

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
  const valid = /^[a-z0-9._-]+$/.test(normalized);
  return valid ? normalized : null;
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
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
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

    const profile = { name: body.name || '', email: body.email || '' };
    if (body.phone) profile.phone = body.phone;
    const userFile = path.join(DATA_DIR, `${login}.json`);

    try {
      await fs.access(userFile);
      sendJson(res, 409, { error: 'user already exists' });
      return;
    } catch {
      // ok, not exists
    }

    await fs.writeFile(
      userFile,
      JSON.stringify(
        {
          login,
          password,
          profile,
        },
        null,
        2,
      ),
      'utf-8',
    );

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

    const userFile = path.join(DATA_DIR, `${login}.json`);
    let stored;
    try {
      const raw = await fs.readFile(userFile, 'utf-8');
      stored = JSON.parse(raw);
    } catch {
      sendJson(res, 404, { error: 'Логин не найден' });
      return;
    }

    if (stored.password !== password) {
      sendJson(res, 401, { error: 'Неправильный пароль' });
      return;
    }

    sendJson(res, 200, { ok: true, user: { login: stored.login, profile: stored.profile || {} } });
  } catch (err) {
    console.error('Login error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleUpdateUser(req, res, loginParam) {
  try {
    const login = normalizeLogin(loginParam);
    if (!login) {
      sendJson(res, 400, { error: 'invalid login' });
      return;
    }
    const body = await readBody(req);
    const userFile = path.join(DATA_DIR, `${login}.json`);
    let stored;
    try {
      const raw = await fs.readFile(userFile, 'utf-8');
      stored = JSON.parse(raw);
    } catch {
      if (!body.password) {
        sendJson(res, 404, { error: 'Логин не найден' });
        return;
      }
      stored = { login, password: body.password, profile: {} };
    }

    const updated = {
      login: stored.login,
      password: body.password?.trim() || stored.password,
      profile: {
        name: body.name ?? stored.profile?.name ?? '',
        email: body.email ?? stored.profile?.email ?? '',
        phone: body.phone ?? stored.profile?.phone ?? '',
      },
    };

    await fs.writeFile(userFile, JSON.stringify(updated, null, 2), 'utf-8');
    sendJson(res, 200, { ok: true, user: { login: updated.login, profile: updated.profile } });
  } catch (err) {
    console.error('Update user error', err);
    sendJson(res, 500, { error: 'internal error' });
  }
}

async function handleGetUser(req, res, loginParam) {
  const login = normalizeLogin(loginParam);
  if (!login) {
    sendJson(res, 400, { error: 'invalid login' });
    return;
  }
  const userFile = path.join(DATA_DIR, `${login}.json`);
  try {
    const raw = await fs.readFile(userFile, 'utf-8');
    const stored = JSON.parse(raw);
    sendJson(res, 200, { ok: true, user: { login: stored.login, profile: stored.profile || {} } });
  } catch {
    sendJson(res, 404, { error: 'user not found' });
  }
}

async function requestHandler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
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

  if (url.pathname.startsWith('/api/users/') && req.method === 'GET') {
    const login = url.pathname.replace('/api/users/', '');
    await handleGetUser(req, res, login);
    return;
  }

  if (url.pathname.startsWith('/api/users/') && req.method === 'PUT') {
    const login = url.pathname.replace('/api/users/', '');
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
