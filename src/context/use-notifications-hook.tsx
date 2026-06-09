import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./auth-hook";
import io from "socket.io-client";
import api from "../lib/api";
import type { ConversationMessage } from "../types";

const PROD_WS_URL = "https://maskedon-backend.onrender.com";

const isNativeApp = Capacitor.isNativePlatform();
const configuredWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
  } catch {
    return true;
  }
}

const shouldUseConfiguredWsUrl = Boolean(
  configuredWsUrl &&
    (
      import.meta.env.DEV ||
      (!isNativeApp && import.meta.env.PROD) ||
      (isNativeApp && !isLocalhostUrl(configuredWsUrl))
    )
);

const WS_URL = shouldUseConfiguredWsUrl
  ? configuredWsUrl!
  : (import.meta.env.PROD || isNativeApp ? PROD_WS_URL : undefined);

interface FrontendNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  reference_id?: string;
  reference_type?: string;
}

interface NotificationsContextValue {
  unreadCount: number;
  notification: FrontendNotification | null;
  latestMessage: ConversationMessage | null;
  isConnected: boolean;
  socketError: string | null;
  updateUnreadCount: (count: number) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Singleton provider — mount once at the app root (inside AuthProvider).
 * All consumers share the single WebSocket connection.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState<FrontendNotification | null>(null);
  const [latestMessage, setLatestMessage] = useState<ConversationMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // Fetch initial unread count via REST immediately on login
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotification(null);
      return;
    }
    api.get("/notifications/unread-count")
      .then((res) => setUnreadCount(res.data.data.count ?? 0))
      .catch(() => {});
  }, [user]);

  // Single shared WebSocket connection per login session
  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
    if (!token) return;

    const wsUrl =
      WS_URL ||
      (window.location.hostname === "localhost"
        ? "ws://localhost:5000"
        : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);

    const socket = io(wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      setSocketError(null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("notification:new", (notif: FrontendNotification) => {
      setNotification(notif);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on("message:new", (msg: ConversationMessage) => {
      setLatestMessage(msg);
    });

    socket.on("notification:unread-count", (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    socket.on("error", (err: string) => {
      setSocketError(err);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const updateUnreadCount = useCallback((count: number) => setUnreadCount(count), []);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        notification,
        latestMessage,
        isConnected,
        socketError,
        updateUnreadCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Hook for consuming the shared notifications context.
 * Must be used inside NotificationsProvider.
 */
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
