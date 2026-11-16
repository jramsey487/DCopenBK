import { useCallback, useEffect, useState } from "react";

import { getToken } from "./authStorage";

export class ApiError extends Error {
  constructor(message, { status = 0, data = null, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.cause = cause;
  }
}

let onUnauthorized = null;
/** Register once (e.g. in HomePage) to log the user out on a 401. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// ------------------------------------------------------------------ cache

const cache = new Map(); // path -> { data, at }
const inflight = new Map(); // path -> Promise
const listeners = new Set();

export function peek(path, ttl = Infinity) {
  const hit = cache.get(path);
  if (!hit) return undefined;
  return Date.now() - hit.at <= ttl ? hit.data : undefined;
}

/** Drop cached GETs whose path starts with `prefix` and tell mounted hooks. */
export function invalidate(...prefixes) {
  prefixes.forEach((prefix) => {
    [...cache.keys()]
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => cache.delete(key));
    listeners.forEach((listener) => listener(prefix));
  });
}

/** Call on login/logout so one user's data never shows for the next. */
export function clearApiCache() {
  cache.clear();
  inflight.clear();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------- request

async function parseBody(response, as) {
  if (as === "blob") return response.blob();
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data, status) {
  if (typeof data === "string" && data && data.length < 300) return data;
  if (data && typeof data === "object") {
    for (const key of ["detail", "Error", "error", "Invalid serializer"]) {
      if (typeof data[key] === "string") return data[key];
    }
    const first = Object.values(data).flat()[0];
    if (typeof first === "string") return first;
  }
  if (status === 401) return "You're signed out. Please log in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Not found.";
  if (status === 429) return "Too many requests. Please wait and try again.";
  if (status >= 500) return "Server error. Please try again.";
  return "Something went wrong. Please try again.";
}

/**
 * Single entry point for every API call. Resolves with parsed JSON, throws
 * ApiError otherwise (including network failures, status 0).
 *
 *   await api("/api/update-ballkid", {
 *     method: "PATCH",
 *     body: { first_name, last_name, is_checked_in: true },
 *     invalidates: ["/api/list", "/api/sorted-list"],
 *   });
 */
export async function api(
  path,
  { method = "GET", body, headers, as, invalidates } = {}
) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const token = getToken();

  let response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...(body !== undefined && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError("Could not reach the server.", { status: 0, cause });
  }

  const data = await parseBody(response, response.ok ? as : undefined);

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(errorMessage(data, response.status), {
      status: response.status,
      data,
    });
  }

  if (method !== "GET" && invalidates?.length) invalidate(...invalidates);
  return data;
}

/** Cached, de-duplicated GET. Concurrent callers share one request. */
export function apiGet(path, { ttl = 0, force = false } = {}) {
  if (!force && ttl) {
    const fresh = peek(path, ttl);
    if (fresh !== undefined) return Promise.resolve(fresh);
  }
  if (inflight.has(path)) return inflight.get(path);

  const promise = api(path)
    .then((data) => {
      cache.set(path, { data, at: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, promise);
  return promise;
}

// ------------------------------------------------------------------- hook

/**
 * Stale-while-revalidate GET.
 *
 *   const { data, error, loading, refetch } = useApi("/api/list", { ttl: 60000 });
 *
 * - shows cached data instantly (if any), then revalidates
 * - `ttl` > 0 skips the network entirely while the cache is that fresh
 * - refetches automatically when a mutation invalidates a matching prefix
 * - `path` can be null / `enabled: false` to wait on a dependency
 */
export function useApi(path, { ttl = 0, enabled = true } = {}) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ path: null, data: undefined, error: null });
  const active = enabled && Boolean(path);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const force = tick > 0;

    const cached = peek(path);
    if (cached !== undefined) {
      setState({ path, data: cached, error: null });
    }
    if (!force && ttl && peek(path, ttl) !== undefined) return undefined;

    apiGet(path, { force: true })
      .then((data) => {
        if (!cancelled) setState({ path, data, error: null });
      })
      .catch((error) => {
        if (!cancelled) {
          setState((prev) => ({
            path,
            data: prev.path === path ? prev.data : undefined,
            error,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, active, ttl, tick]);

  useEffect(
    () =>
      subscribe((prefix) => {
        if (path && path.startsWith(prefix)) setTick((t) => t + 1);
      }),
    [path]
  );

  const current =
    state.path === path ? state : { data: path ? peek(path) : undefined, error: null };

  return {
    data: current.data,
    error: current.error,
    loading: active && current.data === undefined && !current.error,
    refetch: useCallback(() => setTick((t) => t + 1), []),
  };
}