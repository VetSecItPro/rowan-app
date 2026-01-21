import { CSRF_HEADER_NAME } from '@/lib/security/csrf';

let csrfTokenPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = sessionStorage.getItem('csrf_token');
  if (stored) {
    return stored;
  }

  const response = await fetch('/api/csrf/token', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data?.token) {
    sessionStorage.setItem('csrf_token', data.token);
    return data.token;
  }

  return null;
}

async function getCsrfToken(): Promise<string | null> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().finally(() => {
      csrfTokenPromise = null;
    });
  }
  return csrfTokenPromise;
}

export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = await getCsrfToken();

  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
}
