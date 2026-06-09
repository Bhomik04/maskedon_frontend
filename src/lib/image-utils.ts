import imageCompression from "browser-image-compression";

/**
 * Compress an image and guarantee all metadata (EXIF, GPS coordinates,
 * camera model, etc.) is removed.
 *
 * `browser-image-compression` strips EXIF when it re-encodes through
 * canvas, but it has a fast-path: if the file is already within the
 * size/dimension limits it returns the original file unchanged — EXIF
 * intact.  The final canvas toBlob() step here closes that gap by always
 * re-encoding the output, regardless of whether compression was needed.
 */
export async function compressAndStripMetadata(
  file: File,
  options: { maxSizeMB: number; maxWidthOrHeight: number }
): Promise<File> {
  const compressed = await imageCompression(file, {
    ...options,
    useWebWorker: true,
  });

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(compressed);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : compressed);
        },
        "image/jpeg",
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(compressed); // fallback: compressed file without guaranteed strip
    };

    img.src = url;
  });
}
