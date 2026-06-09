import { useEffect } from 'react';

/**
 * Registers a handler for the Android hardware back button (via Capacitor).
 * When the handler is active and the back button is pressed, `onBack` is called
 * and the default navigation is prevented.
 *
 * NOTE: Only handles the Capacitor native back button event. The global back-
 * navigation logic (sub-page vs root tab) lives in AppShell via initCapacitor.
 *
 * @param active  Whether the handler should currently intercept the back button (e.g. modal is open)
 * @param onBack  Called when the back button is pressed while `active` is true
 */
export function useBackButton(active: boolean, onBack: () => void) {
  useEffect(() => {
    if (!active) return;

    function handler(e: Event) {
      e.preventDefault();
      onBack();
    }

    window.addEventListener('capacitor:backButton', handler);
    return () => {
      window.removeEventListener('capacitor:backButton', handler);
    };
  }, [active, onBack]);
}
