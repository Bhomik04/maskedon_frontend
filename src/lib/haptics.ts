import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Light haptic feedback — for toggles, selections.
 */
export async function hapticsLight() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* no-op on unsupported devices */ }
}

/**
 * Medium haptic feedback — for likes, taps.
 */
export async function hapticsMedium() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* no-op */ }
}

/**
 * Success haptic notification — for completed actions.
 */
export async function hapticsSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* no-op */ }
}
