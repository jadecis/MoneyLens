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

export function fetchOperations(login) {
  return requestJson(`/users/${encodeURIComponent(login)}/operations`);
}

export function createOperation(login, payload) {
  return requestJson(`/users/${encodeURIComponent(login)}/operations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOperation(login, id, payload) {
  return requestJson(`/users/${encodeURIComponent(login)}/operations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteOperation(login, id) {
  return requestJson(`/users/${encodeURIComponent(login)}/operations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function fetchUserState(login) {
  return requestJson(`/users/${encodeURIComponent(login)}/state`);
}

export function updateUserState(login, payload) {
  return requestJson(`/users/${encodeURIComponent(login)}/state`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
