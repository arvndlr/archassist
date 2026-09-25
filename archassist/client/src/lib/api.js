const TOKEN_KEY = 'archassist_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('archassist:unauthorized'));
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.details);
  }
  return data;
}

export function errorText(err) {
  if (err?.details?.length) return `${err.message}: ${err.details.map((d) => `${d.path} ${d.message}`).join('; ')}`;
  return err?.message ?? 'Something went wrong';
}
