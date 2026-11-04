import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const city = "55555555-5555-4555-8555-555555555555", locality = "66666666-6666-4666-8666-666666666666";
/** Fakes only the browser-visible wearable API. The page itself is still server-rendered by the app under test. */
export async function wearableApi(page: Page, options: { failFirstUpload?: boolean } = {}) {
  let failUpload = options.failFirstUpload ?? true, submits = 0;
  const calls: string[] = [], ready = new Set<string>(), models = [{ id: "wm_0123456789ab", name: "Apple Watch Series 9", series: "Apple Watch" }];
  const session = (id: string) => ({ session: { id, owner_id: id, listing_id: randomUUID(), state: "open", draft_protected: true }, media: [...ready].map(m => ({ id: m, session_id: id, attempt: id, state: "ready", url: null })) });
  await page.context().route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url());
    calls.push(`${req.method()} ${url.pathname}`);
    if (url.pathname.startsWith("/api/location/pincode/")) return route.fulfill({ json: { success: true, state: "Karnataka", district: "Bengaluru", city_id: city, districts: [{ name: "Bengaluru", city_id: city }], localities: [{ id: locality, name: "Koramangala", city_id: city }] } });
    if (url.pathname === "/api/post-ad/wearables/models") return route.fulfill({ json: { models } });
    if (url.pathname === "/api/post-ad/wearables/sessions") {
      if (req.method() === "GET") return route.fulfill({ json: { limit: 5, sessions: [] } });
      const body = req.postDataJSON(); return route.fulfill({ json: session(body.session_id) });
    }
    const media = url.pathname.match(/^\/api\/post-ad\/wearables\/sessions\/([^/]+)\/media$/);
    if (media) {
      if (req.method() === "GET") return route.fulfill({ json: { session: session(media[1]).session, media: [...ready].map(id => ({ id, state: "ready", url: null })) } });
      if (req.method() === "POST") { if (failUpload) { failUpload = false; return route.fulfill({ status: 503, json: { error: "Temporary upload failure" } }); } const m = String(req.postData()).match(/name="media_id"\r\n\r\n([0-9a-f-]{36})/); if (m) ready.add(m[1]); return route.fulfill({ json: { success: true } }); }
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname === "/api/post-ad/wearables/submit") { submits++; return route.fulfill({ json: { success: true, listing_id: randomUUID() } }); }
    return route.continue();
  });
  return { calls, submits: () => submits };
}
