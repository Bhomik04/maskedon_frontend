/**
 * InAppBrowserGate.tsx
 *
 * Detects when the app is opened inside an in-app browser (Gmail, Instagram,
 * Facebook, etc.) and shows a full-screen prompt to redirect the user to their
 * default external browser.
 *
 * Why this matters:
 *  - Gmail on Android opens links in its own WebView (in-app browser).
 *  - The in-app WebView does NOT share cookies, session storage, or auth state
 *    with the user's real Chrome/Safari session.
 *  - Password reset, email verification, and any auth flow will silently fail
 *    or produce confusing errors because the Supabase session can't persist.
 *
 * Detection strategy:
 *  - `wv` in Android user-agent = explicitly marked as a WebView build
 *  - Known in-app browser UA strings (Gmail, Facebook, Instagram, etc.)
 *  - We EXCLUDE the MaskedOn Capacitor native app, which also runs in a WebView
 *    but has `window.Capacitor.isNativePlatform() === true`.
 */

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ExternalLink, Copy, Check, Smartphone } from "lucide-react";

/** Routes where auth tokens are in the URL — must open in real browser. */
const AUTH_SENSITIVE_PATHS = ["/reset-password", "/verify-email"];

function detectInAppBrowser(): { isInApp: boolean; platform: "android" | "ios" | "other" } {
  // Skip detection when running inside the MaskedOn native Capacitor app
  if (Capacitor.isNativePlatform()) {
    return { isInApp: false, platform: "other" };
  }

  const ua = navigator.userAgent;

  // Android WebView: user agent contains 'wv' build flag
  const isAndroidWebView = /Android/.test(ua) && /wv\b/.test(ua);

  // iOS in-app browser: has iPhone/iPad but NOT Safari (pure Safari always includes 'Safari/')
  // CriOS = Chrome on iOS (not an in-app browser)
  const isIOSInApp =
    /iPhone|iPad|iPod/.test(ua) &&
    !/Safari\//.test(ua) &&
    !/CriOS\//.test(ua) &&
    !/FxiOS\//.test(ua);

  // Known in-app browser identifiers
  const knownInApp = /FBAN|FBAV|Instagram|Twitter\/|Line\/|GSA\/|MicroMessenger/.test(ua);

  const isInApp = isAndroidWebView || isIOSInApp || knownInApp;
  const platform = /Android/.test(ua) ? "android" : /iPhone|iPad|iPod/.test(ua) ? "ios" : "other";

  return { isInApp, platform };
}

function buildChromeIntentUrl(url: string): string {
  // intent:// URL scheme opens the URL in Chrome on Android.
  // Falls back to Play Store if Chrome isn't installed.
  const encoded = encodeURIComponent(url);
  return (
    `intent://${url.replace(/^https?:\/\//, "")}` +
    `#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${encoded};end`
  );
}

export default function InAppBrowserGate() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [copied, setCopied] = useState(false);
  const [isAuthSensitive, setIsAuthSensitive] = useState(false);

  useEffect(() => {
    const { isInApp, platform: p } = detectInAppBrowser();
    if (isInApp) {
      setShow(true);
      setPlatform(p);
      setIsAuthSensitive(AUTH_SENSITIVE_PATHS.some((path) => window.location.pathname.startsWith(path)));
    }
  }, []);

  if (!show) return null;

  const currentUrl = window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  }

  function openInChrome() {
    window.location.href = buildChromeIntentUrl(currentUrl);
  }

  // On non-auth pages, allow dismissal; on auth-sensitive pages, block entirely
  function handleDismiss() {
    if (!isAuthSensitive) setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-bg/95 backdrop-blur-xl">
      <div className="glass-panel rounded-3xl p-8 max-w-sm w-full space-y-6 border border-primary/20 shadow-2xl text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-text">Open in Your Browser</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            {isAuthSensitive
              ? "This link contains a secure token that only works in your real browser. Please open it in Chrome or Safari to continue."
              : "This page works best in your default browser. Some features may not work correctly in this in-app browser."}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {platform === "android" && (
            <button
              type="button"
              onClick={openInChrome}
              className="w-full btn-primary-luxe flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm tap-active"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Chrome
            </button>
          )}

          <button
            type="button"
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-border bg-surface-light text-text text-sm font-semibold hover:bg-surface-lighter transition tap-active"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-success" />Link Copied!</>
            ) : (
              <><Copy className="w-4 h-4" />Copy Link</>
            )}
          </button>

          {platform === "ios" && (
            <p className="text-xs text-text-dim leading-relaxed">
              Paste the copied link in Safari to continue.
            </p>
          )}

          {platform === "android" && (
            <p className="text-xs text-text-dim leading-relaxed">
              Or copy the link and paste it in Chrome.
            </p>
          )}
        </div>

        {/* Dismiss — only on non-auth-sensitive pages */}
        {!isAuthSensitive && (
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-text-dim hover:text-text transition underline underline-offset-2"
          >
            Continue anyway
          </button>
        )}
      </div>
    </div>
  );
}
