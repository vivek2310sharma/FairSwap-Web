// Node environment: exercise the real decoder, orientation and metadata removal.
// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImageBuffer } from "@/lib/media/processor";
describe("Posting photo sanitization",()=>{
 it("strips metadata and bounds every persistent derivative",async()=>{
  const raw=await sharp({create:{width:1800,height:1000,channels:3,background:"#00aa55"}}).jpeg().withMetadata({exif:{IFD0:{Artist:"private-owner",ImageDescription:"private-location"}}}).toBuffer();
  expect((await sharp(raw).metadata()).exif).toBeDefined();
  const output=await processImageBuffer(raw);
  for(const bytes of [output.thumb,output.medium,output.large]){const info=await sharp(bytes).metadata();expect(info.exif).toBeUndefined();expect(info.xmp).toBeUndefined();expect(info.format).toBe("webp");expect(Math.max(info.width!,info.height!)).toBeLessThanOrEqual(1600);}
 });
 it("rejects unsupported bytes before storage",async()=>expect(processImageBuffer(Buffer.from("not a photo"))).rejects.toThrow());
});
