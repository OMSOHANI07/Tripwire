// Browser-side helpers: API calls and remembering personal tokens.

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong. Please try again.", data.code);
  return data as T;
}

const key = (tripId: string) => `gtd:${tripId}:token`;

/** Remember this device's personal token so results/voting work without the link. */
export function saveToken(tripId: string, token: string) {
  try {
    localStorage.setItem(key(tripId), token);
  } catch {
    // storage unavailable: the personal link still works
  }
}

export function loadToken(tripId: string): string | null {
  try {
    return localStorage.getItem(key(tripId));
  } catch {
    return null;
  }
}

export function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export const links = {
  share: (id: string) => `${origin()}/t/${id}`,
  results: (id: string) => `${origin()}/t/${id}/results`,
  status: (id: string) => `${origin()}/t/${id}/status`,
  admin: (id: string, key: string) => `${origin()}/t/${id}/admin?key=${encodeURIComponent(key)}`,
  me: (id: string, token: string) => `${origin()}/t/${id}/me?token=${encodeURIComponent(token)}`,
};
