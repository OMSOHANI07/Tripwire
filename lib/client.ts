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

/**
 * Remember this device's personal token so results/voting work without the
 * link, and add the trip to "My trips".
 */
export function saveToken(tripId: string, token: string, info?: { name?: string; participantName?: string }) {
  try {
    localStorage.setItem(key(tripId), token);
  } catch {
    // storage unavailable: the personal link still works
  }
  rememberTrip({ tripId, token, ...info });
}

// ---------------------------------------------------------------------------
// "My trips": every trip this device created, joined or opened. Kept in
// localStorage only (no accounts), so it's per device and per browser.
// ---------------------------------------------------------------------------

export interface SavedTrip {
  tripId: string;
  name?: string;
  /** Present if this device has the organizer link. */
  organizerKey?: string;
  /** Present if this device has a personal edit link. */
  token?: string;
  participantName?: string;
  savedAt: number;
}

const TRIPS_KEY = "gtd:trips";
const TRIPS_EVENT = "gtd-trips";

function readTrips(): SavedTrip[] {
  try {
    const list = JSON.parse(localStorage.getItem(TRIPS_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Add or update a saved trip (fields are merged). */
export function rememberTrip(t: Partial<SavedTrip> & { tripId: string }) {
  try {
    const list = readTrips();
    const i = list.findIndex((x) => x.tripId === t.tripId);
    const clean = Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined && v !== ""));
    const merged = { ...(i >= 0 ? list[i] : {}), ...clean, savedAt: Date.now() } as SavedTrip;
    if (i >= 0) list.splice(i, 1);
    list.unshift(merged);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(list.slice(0, 50)));
    window.dispatchEvent(new Event(TRIPS_EVENT));
  } catch {
    // storage unavailable
  }
}

/** One-time import of personal tokens saved before "My trips" existed. */
export function importLegacyTokens() {
  try {
    const known = new Set(readTrips().map((t) => t.tripId));
    for (let i = 0; i < localStorage.length; i++) {
      const m = /^gtd:([a-z0-9]+):token$/.exec(localStorage.key(i) ?? "");
      const token = m && localStorage.getItem(m[0]);
      if (m && token && !known.has(m[1])) rememberTrip({ tripId: m[1], token });
    }
  } catch {
    // storage unavailable
  }
}

export function forgetTrip(tripId: string) {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(readTrips().filter((x) => x.tripId !== tripId)));
    localStorage.removeItem(key(tripId));
    window.dispatchEvent(new Event(TRIPS_EVENT));
  } catch {
    // storage unavailable
  }
}

/** For useSyncExternalStore: re-render when the list changes (any tab). */
export function subscribeTrips(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(TRIPS_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(TRIPS_EVENT, cb);
  };
}

/** Raw snapshot string (stable between renders until the list changes). */
export function tripsSnapshot(): string {
  try {
    return localStorage.getItem(TRIPS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseTrips(snapshot: string): SavedTrip[] {
  try {
    const list = JSON.parse(snapshot);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
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
