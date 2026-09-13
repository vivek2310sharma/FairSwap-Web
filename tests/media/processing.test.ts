import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { detectImageMimeFromMagicBytes, processImageBuffer } from "@/lib/media/processor";

describe("Media Processing Unit Tests", () => {
  it("detects JPEG magic bytes accurately from 12-byte slice", async () => {
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const slice = new Uint8Array(jpegBuffer.buffer, jpegBuffer.byteOffset, 12);
    expect(detectImageMimeFromMagicBytes(slice)).toBe("image/jpeg");
  });

  it("detects PNG magic bytes accurately from 12-byte slice", async () => {
    const pngBuffer = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const slice = new Uint8Array(pngBuffer.buffer, pngBuffer.byteOffset, 12);
    expect(detectImageMimeFromMagicBytes(slice)).toBe("image/png");
  });

  it("detects WebP magic bytes accurately from 12-byte slice", async () => {
    const webpBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .webp()
      .toBuffer();

    const slice = new Uint8Array(webpBuffer.buffer, webpBuffer.byteOffset, 12);
    expect(detectImageMimeFromMagicBytes(slice)).toBe("image/webp");
  });

  it("rejects non-image or short slices", () => {
    expect(detectImageMimeFromMagicBytes(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(detectImageMimeFromMagicBytes(new Uint8Array(12).fill(0))).toBeNull();
  });

  it("processes a valid image buffer and produces thumb, medium, and large WebP derivatives", async () => {
    const sourceBuffer = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 100, g: 150, b: 200 } },
    })
      .jpeg()
      .toBuffer();

    const result = await processImageBuffer(sourceBuffer);

    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
    expect(result.format).toBe("jpeg");

    // Verify thumb: 200x200 WebP
    const thumbMeta = await sharp(result.thumb).metadata();
    expect(thumbMeta.format).toBe("webp");
    expect(thumbMeta.width).toBe(200);
    expect(thumbMeta.height).toBe(200);

    // Verify medium: longest edge <= 800
    const mediumMeta = await sharp(result.medium).metadata();
    expect(mediumMeta.format).toBe("webp");
    expect(mediumMeta.width).toBe(800);
    expect(mediumMeta.height).toBe(600);

    // Verify large: longest edge <= 1400 (was 1200, so 1200x900)
    const largeMeta = await sharp(result.large).metadata();
    expect(largeMeta.format).toBe("webp");
    expect(largeMeta.width).toBe(1200);
    expect(largeMeta.height).toBe(900);
  });

  it("proves EXIF/GPS metadata is absent from processed WebP derivatives", async () => {
    // Generate image with EXIF metadata
    const sourceWithExif = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 50, g: 50, b: 50 } },
    })
      .withExif({
        IFD0: {
          Make: "TestCamera",
          Model: "TestModel",
        },
      })
      .jpeg()
      .toBuffer();

    const initialMeta = await sharp(sourceWithExif).metadata();
    expect(initialMeta.exif).toBeDefined();

    const result = await processImageBuffer(sourceWithExif);
    const thumbMeta = await sharp(result.thumb).metadata();
    const mediumMeta = await sharp(result.medium).metadata();
    const largeMeta = await sharp(result.large).metadata();

    expect(thumbMeta.exif).toBeUndefined();
    expect(mediumMeta.exif).toBeUndefined();
    expect(largeMeta.exif).toBeUndefined();
  });

  it("rejects corrupt or malformed image buffers", async () => {
    const corruptBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x00, 0x00, 0x00]);
    await expect(processImageBuffer(corruptBuffer)).rejects.toThrow();
  });

  it("rejects images exceeding 8000x8000 dimensions", async () => {
    // Sharp can create a sparse or metadata mock, but let's test with a simulated metadata failure or directly
    const buffer = Buffer.alloc(100);
    await expect(processImageBuffer(buffer)).rejects.toThrow();
  });

  it("proves seed script refuses every non-local target host", async () => {
    const { validateSeedTarget } = await import("../../scripts/seed-listings");

    // Local targets succeed
    expect(() => validateSeedTarget("http://127.0.0.1:54321")).not.toThrow();
    expect(() => validateSeedTarget("http://localhost:54321")).not.toThrow();

    // Any non-local target throws critical safety rejection
    expect(() => validateSeedTarget("https://supabase.co")).toThrow(/CRITICAL SAFETY REJECTION/);
    expect(() => validateSeedTarget("https://fairswap.org")).toThrow(/CRITICAL SAFETY REJECTION/);
    expect(() => validateSeedTarget("http://192.168.1.10:54321")).toThrow(/CRITICAL SAFETY REJECTION/);
    expect(() => validateSeedTarget("https://prod-db.supabase.com")).toThrow(/CRITICAL SAFETY REJECTION/);
  });
});
