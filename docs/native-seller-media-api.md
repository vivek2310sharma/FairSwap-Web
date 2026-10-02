# Native Seller Media API & Server Contract

## Overview
This specification details the server-mediated seller media contract introduced in **FairSwap-Web** (Issue #103 / PR #104) as the backend dependency for **FairSwap-iOS** milestone iOS-5 (Native Seller Media Management).

It establishes unified authentication for both web cookies and native mobile Bearer tokens, safe owner media snapshots, transactional reorder and cover selection RPCs, user-scoped transactional delete with automatic cover fallback, upload and delete lifecycle hardening preventing premature moderation re-reviews, serialized 8-photo limit enforcement, and owner-private derivative delivery via JSON mode while keeping private Storage completely server-mediated.

---

## 1. Request Authentication Boundary

### Unified Request Authentication (`src/lib/supabase/request-auth.ts`)
The API routes use a single, unified request-authentication boundary:
- **Web**: Browser session cookies via `@supabase/ssr`.
- **Native iOS**: Supabase access tokens via HTTP header:
  ```http
  Authorization: Bearer <Supabase access token>
  ```

### Strict Bearer Precedence
If an `Authorization` header is present on the request:
- The `Authorization` header is **authoritative**.
- If the Bearer syntax is malformed, missing, empty, invalid, or expired, the request is immediately rejected with:
  ```json
  {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
  ```
- **Zero Fallback**: The server **never** silently falls back to session cookies if an `Authorization` header was provided. This prevents confused-deputy vulnerabilities where a browser session could inadvertently be resolved instead of the intended Bearer identity.

### Opaque Token Handling
- The server does **not** manually parse, decode, or apply custom regexes to Bearer tokens.
- Tokens are treated as opaque strings and validated strictly via the official Supabase JS Auth SDK:
  ```typescript
  await client.auth.getUser(token);
  ```
- No locally decoded JWT payload is trusted as authentication.

### User-Scoped Supabase Client
- When authenticating via Bearer token, a user-scoped PostgREST client is initialized carrying the caller's access token in the `Authorization` header.
- Database operations execute under the authenticated user's database role (`authenticated`) where Row Level Security (RLS) and `auth.uid()` are authoritative.
- The service-role client is strictly restricted to server-side operations (private Storage bucket uploads/signed URL creation and server-side private path lookups).

---

## 2. Shared Seller Media Error Contract (`src/lib/media/api-contract.ts`)

All media endpoints adhere to a standardized JSON error shape:
```json
{
  "code": "<MACHINE_CODE>",
  "message": "<SAFE_USER_FACING_MESSAGE>"
}
```

*Note: For backward compatibility with legacy Web clients, an `error` alias property matching `message` is temporarily included, but clients must rely on `code` and `message` as canonical.*

If a failed upload identity is returned so client UI can dismiss or clean up the row, it is returned in structured format:
```json
{
  "code": "MEDIA_PROCESSING_FAILED",
  "message": "Image processing failed. Please try a different image.",
  "media": {
    "id": "<uuid>",
    "processingStatus": "failed"
  }
}
```

### Canonical Error Codes & HTTP Statuses
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `UNAUTHENTICATED` | 401 | Missing, malformed, or invalid authentication credentials. |
| `ACCOUNT_RESTRICTED` | 403 | User account is missing, suspended, terminated, or deleted. |
| `POLICY_ACCEPTANCE_REQUIRED` | 403 | User has not accepted the current platform legal policies. |
| `LISTING_NOT_FOUND` | 404 | Listing does not exist or does not belong to the caller (concealed). |
| `MEDIA_NOT_FOUND` | 404 | Media item does not exist or does not belong to the listing. |
| `LISTING_MEDIA_NOT_EDITABLE` | 409 | Listing is in a terminal non-editable status (`sold`, `expired`, `removed`). |
| `PHOTO_LIMIT_REACHED` | 409 | Maximum limit of 8 photos per listing has been reached (enforced via row lock). |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeds Content-Length cap (6 MB). |
| `FILE_TOO_LARGE` | 413 | Uploaded source file exceeds maximum size (5 MB). |
| `INVALID_IMAGE_FORMAT` | 415 | Unsupported file format or magic bytes mismatch (JPEG, PNG, WebP only). |
| `INVALID_MEDIA_REQUEST` | 400 | Request body failed Zod validation or parameters are invalid. |
| `MEDIA_UPLOAD_FAILED` | 500 | Storage upload or database insertion failed during processing. |
| `MEDIA_PROCESSING_FAILED` | 422 | Sharp derivative generation or image processing failed. |
| `MEDIA_DELETE_FAILED` | 500 | Storage or database deletion operation failed. |
| `MEDIA_REORDER_FAILED` | 422 | Transactional reorder operation failed. |
| `COVER_UPDATE_FAILED` | 422 | Setting cover photo failed. |
| `SELLER_WRITES_DISABLED` | 503 | Seller writes are temporarily disabled due to system maintenance. |
| `MEDIA_SERVICE_UNAVAILABLE` | 503 | Infrastructure failure during preflight checks (account or policy lookup error). |

### Adversarial Error Sanitization
Error responses pass through `mediaApiError()`, which aggressively sanitizes all outputs:
- Strips SQLSTATE codes, table names, and column identifiers.
- Strips private Storage bucket names (`listing-originals`, `listing-derivatives`) and internal object paths.
- Strips auth tokens, JWT markers, and secret substrings.

---

## 3. Media Mutation Guards & Lifecycle Matrix

Every media mutation (`POST` upload, `DELETE` media, `POST` reorder, `PUT` cover) enforces:
1. **Authenticated User**: Valid session cookie or Bearer token.
2. **Maintenance Mode**: `MAINTENANCE_SELLER_WRITES` must not be enabled.
3. **Active Account Status**: User account must be active. Infrastructure lookup failure returns 503 `MEDIA_SERVICE_UNAVAILABLE`.
4. **Current Policy Acceptance**: Caller must have accepted the current platform policies. Stale policy returns 403 `POLICY_ACCEPTANCE_REQUIRED`; lookup outage returns 503 `MEDIA_SERVICE_UNAVAILABLE`.
5. **Listing Ownership**: Caller must own the listing (`seller_id = auth.uid()`).
6. **Authoritative Media-Editable Status**:
   - **Allowed**: `draft`, `rejected`, `active`, `reserved`, `paused`, `pending_review`
   - **Denied**: `expired`, `sold`, `removed`

### Upload & Delete Lifecycle Hardening (Issue #83 Re-review Contract)
- **Upload Initial State**: Initial row insert in `listing_media` forces `processing_status = 'uploading'`.
  - The historical `AFTER INSERT` trigger (`trg_listing_media_after_insert`) is dropped in Migration 33.
  - An insert in `uploading` state does **NOT** transition an active listing or increment its revision.
  - Transition from `uploading -> processing` or `processing -> failed` does **NOT** transition the listing.
  - Re-review is triggered via `AFTER UPDATE OF processing_status` **ONLY** when `processing_status` successfully transitions to `'ready'`.
  - If a file upload or processing fails, the listing remains in its existing state (`active`), preventing false-positive moderation submissions and spurious review emails.
- **Delete Re-review Semantics**:
  - Deleting a persisted `'ready'` photo is material: fires `trg_listing_media_after_delete` which transitions `active -> pending_review`.
  - Deleting an `uploading`, `processing`, or `failed` row is considered cleanup and does **NOT** transition the listing or enqueue emails.
- **Pending Review Stability**: When a listing is already in `pending_review`, subsequent mutations do not generate redundant status transitions or spurious revision bumps.

---

## 4. Endpoints & Operations

### A. Safe Owner Media Snapshot & Fail-Closed Semantics
`GET /api/listings/[id]/media`
- Read-only route (not blocked by seller-write maintenance).
- Supports both cookie and Bearer authentication.
- **Fail-Closed Error Classification**:
  - Listing lookup database error returns `503 MEDIA_SERVICE_UNAVAILABLE` (never 404).
  - Media query database error returns `503 MEDIA_SERVICE_UNAVAILABLE` (never coerced to empty `media: []`).
  - Genuinely empty media list on visible listing returns `200 OK` with `media: []`.
  - Non-owner or genuinely missing listings return `404 LISTING_NOT_FOUND`.
- Returns safe metadata only:
  ```json
  {
    "listing": {
      "id": "c1f7a05e-...",
      "status": "draft",
      "revision": 1,
      "coverPhotoId": "9b1deb4d-..."
    },
    "media": [
      {
        "id": "9b1deb4d-...",
        "listingId": "c1f7a05e-...",
        "width": 1200,
        "height": 800,
        "displayOrder": 0,
        "processingStatus": "ready",
        "createdAt": "2026-10-02T18:00:00.000Z",
        "isCover": true
      }
    ]
  }
  ```
- **Zero Storage Leakage**: Never exposes original or derivative storage paths, bucket names, uploader IDs, or raw processing errors.

### B. Upload Route Hardening
`POST /api/listings/[id]/media`
- Early request size check (Content-Length capped at 6 MB).
- Preflight guards run before parsing multipart body.
- Serialized photo limit:
  - Database trigger `handle_listing_media_before_insert` locks the parent listing row `FOR UPDATE` before counting existing media.
  - Maximum 8 photos per listing. Exceeding raises `PHOTO_LIMIT_REACHED` (409).
- Multipart validation:
  - Exactly one file per request.
  - Source file $\le$ 5 MB.
  - Formats: JPEG, PNG, WebP only (validated via magic bytes, not untrusted client MIME).
- Synchronous processing pipeline:
  - Authenticated `listing_media` metadata insert with initial state `uploading`.
  - Private original upload using server service-role client.
  - Sharp derivative generation: `thumb` (400px), `medium` (800px), `large` (1600px) in WebP format.
  - Status updated to `ready` (or `failed`).
- Returns safe media snapshot on success.

### C. Retry-Safe Idempotent Deletion (DB-First Failure Ordering)
`DELETE /api/listings/[id]/media/[mediaId]`
- Preflight mutation guards.
- Authoritative execution order:
  1. Authenticate caller (cookie or Bearer).
  2. Preflight guards: maintenance, active account, current policy, listing owner, mutable status.
  3. Server-only lookup of Storage paths scoped to listing and media. If lookup fails with a database error, the route returns failure (never false success).
  4. Authoritative DB deletion via user-scoped RPC `public.seller_delete_listing_media(listing_id, media_id)`:
     - Transactionally locks listing and media row.
     - If media row is already absent for the authorized listing, returns `{ success: true, deleted: false }` (idempotent).
     - Automatically falls back `cover_photo_id` to the next ready media item if the cover photo was deleted.
     - Deletes media row; re-review trigger fires ONLY if deleted media was `'ready'`.
     - Records audit event.
  5. Best-effort private Storage cleanup runs **after** committed DB mutation:
     - If Storage cleanup fails, the committed DB deletion is preserved and safe success is returned.
     - Prevents active listings from pointing to destroyed Storage objects while DB deletion fails.
  6. Returns safe snapshot of remaining media.

Response format when deletion occurred:
```json
{
  "success": true,
  "deleted": true,
  "deleted_media_id": "22222222-2222-2222-2222-222222222221",
  "new_cover_id": "22222222-2222-2222-2222-222222222222",
  "snapshot": {
    "listing": {
      "id": "11111111-1111-1111-1111-111111111111",
      "status": "draft",
      "revision": 1,
      "coverPhotoId": "22222222-2222-2222-2222-222222222222"
    },
    "media": []
  }
}
```

Response format when item was already absent (idempotent 200):
```json
{
  "success": true,
  "deleted": false,
  "deleted_media_id": null,
  "new_cover_id": "22222222-2222-2222-2222-222222222222",
  "snapshot": {
    "listing": {
      "id": "11111111-1111-1111-1111-111111111111",
      "status": "draft",
      "revision": 1,
      "coverPhotoId": "22222222-2222-2222-2222-222222222222"
    },
    "media": []
  }
}
```

### D. Transactional Reorder Contract (Ready-Only Membership)
`POST /api/listings/[id]/media/reorder`
- Request body:
  ```json
  {
    "mediaIds": ["9b1deb4d-...", "5a2fe18c-..."]
  }
  ```
- Database RPC: `public.seller_reorder_listing_media(listing_id uuid, media_ids uuid[])`
  - Validates caller ownership, active account, policy acceptance, and editable status.
  - **Ready-Only Membership**: Enforces that `mediaIds` constitutes the exact complete membership of all current **READY** (`processing_status = 'ready'`) media rows.
  - Non-ready, uploading, processing, failed, or foreign IDs are rejected.
  - Locks rows `FOR UPDATE` and updates `display_order = 0..(count-1)` collision-safely.
  - Direct authenticated `UPDATE (display_order)` on `listing_media` is revoked; mutations must use this atomic RPC.
- Web `MediaUploader` Parity:
  - Disables structural reorder controls while any item is unready or failed.
  - Sends only the complete ready set.
  - Reverts optimistic order if the reorder Server Action fails.

### E. Transactional Cover Photo Selection
`PUT /api/listings/[id]/media/cover`
- Request body:
  ```json
  {
    "mediaId": "9b1deb4d-..."
  }
  ```
- Database RPC: `public.seller_set_listing_cover_photo(listing_id uuid, media_id uuid)`
  - Validates caller ownership, active account, policy acceptance, and editable status.
  - Enforces that target media belongs to the listing and has `processing_status = 'ready'`.
  - Atomically updates `cover_photo_id` on the listing.
  - Direct authenticated `UPDATE (cover_photo_id)` on `listings` is revoked; mutations must use this atomic RPC.

### F. Private Derivative Delivery with JSON Mode
`GET /api/listings/[id]/media/[mediaId]/[size]`
- Sizes supported: `thumb`, `medium`, `large` (`original` is excluded from mobile client delivery).
- **Public listings**: Maintains standard 302 HTTP redirect for public buyers.
- **Native iOS Private Mode**: When native iOS requests private seller media:
  ```http
  GET /api/listings/[id]/media/[mediaId]/thumb
  Accept: application/json
  Authorization: Bearer <Supabase access token>
  ```
  The endpoint verifies ownership, creates a short-lived (60-second) signed URL via the service-role client, and returns JSON:
  ```json
  {
    "url": "https://<supabase-host>/storage/v1/object/sign/listing-derivatives/...",
    "expiresIn": 60
  }
  ```
  Response header: `Cache-Control: no-store`.
  This prevents iOS URLSession from forwarding the Authorization Bearer token to the Storage CDN origin during redirects.

---

## 5. Security & Authorization Invariants

### Direct Mutation Grants Revoked
- Authenticated direct `UPDATE (display_order)` on `public.listing_media` is revoked.
- Authenticated direct `UPDATE (cover_photo_id)` on `public.listings` is revoked.
- Sellers must use the authorized transactional RPCs.

### Explicit Function Privileges
- All `app_security` internal implementation functions:
  - `REVOKE ALL FROM PUBLIC, anon;`
  - `GRANT EXECUTE TO authenticated, service_role;`
  - Explicit `SET search_path = ''`
  - `SECURITY DEFINER`
- Public RPC wrappers:
  - `REVOKE ALL FROM PUBLIC, anon;`
  - `GRANT EXECUTE TO authenticated, service_role;`
  - `SECURITY INVOKER` (executing under the caller's role)

### Private Storage Invariants
- Storage buckets `listing-originals` and `listing-derivatives` remain **strictly private**.
- No public or authenticated direct client Storage policies were added.
- No service-role key or credentials are exposed to mobile clients or web browsers.
- Native clients never access Supabase Storage directly.

---

## 6. Scope & Next Steps
- **Completed**: FairSwap-Web Task A backend HTTP and database contract (Feature branch: `feature/103-native-seller-media-api`, PR #104 targeting `staging`).
- **Target Environment**: FairSwapTest (`wpppxlnbzqynvhpeuavd`) / staging only.
- **Hosted Verification**: NOT YET PERFORMED FOR THIS FEATURE CONTRACT (awaiting merge to staging and deployment).
- **FairSwapProd**: Strictly untouched (read-nothing / write-nothing).
- **FairSwap-iOS**: Unchanged during Task A. Native Swift UI, PhotosPicker, compression, and view models will be implemented in **iOS-5 Task B** after this Web PR is reviewed, merged to staging, and migrations are applied to FairSwapTest.
