import $ from 'jquery';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ajaxJson(url, method, data) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url,
      method,
      contentType: 'application/json',
      data: data ? JSON.stringify(data) : undefined,
      dataType: 'json',
      success: (resp) => resolve(resp),
      error: (xhr) => {
        const message =
          xhr.responseJSON?.error ||
          xhr.responseText ||
          'Request failed';
        reject(new Error(message));
      },
    });
  });
}

export function registerUser(payload) {
  return ajaxJson(`${API_URL}/register`, 'POST', payload);
}

export async function loginUser(payload) {
  const data = await ajaxJson(`${API_URL}/login`, 'POST', payload);
  return data.user;
}

export async function fetchProfile(login) {
  const data = await ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}`, 'GET');
  return data.user;
}

export async function updateProfile(login, payload) {
  const data = await ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}`, 'PUT', payload);
  return data.user;
}
