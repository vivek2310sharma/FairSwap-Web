# Native Seller Media API & Server Contract

## Overview
This specification details the server-mediated seller media contract introduced in **FairSwap-Web** (Issue #103) as the backend dependency for **FairSwap-iOS** milestone iOS-5 (Native Seller Media Management).

It establishes unified authentication for both web cookies and native mobile Bearer tokens, safe owner media snapshots, transactional reorder and cover selection RPCs, upload and delete hardening, and owner-private derivative delivery via JSON mode while keeping private Storage completely server-mediated.

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
- The service-role client is strictly restricted to server-side operations (private Storage bucket uploads/signed URL creation and internal maintenance RPCs).

---

## 2. Shared Seller Media Error Contract (`src/lib/media/api-contract.ts`)

All media endpoints adhere to a standardized JSON error shape:
```json
{
  "code": "<MACHINE_CODE>",
  "message": "<SAFE_USER_FACING_MESSAGE>"
}
```

### Canonical Error Codes & HTTP Statuses
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `UNAUTHENTICATED` | 401 | Missing, malformed, or invalid authentication credentials. |
| `ACCOUNT_RESTRICTED` | 403 | User account is suspended, terminated, or deleted. |
| `POLICY_ACCEPTANCE_REQUIRED` | 403 | User has not accepted the current platform legal policies. |
| `LISTING_NOT_FOUND` | 404 | Listing does not exist or does not belong to the caller (concealed). |
| `MEDIA_NOT_FOUND` | 404 | Media item does not exist or does not belong to the listing. |
| `LISTING_MEDIA_NOT_EDITABLE` | 409 | Listing is in a terminal non-editable status (`sold`, `expired`, `removed`). |
| `PHOTO_LIMIT_REACHED` | 409 | Maximum limit of 8 photos per listing has been reached. |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeds Content-Length cap (6 MB). |
| `FILE_TOO_LARGE` | 413 | Uploaded source file exceeds maximum size (5 MB). |
| `INVALID_IMAGE_FORMAT` | 415 | Unsupported file format or magic bytes mismatch (JPEG, PNG, WebP only). |
| `INVALID_MEDIA_REQUEST` | 400 | Request body failed Zod validation or parameters are invalid. |
| `MEDIA_UPLOAD_FAILED` | 422 | Storage upload failed during processing. |
| `MEDIA_PROCESSING_FAILED` | 422 | Sharp derivative generation or image processing failed. |
| `MEDIA_DELETE_FAILED` | 422 | Storage or database deletion operation failed. |
| `MEDIA_REORDER_FAILED` | 422 | Transactional reorder operation failed. |
| `COVER_UPDATE_FAILED` | 422 | Setting cover photo failed. |
| `SELLER_WRITES_DISABLED` | 503 | Seller writes are temporarily disabled due to system maintenance. |

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
3. **Active Account Status**: User account must be active (not suspended/terminated/deleted).
4. **Current Policy Acceptance**: Caller must have accepted the current platform policies (`has_current_policy_acceptance`).
5. **Listing Ownership**: Caller must own the listing (`seller_id = auth.uid()`).
6. **Authoritative Media-Editable Status**:
   - **Allowed**: `draft`, `rejected`, `active`, `reserved`, `paused`, `pending_review`
   - **Denied**: `expired`, `sold`, `removed`

### Why `pending_review` Must Remain Media-Editable
When an `active`, `reserved`, or `paused` listing undergoes its first media mutation, the existing database trigger (`trg_listing_media_after_insert`, `trg_listing_media_after_delete`, or transactional RPC) transitions the listing from `active -> pending_review`.
If `pending_review` were non-editable, a seller uploading or reordering multiple photos would be blocked after the very first photo. Thus, `pending_review` remains editable throughout the seller's media management session.

---

## 4. Endpoints & Operations

### A. Safe Owner Media Snapshot
`GET /api/listings/[id]/media`
- Read-only route (not blocked by seller-write maintenance).
- Supports both cookie and Bearer authentication.
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
- Preflight guards run before parsing multipart body where possible.
- Multipart validation:
  - Exactly one file per request.
  - Source file $\le$ 5 MB.
  - Formats: JPEG, PNG, WebP only (validated via magic bytes, not untrusted client MIME).
  - Maximum 8 photos per listing.
- Synchronous processing pipeline:
  - Authenticated `listing_media` metadata insert.
  - Private original upload using server service-role client.
  - Sharp derivative generation: `thumb` (400px), `medium` (800px), `large` (1600px) in WebP format.
  - Status updated to `ready` (or `failed`).
- Returns safe media snapshot on success.

### C. Retry-Safe Idempotent Deletion
`DELETE /api/listings/[id]/media/[mediaId]`
- Preflight mutation guards.
- Safe execution sequence:
  1. Verify media existence and listing ownership.
  2. If media is already absent, return 200 idempotent success with current snapshot.
  3. Delete Storage objects (`original`, `thumb`, `medium`, `large`) via server service-role client.
  4. Call internal database RPC (`delete_listing_media_internal`) to remove media row and automatically fall back cover photo to the next ready photo.
- Returns updated safe media snapshot.

### D. Transactional Reorder Contract
`POST /api/listings/[id]/media/reorder`
- Request body:
  ```json
  {
    "mediaIds": ["9b1deb4d-...", "5a2fe18c-..."]
  }
  ```
- Database RPC: `public.seller_reorder_listing_media(listing_id uuid, media_ids uuid[])`
  - Validates caller ownership, active account, policy acceptance, and editable status.
  - Validates complete membership: count matches persisted count, no omitted media IDs, no foreign media IDs, maximum 8 items.
  - Locks rows `FOR UPDATE` and updates `display_order = 0..(count-1)` collision-safely.
  - Executes as the authenticated user (user-scoped).
- Web Server Action (`reorderMediaAction`) updated to use the exact same transactional RPC.

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
  - Works reliably even after a listing has transitioned to `pending_review`.
- Web Server Action (`setCoverPhotoAction`) updated to use the exact same transactional RPC.

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

## 5. Cross-Feature Compatibility & Regressions

### Issue #81: Location Privacy & Maintenance Guard
- Reuses `isSellerWriteMaintenanceEnabled()` from Issue #81 across all media mutations.
- The media API never exposes `pin_code`, `landmark`, or exact private location fields in snapshots or error bodies.
- Location contracts (`get_seller_listing_location_private`, `lookup_pincode`, postal datasets) remain untouched.

### Issue #83: Email Notifications & Lifecycle Transitions
- The email notification pipeline is driven by `public.listing_status_transitions`.
- When an `active`, `reserved`, or `paused` listing is first mutated, it moves to `pending_review`, creating exactly **one** status transition row (which enqueues one review notification to moderators).
- While the listing remains in `pending_review`, subsequent media uploads, deletes, reorders, or cover selections:
  - Do **not** trigger redundant transitions to `pending_review`.
  - Do **not** artificially increment the listing `revision`.
  - Do **not** enqueue spurious review emails.

---

## 6. Private Storage Security Invariants
- Storage buckets `listing-originals` and `listing-derivatives` remain **strictly private**.
- No public or authenticated direct client Storage policies were added.
- No service-role key or credentials are exposed to mobile clients or web browsers.
- Native clients never access Supabase Storage directly.

---

## 7. Scope & Next Steps
- **Completed**: FairSwap-Web Task A backend HTTP and database contract (Feature branch: `feature/103-native-seller-media-api`, PR targeting `staging`).
- **Target Environment**: FairSwapTest (`wpppxlnbzqynvhpeuavd`) / staging only.
- **FairSwapProd**: Strictly untouched.
- **FairSwap-iOS**: Unchanged during Task A. Native Swift UI, PhotosPicker, compression, and view models will be implemented in **iOS-5 Task B** after this Web PR is reviewed, merged to staging, and migrations are applied to FairSwapTest.
