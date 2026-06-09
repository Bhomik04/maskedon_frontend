import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

/**
 * Initialize native Capacitor plugins when running on a mobile device.
 * On web this is a no-op.
 *
 * @param navigate    React Router navigate function (accepts string paths or -1 for back)
 * @param getLocation Returns the current pathname — use a ref so it's always fresh
 */
export async function initCapacitor(
  navigate: (path: string | number) => void,
  getLocation: () => string,
) {
  if (!Capacitor.isNativePlatform()) return;

  // ── Status Bar ──
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#080c15' });
  } catch {
    // Ignore — plugin may not be available on all platforms
  }

  // ── Splash Screen ──
  try {
    await SplashScreen.hide();
  } catch {
    // Auto-hidden by config
  }

  // ── Keyboard ──
  try {
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });
  } catch {
    // Not available on this platform
  }

  // ── Back Button (Android) ──
  // Pages with modals call e.preventDefault() via useBackButton() to close the
  // overlay first. If nothing intercepts the event, we decide navigation here
  // based on whether the user is on a root tab page or a sub-page.

  // Root tab pages: pressing back should NOT navigate further back through history
  // (it would just traverse tab-switching history and land on Feed unexpectedly).
  // On these pages, back either does nothing or exits the app on the home tab.
  const ROOT_PATHS = new Set(['/', '/events', '/my-requests', '/access-hub', '/notifications', '/profile/me', '/search']);

  App.addListener('backButton', ({ canGoBack }) => {
    // Give modals/overlays first chance to intercept
    const consumed = window.dispatchEvent(new CustomEvent('capacitor:backButton', { cancelable: true }));
    if (!consumed) return; // A modal handled it (called preventDefault)

    const currentPath = getLocation();

    if (ROOT_PATHS.has(currentPath)) {
      // On a root tab — only exit if on the home/feed tab, otherwise stay put
      if (currentPath === '/') {
        App.exitApp();
      }
      // Other root tabs: do nothing (back would go back through tab history, confusing)
      return;
    }

    // On a sub-page — go back in history
    if (canGoBack) {
      navigate(-1);
    } else {
      // No history available — fall back to home
      navigate('/');
    }
  });

  // ── Deep Links ──
  // Whitelist allowed path prefixes to prevent open-redirect attacks
  const ALLOWED_DEEP_LINK_PREFIXES = [
    '/events/', '/profile/', '/feed', '/auth/',
    '/dashboard', '/settings', '/notifications',
    '/search', '/create-event',
    '/reset-password', '/verify-email',  // email-linked auth pages
  ];

  App.addListener('appUrlOpen', ({ url }) => {
    let path = '';
    try {
      const parsed = new URL(url);
      path = parsed.pathname + parsed.search;
    } catch {
      path = url.replace(/^maskedon:\/\//, '/').replace(/^https?:\/\/[^/]+/, '');
    }
    // Only navigate to known app routes
    if (path && path !== '/' && ALLOWED_DEEP_LINK_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      navigate(path);
    }
  });
}

/**
 * Update the native status bar style to match the current app theme.
 * Call this when the user toggles dark/light mode.
 */
export async function setNativeTheme(theme: 'dark' | 'light') {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#080c15' : '#edf0fa' });
  } catch {
    // no-op
  }
}

/**
 * Returns true when running inside a native Capacitor shell (Android/iOS).
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns the current platform: 'ios' | 'android' | 'web'
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
