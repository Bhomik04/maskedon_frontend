/**
 * Cashfree Payments Drop.js SDK loader for maskedon.
 *
 * Dynamically loads the Cashfree JS SDK and returns a checkout instance.
 * Works in web browser and Capacitor WebView.
 *
 * Usage:
 *   const cf = await loadCashfreeSDK();
 *   cf.checkout({ paymentSessionId, redirectTarget: "_self" });
 *
 * After payment, Cashfree redirects to the return_url with ?order_id=<id> appended.
 * The frontend reads this query param and calls /pay/verify with { order_id }.
 */

declare global {
  interface Window {
    Cashfree?: (config: { mode: "production" | "sandbox" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: string }) => void;
    };
  }
}

let sdkLoaded = false;

export async function loadCashfreeSDK() {
  if (!sdkLoaded || !window.Cashfree) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="cashfree.com/js"]');
      if (existing) {
        // Script tag already in DOM — wait a tick for it to finish executing
        setTimeout(resolve, 0);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => {
        sdkLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
      document.head.appendChild(script);
    });
  }

  if (!window.Cashfree) {
    throw new Error("Cashfree SDK did not initialise correctly");
  }

  const isSandbox = import.meta.env.VITE_CASHFREE_SANDBOX === "true" || !import.meta.env.PROD;
  const mode = isSandbox ? "sandbox" : "production";
  return window.Cashfree({ mode });
}
