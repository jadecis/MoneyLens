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
        const message = xhr.responseJSON?.error || xhr.responseText || 'Request failed';
        reject(new Error(message));
      },
    });
  });
}

export function fetchOperations(login) {
  return ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}/operations`, 'GET');
}

export function createOperation(login, payload) {
  return ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}/operations`, 'POST', payload);
}

export function updateOperation(login, id, payload) {
  return ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}/operations/${encodeURIComponent(id)}`, 'PUT', payload);
}

export function deleteOperation(login, id) {
  return ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}/operations/${encodeURIComponent(id)}`, 'DELETE');
}

export function fetchUserState(login) {
  return ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}/state`, 'GET');
}

export function updateUserState(login, payload) {
  return ajaxJson(`${API_URL}/users/${encodeURIComponent(login)}/state`, 'PUT', payload);
}
