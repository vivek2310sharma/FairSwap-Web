import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { detectImageMimeFromMagicBytes } from "@/lib/media/processor";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_OUTPUT_BYTES = 200 * 1024; // matches bucket file_size_limit
export const AVATAR_MAX_INPUT_PIXELS = 25_000_000;
export const AVATAR_SIZE = 256;

export class AvatarProcessingError extends Error {
  constructor(
    public readonly code: "EMPTY" | "TOO_LARGE" | "UNSUPPORTED_TYPE" | "INVALID_IMAGE" | "OUTPUT_TOO_LARGE",
    message: string
  ) {
    super(message);
  }
}

/** Server-built object path: `<verified user id>/<random hex>.webp`. Never client-supplied. */
export function buildAvatarPath(userId: string): string {
  return `${userId}/${randomBytes(16).toString("hex")}.webp`;
}

/**
 * Validates and re-encodes an uploaded image to a small square WebP.
 * - magic-byte type check (jpeg/png/webp only; client MIME is ignored)
 * - input size and decoded-pixel limits
 * - EXIF-orient, then re-encode WITHOUT metadata (no withMetadata call => EXIF/GPS/ICC stripped)
 * The unprocessed original is never stored.
 */
export async function processAvatarImage(input: Buffer): Promise<Buffer> {
  if (input.length === 0) throw new AvatarProcessingError("EMPTY", "No image was provided.");
  if (input.length > AVATAR_MAX_INPUT_BYTES) {
    throw new AvatarProcessingError("TOO_LARGE", "Image must be 5 MB or smaller.");
  }
  if (!detectImageMimeFromMagicBytes(input.subarray(0, 12))) {
    throw new AvatarProcessingError("UNSUPPORTED_TYPE", "Use a JPEG, PNG or WebP image.");
  }

  for (const quality of [75, 60, 45]) {
    let output: Buffer;
    try {
      output = await sharp(input, { limitInputPixels: AVATAR_MAX_INPUT_PIXELS, failOn: "error" })
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
        .webp({ quality, effort: 4 })
        .toBuffer();
    } catch {
      throw new AvatarProcessingError("INVALID_IMAGE", "This image could not be read. Try a different one.");
    }
    if (output.length <= AVATAR_MAX_OUTPUT_BYTES) return output;
  }
  throw new AvatarProcessingError("OUTPUT_TOO_LARGE", "This image is too detailed. Try a simpler one.");
}
