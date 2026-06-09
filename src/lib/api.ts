import axios from "axios";
import { Capacitor } from "@capacitor/core";
import {
  isCacheable,
  getFromCache,
  setInCache,
  invalidateOnMutation,
  getInflight,
  setInflight,
} from "./api-cache";
import type { AuthTokens } from "../types";

const PROD_API_BASE_URL = "https://maskedon-backend.onrender.com/api/v1";

const isNativeApp = Capacitor.isNativePlatform();
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
  } catch {
    return true;
  }
}

const shouldUseConfiguredBase = Boolean(
  configuredApiBaseUrl &&
    (
      import.meta.env.DEV ||
      (!isNativeApp && import.meta.env.PROD) ||
      (isNativeApp && !isLocalhostUrl(configuredApiBaseUrl))
    )
);

const apiBaseUrl = shouldUseConfiguredBase
  ? configuredApiBaseUrl!
  : (import.meta.env.PROD || isNativeApp ? PROD_API_BASE_URL : "/api/v1");
const wakeUrl = `${apiBaseUrl}/app/version`;
let wakePromise: Promise<void> | null = null;
let tokenRefreshPromise: Promise<void> | null = null;
const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and continue with cookie auth when available.
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures and continue with cookie auth when available.
  }
}

export function getStoredAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_STORAGE_KEY) || readStorage("auth_token");
}

export function getStoredRefreshToken(): string | null {
  return readStorage(REFRESH_TOKEN_STORAGE_KEY);
}

