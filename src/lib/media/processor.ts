import sharp from "sharp";

export interface ProcessedDerivatives {
  thumb: Buffer;
  medium: Buffer;
  large: Buffer;
  width: number;
  height: number;
  format: string;
}

export type SupportedMimeType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Inspect magic bytes using only the first 12 bytes slice of the file.
 * Implementation hardening: Does not read the whole file for signature detection.
 */
export function detectImageMimeFromMagicBytes(slice: Uint8Array): SupportedMimeType | null {
  if (slice.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (slice[0] === 0xff && slice[1] === 0xd8 && slice[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    slice[0] === 0x89 &&
    slice[1] === 0x50 &&
    slice[2] === 0x4e &&
    slice[3] === 0x47 &&
    slice[4] === 0x0d &&
    slice[5] === 0x0a &&
    slice[6] === 0x1a &&
    slice[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    slice[0] === 0x52 &&
    slice[1] === 0x49 &&
    slice[2] === 0x46 &&
    slice[3] === 0x46 &&
    slice[8] === 0x57 &&
    slice[9] === 0x45 &&
    slice[10] === 0x42 &&
    slice[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Process raw image buffer into WebP derivatives with strict bounds and metadata stripping.
 */
export async function processImageBuffer(buffer: Buffer): Promise<ProcessedDerivatives> {
  // Pixel-bomb protection: max 64 megapixels
  const image = sharp(buffer, {
    limitInputPixels: 64_000_000,
    failOn: "error",
  });

  // Auto-orient based on EXIF orientation tag before processing
  image.rotate();

  // Inspect header metadata without full decode
  const metadata = await image.metadata();

  if (!metadata.format) {
    throw new Error("Unable to determine image format");
  }

  const normalizedFormat = metadata.format.toLowerCase();
  if (normalizedFormat !== "jpeg" && normalizedFormat !== "png" && normalizedFormat !== "webp") {
    throw new Error(`Unsupported image format: ${metadata.format}. Only JPEG, PNG, and WebP are allowed.`);
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid image dimensions (zero or negative)");
  }

  if (width > 8000 || height > 8000) {
    throw new Error(`Image dimensions ${width}x${height} exceed maximum allowed 8000x8000`);
  }

  // Generate derivatives with default metadata stripping to WebP
  // 1. Thumb: 200x200 cover crop
  const thumbPromise = sharp(buffer, { limitInputPixels: 64_000_000 })
    .rotate()
    .resize(200, 200, { fit: "cover", position: "centre" })
    .webp({ quality: 80 })
    .toBuffer();

  // 2. Medium: 800px longest edge
  const mediumPromise = sharp(buffer, { limitInputPixels: 64_000_000 })
    .rotate()
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // 3. Large: 1400px longest edge
  const largePromise = sharp(buffer, { limitInputPixels: 64_000_000 })
    .rotate()
    .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const [thumb, medium, large] = await Promise.all([thumbPromise, mediumPromise, largePromise]);

  return {
    thumb,
    medium,
    large,
    width,
    height,
    format: normalizedFormat,
  };
}
