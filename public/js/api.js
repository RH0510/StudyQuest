// Fetch wrapper for the StudyQuest API. The session cookie is sent automatically by the browser;
// the CSRF token is fetched once and added to every request that changes data (Section 4.8).
let csrfToken = null;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', { credentials: 'same-origin' });
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

export async function api(method, path, body, { retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken || await loadCsrfToken();

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach StudyQuest. Check your internet connection and try again.');
  }

  if (response.status === 403 && method !== 'GET' && retry) {
    csrfToken = null;
    return api(method, path, body, { retry: false });
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('sq:unauthorised'));
    }
    throw new ApiError(response.status, (data && data.error) || 'Something went wrong. Please try again.');
  }
  return data;
}

export const get = (path) => api('GET', path);
export const post = (path, body = {}) => api('POST', path, body);
export const put = (path, body = {}) => api('PUT', path, body);
export const del = (path, body) => api('DELETE', path, body);
