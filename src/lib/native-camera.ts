import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Take a photo using the native camera (on mobile) or fall back to file input (on web).
 * Returns a File object ready for FormData upload, or null if cancelled.
 */
export async function takePhoto(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt, // Let user choose camera or gallery
      width: 1920,
      height: 1920,
    });

    if (!image.webPath) return null;

    // Fetch the image URI and convert to a File
    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const ext = image.format === 'png' ? 'png' : 'jpeg';
    return new File([blob], `photo.${ext}`, { type: `image/${ext}` });
  } catch {
    // User cancelled or permission denied
    return null;
  }
}
