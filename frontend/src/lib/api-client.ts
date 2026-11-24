import { ApiError } from '@/types/api';

/**
 * Token Storage Architecture:
 *
 * Technical Correction:
 * We use an in-memory variable `_inMemoryToken` as the primary source of truth.
 * For user convenience across page reloads in this SPA, we sync with `sessionStorage`.
 *
 * Security Trade-off Documentation:
 * - In-Memory Storage: Immune to XSS persistent extraction, but lost on page refresh.
 * - SessionStorage: Scoped strictly to the browser tab session (cleared when tab closes,
 *   not accessible across tabs or after session termination). Never use localStorage for JWT
 *   to mitigate long-lived cross-site script theft.
 */
let _inMemoryToken: string | null = null;
const SESSION_STORAGE_KEY = 'toeic_auth_token';

export function getAuthToken(): string | null {
  if (_inMemoryToken) return _inMemoryToken;
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      _inMemoryToken = stored;
      return stored;
    }
  } catch {
    // sessionStorage might be restricted in private/iframe browsing
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  _inMemoryToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Graceful fallback to memory only
  }
}

/**
 * Central API Client with interceptor simulation, safe header injection,
 * and unified ApiError normalization.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown = null;
    let message = `Lỗi yêu cầu (${response.status}): ${response.statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        if (typeof errorData === 'object' && errorData !== null && 'message' in errorData) {
          message = String((errorData as { message: unknown }).message);
        }
      } else {
        const text = await response.text();
        if (text) message = text;
      }
    } catch {
      // Fallback to HTTP status text
    }

    throw new ApiError(response.status, message, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
