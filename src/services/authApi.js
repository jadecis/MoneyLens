const API_URL = import.meta.env.VITE_API_URL || '/api';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      try {
        message = await response.text();
      } catch {
        // ignore
      }
    }
    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export function registerUser(payload) {
  return requestJson('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  const data = await requestJson('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function fetchProfile(login) {
  const data = await requestJson(`/users/${encodeURIComponent(login)}`);
  return data.user;
}

export async function updateProfile(login, payload) {
  const data = await requestJson(`/users/${encodeURIComponent(login)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.user;
}
