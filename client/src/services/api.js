export const authEvents = new EventTarget();
let csrfToken = null;
let sessionRequest = null;
export async function session() {
  if (!sessionRequest) {
    sessionRequest = fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('We could not connect to the store. Please try again.');
        const data = await response.json();
        csrfToken = data.csrfToken;
        return data;
      }).finally(() => { sessionRequest = null; });
  }
  return sessionRequest;
}
export async function api(path, options = {}) {
  const method = options.method || 'GET';
  if (!['GET', 'HEAD'].includes(method) && !csrfToken) await session();
  let response;
  try {
    response = await fetch('/api' + path, {
      ...options, method, credentials: 'same-origin',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(!['GET', 'HEAD'].includes(method) ? { 'x-csrf-token': csrfToken } : {}), ...options.headers },
      ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {})
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    const networkError = new Error('The store could not be reached. Check your connection and try again.'); networkError.status = 0; throw networkError;
  }
  const data = response.status === 204 ? {} : await response.json().catch(() => ({ error: 'An unexpected response was received.' }));
  if (data.csrfToken) csrfToken = data.csrfToken;
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.status = response.status; error.fields = data.fields || {};
    if (response.status === 403) csrfToken = null;
    if (response.status === 401 && !path.startsWith('/auth/')) authEvents.dispatchEvent(new Event('expired'));
    throw error;
  }
  return data;
}