export function persistAuthTokens(tokens: AuthTokens): void {
  writeStorage(ACCESS_TOKEN_STORAGE_KEY, tokens.access_token);
  writeStorage("auth_token", tokens.access_token);
  writeStorage(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
}

export function clearStoredAuthTokens(): void {
  removeStorage(ACCESS_TOKEN_STORAGE_KEY);
  removeStorage("auth_token");
  removeStorage(REFRESH_TOKEN_STORAGE_KEY);
}

function isAuthPath(url: string): boolean {
  return url.startsWith("/auth/") || url.includes("/auth/");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Warm up sleeping backends (e.g. Render free tier) before user actions like login.
export async function ensureBackendAwake(maxWaitMs = 65000): Promise<void> {
  if (wakePromise) {
    return wakePromise;
  }

  wakePromise = (async () => {
    const startedAt = Date.now();
    let lastError: unknown;

    while (Date.now() - startedAt < maxWaitMs) {
      try {
        await axios.get(wakeUrl, { timeout: 9000 });
        return;
      } catch (error) {
        lastError = error;
        await sleep(3000);
      }
    }

    throw lastError ?? new Error("Backend is taking too long to wake up");
  })();

  try {
    await wakePromise;
  } finally {
    wakePromise = null;
  }
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: cache check (GET only) ────────────────────
// This intercepts GET requests and:
// 1. Returns cached data immediately if FRESH (skips network entirely)
// 2. Returns cached data immediately if STALE, but fires background revalidation
// 3. Deduplicates concurrent identical requests
api.interceptors.request.use(async (config) => {
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${storedAccessToken}`;
  }

  // Only cache GET requests
  if (config.method !== "get") return config;

  const url = (config.baseURL || "") + (config.url || "");
  const fullUrl = config.params
    ? `${url}?${new URLSearchParams(config.params).toString()}`
    : url;

  // Strip base URL for cache key matching
  const cacheUrl = fullUrl.replace(apiBaseUrl, "");

  if (!isCacheable(cacheUrl)) return config;

  const cached = getFromCache(cacheUrl);

  if (cached && cached.status === "fresh") {
    // FRESH HIT: Return cached data, abort network request
    // We use the adapter override trick to return cached data without hitting network
    config.adapter = () =>
      Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: "OK (cache: fresh)",
        headers: {},
        config,
      });
    return config;
  }

  if (cached && cached.status === "stale") {
    // STALE HIT: Return stale data now, schedule background refresh
    // Fire background refresh (don't await it)
    const bgConfig = { ...config, _skipCache: true } as typeof config & { _skipCache?: boolean };
    // Use a separate axios instance for background refresh to avoid infinite loop
    const refreshPromise = axios({
      ...bgConfig,
      baseURL: config.baseURL,
      url: config.url,
      params: config.params,
      withCredentials: true,
      headers: {
        ...config.headers,
      },
    })
      .then((res) => {
        setInCache(cacheUrl, res.data);
      })
      .catch(() => {
        // Background refresh failed — stale data stays
      });

    // Don't block — fire and forget
    void refreshPromise;

    // Return stale data immediately
    config.adapter = () =>
      Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: "OK (cache: stale-while-revalidate)",
        headers: {},
        config,
      });
    return config;
  }

  // NOT CACHED or EXPIRED — check deduplication
  const inflight = getInflight(cacheUrl);
  if (inflight) {
    // Another identical request is in flight — wait for it
    config.adapter = async () => {
      const data = await inflight;
      return { data, status: 200, statusText: "OK (cache: dedup)", headers: {}, config };
    };
    return config;
  }

  // Mark this URL as the canonical inflight request
  // We'll resolve the promise in the response interceptor
  let resolveInflight: (data: unknown) => void;
  let rejectInflight: (err: unknown) => void;
  const promise = new Promise<unknown>((resolve, reject) => {
    resolveInflight = resolve;
    rejectInflight = reject;
  });
  setInflight(cacheUrl, promise);

  // Attach resolvers to config so response interceptor can call them
  (config as any)._cacheResolve = resolveInflight!;
  (config as any)._cacheReject = rejectInflight!;
  (config as any)._cacheUrl = cacheUrl;

  return config;
});

// ─── Response interceptor: cache write (GET only) ───────────────────
api.interceptors.response.use(
  (res) => {
    const config = res.config;

    // Store successful GET responses in cache
    if (config.method === "get" && res.status >= 200 && res.status < 300) {
      const cacheUrl = (config as any)._cacheUrl as string | undefined;
      if (cacheUrl && isCacheable(cacheUrl)) {
        setInCache(cacheUrl, res.data);

        // Resolve dedup promise
        const resolve = (config as any)._cacheResolve as ((data: unknown) => void) | undefined;
        if (resolve) resolve(res.data);
      }
    }

    // Invalidate related caches on mutations
    if (config.method && ["post", "put", "patch", "delete"].includes(config.method)) {
      const mutationPath = (config.url || "").replace(apiBaseUrl, "");
      invalidateOnMutation(mutationPath);
    }

    return res;
  },
  async (error) => {
    const config = error.config;

    // Reject dedup promise on error
    if (config) {
      const reject = (config as any)._cacheReject as ((err: unknown) => void) | undefined;
      if (reject) reject(error);
    }

    // Auto-refresh on 401 (with deduplication to prevent parallel refreshes)
    const original = config;

    const requestUrl = ((original?.url as string | undefined) || "").trim();
    const shouldSkipRefresh = isAuthPath(requestUrl);

    if (error.response?.status === 401 && original && !original._retry) {
      if (shouldSkipRefresh) {
        return Promise.reject(error);
      }

      original._retry = true;

      // If a refresh is already in progress, wait for it then retry
      if (tokenRefreshPromise) {
        try {
          await tokenRefreshPromise;
          return api(original);
        } catch {
          return Promise.reject(error);
        }
      }

      // Be the refresh leader
      const storedRefreshToken = getStoredRefreshToken();
      tokenRefreshPromise = axios
        .post(
          `${apiBaseUrl}/auth/refresh`,
          storedRefreshToken ? { refresh_token: storedRefreshToken } : {},
          { withCredentials: true }
        )
        .then((refreshRes) => {
          const tokens = refreshRes.data?.data?.tokens as AuthTokens | undefined;
          if (tokens) {
            persistAuthTokens(tokens);
          }
        })
        .catch((refreshErr) => {
          // Only wipe stored tokens when the server explicitly rejects the refresh
          // token (401 / 403 = token is invalid or revoked). Network errors, 5xx,
          // or timeouts are transient — don't clear so the user can recover on the
          // next app open without being logged out.
          if (
            axios.isAxiosError(refreshErr) &&
            refreshErr.response &&
            (refreshErr.response.status === 401 || refreshErr.response.status === 403)
          ) {
            clearStoredAuthTokens();
          }
          throw refreshErr;
        })
        .finally(() => {
          tokenRefreshPromise = null;
        });

      try {
        await tokenRefreshPromise;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
