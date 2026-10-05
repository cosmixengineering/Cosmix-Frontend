import { env } from '@/config/env';
import { authAdapter } from '@/auth/adapter';
import { SESSION_EXPIRED_EVENT } from '@/constants/events';
import { ApiError } from './api-error';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'credentials' | 'headers'> {
  body?: unknown;
}
export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('API requests must use a relative endpoint path.');
  }
  const url = new URL(env.apiBaseUrl + path);
  const base = new URL(env.apiBaseUrl);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname + '/')) {
    throw new Error('API request is outside the configured endpoint scope.');
  }
  const accessToken = await authAdapter.getAccessToken();
  if (!accessToken) throw new ApiError(401);
  const { body, signal, ...init } = options;
  const headers = new Headers({
    Accept: 'application/json',
    Authorization: 'Bearer ' + accessToken,
  });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'omit',
    redirect: 'error',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError(response.status, response.headers.get('X-Correlation-ID') ?? undefined);
  }
  return response.status === 204 ? undefined : response.json();
}
