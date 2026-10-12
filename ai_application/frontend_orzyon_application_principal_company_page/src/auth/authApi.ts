import type { Idioma } from '../i18n/idiomas';

export type AuthFailureReason = 'invalid' | 'rate-limited' | 'unavailable';

export class AuthRequestError extends Error {
  reason: AuthFailureReason;

  constructor(reason: AuthFailureReason) {
    super(reason);
    this.name = 'AuthRequestError';
    this.reason = reason;
  }
}

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL?.trim().replace(/\/$/, '');

async function post(
  path: string,
  payload: Record<string, string>,
  expectedStatus: number,
  signal?: AbortSignal,
): Promise<void> {
  if (!AUTH_API_URL) {
    throw new AuthRequestError('unavailable');
  }

  let response: Response;

  try {
    response = await fetch(`${AUTH_API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new AuthRequestError('unavailable');
  }

  if (response.status === expectedStatus) return;
  if (response.status === 401 || response.status === 400) throw new AuthRequestError('invalid');
  if (response.status === 429) throw new AuthRequestError('rate-limited');
  throw new AuthRequestError('unavailable');
}

export function createSession(email: string, password: string, signal?: AbortSignal): Promise<void> {
  return post('/v1/auth/session', { email, password }, 204, signal);
}

export function createRegistration(
  name: string,
  email: string,
  password: string,
  locale: Idioma,
  signal?: AbortSignal,
): Promise<void> {
  return post('/v1/auth/registrations', { name, email, password, locale }, 202, signal);
}

export function requestPasswordReset(email: string, locale: Idioma, signal?: AbortSignal): Promise<void> {
  return post('/v1/auth/password-reset-requests', { email, locale }, 202, signal);
}
