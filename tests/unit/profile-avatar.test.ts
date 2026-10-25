// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  guard: vi.fn(),
  profileRow: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profileRow }) }) }),
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({
    rpc: mocks.rpc,
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://project.example/storage/v1/object/public/avatars/${path}` },
        }),
      }),
    },
  }),
}));
vi.mock("@/lib/compliance/policy-acceptance", () => ({ requireCurrentPolicyAcceptance: mocks.guard }));

import { POST, DELETE } from "@/app/api/account/avatar/route";
import { AvatarProcessingError, buildAvatarPath, processAvatarImage } from "@/lib/profile/avatar";

const USER = "123e4567-e89b-42d3-a456-426614174000";

async function samplePng(width = 600, height = 400): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .png()
    .toBuffer();
}

function uploadRequest(buffer: Buffer, name = "me.png", type = "image/png"): Request {
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array(buffer)], name, { type }));
  return new Request("http://localhost/api/account/avatar", { method: "POST", body: fd });
}

describe("processAvatarImage", () => {
  it("re-encodes to a 256px WebP with EXIF/GPS removed", async () => {
    const withExif = await sharp(await samplePng())
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "12/1 58/1 0/1" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processAvatarImage(withExif);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);
    expect(meta.exif).toBeUndefined();
    expect(out.length).toBeLessThanOrEqual(200 * 1024);
    expect(out.includes(Buffer.from("secret-owner"))).toBe(false);
  });

  it("rejects non-images regardless of declared type, empty and oversized input", async () => {
    await expect(processAvatarImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).rejects.toMatchObject({
      code: "UNSUPPORTED_TYPE",
    });
    await expect(processAvatarImage(Buffer.alloc(0))).rejects.toBeInstanceOf(AvatarProcessingError);
    await expect(processAvatarImage(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: "TOO_LARGE" });
  });

  it("rejects truncated images and pixel bombs", async () => {
    const png = await samplePng();
    await expect(processAvatarImage(png.subarray(0, 40))).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    const huge = await sharp({ create: { width: 6000, height: 6000, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(processAvatarImage(huge)).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });

  it("builds server-side paths inside the user's folder", () => {
    const path = buildAvatarPath(USER);
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f]{32}\\.webp$`));
    expect(buildAvatarPath(USER)).not.toBe(path);
  });
});

describe("/api/account/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mocks.guard.mockResolvedValue({ allowed: true });
    mocks.profileRow.mockResolvedValue({ data: { avatar_path: `${USER}/${"a".repeat(32)}.webp` }, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({
      data: { success: true, previous_path: `${USER}/${"a".repeat(32)}.webp`, avatar_url: "https://x/avatar.webp" },
      error: null,
    });
  });

  it("requires authentication and never touches storage when anonymous", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "no" } });
    const res = await POST(uploadRequest(await samplePng()));
    expect(res.status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("blocks users who must re-accept policies", async () => {
    mocks.guard.mockResolvedValue({ allowed: false, error: "review", requiresPolicyReview: true, redirectTo: "/r" });
    const res = await POST(uploadRequest(await samplePng()));
    expect(res.status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("uploads to the verified user's folder, swaps with CAS and removes the previous object", async () => {
    const res = await POST(uploadRequest(await samplePng()));
    expect(res.status).toBe(200);

    const [uploadPath, body, options] = mocks.upload.mock.calls[0];
    expect(uploadPath).toMatch(new RegExp(`^${USER}/[0-9a-f]{32}\\.webp$`));
    expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
    expect((await sharp(body as Buffer).metadata()).format).toBe("webp");

    const args = mocks.rpc.mock.calls[0][1];
    expect(mocks.rpc.mock.calls[0][0]).toBe("service_set_profile_avatar");
    expect(args).toMatchObject({ p_user_id: USER, p_old_path: `${USER}/${"a".repeat(32)}.webp`, p_new_path: uploadPath });
    expect(args.p_public_url.endsWith(`/avatars/${uploadPath}`)).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith([`${USER}/${"a".repeat(32)}.webp`]);
  });

  it("ignores any client-supplied user id or path", async () => {
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array(await samplePng())], "me.png", { type: "image/png" }));
    fd.set("userId", "00000000-0000-4000-8000-000000000000");
    fd.set("path", "../../victim/avatar.webp");
    await POST(new Request("http://localhost/api/account/avatar", { method: "POST", body: fd }));
    expect(mocks.rpc.mock.calls[0][1].p_user_id).toBe(USER);
    expect(mocks.upload.mock.calls[0][0].startsWith(`${USER}/`)).toBe(true);
  });

  it("rolls back the new object on a CAS conflict and reports 409", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: "AVATAR_CONFLICT" }, error: null });
    const res = await POST(uploadRequest(await samplePng()));
    expect(res.status).toBe(409);
    const uploaded = mocks.upload.mock.calls[0][0];
    expect(mocks.remove).toHaveBeenCalledWith([uploaded]);
  });

  it("rejects invalid images before any storage write", async () => {
    const res = await POST(uploadRequest(Buffer.from("not an image at all, just text"), "x.png", "image/png"));
    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("DELETE clears via CAS and removes only the user's own object", async () => {
    mocks.rpc.mockResolvedValue({
      data: { success: true, previous_path: "other-user/evil.webp" },
      error: null,
    });
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.rpc.mock.calls[0][0]).toBe("service_clear_profile_avatar");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
