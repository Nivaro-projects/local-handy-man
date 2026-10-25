import { supabase } from './supabase';

export interface BffRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class BffError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'BffError';
    this.status = status;
    this.code = code;
  }
}

interface BffErrorBody {
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Calls the same-origin BFF. The Supabase access token is attached here and
 * nowhere else, so the service_role key never reaches the browser.
 */
export async function bffFetch<T>(path: string, options: BffRequestOptions = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('BFF path must be a relative path beginning with "/".');
  }

  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
    cache: 'no-store',
    signal: options.signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as BffErrorBody | null;
    throw new BffError(
      payload?.message ?? payload?.error ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.code
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}
