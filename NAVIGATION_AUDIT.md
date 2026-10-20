# FairSwap Navigation Audit & Implementation Plan

## 1. Existing Architecture & What Works

*   **Routing:** The application uses Next.js 16 App Router.
*   **Search Discovery:** Server-side search (`searchPublicListings`) works robustly and parses query strings via `searchFiltersSchema` correctly.
*   **Header/Footer:** Extracted into shared components (`src/components/header.tsx`, `src/components/footer.tsx`) and used on individual pages (like `page.tsx`, `search/page.tsx`, `listings/[slug]/page.tsx`) rather than globally in `layout.tsx`.
*   **Listing Protection:** The public discovery query successfully filters out drafts, expired, and rejected listings.

## 2. Confirmed Problems

### A. Header Navigation
*   **Issue:** Fragment links (`#how-it-works`) in the Header break when a user is on `/search` or `/listings/[slug]` because they resolve relative to the current path instead of the homepage.
*   **Evidence:** `src/components/header.tsx` uses standard `<a href="#how-it-works">`.
*   **Solution:** Convert to absolute paths (`/#how-it-works`) and use Next.js `<Link>`.

### B. Back to Search
*   **Issue:** The "Back to search" link on `/listings/[slug]` is hardcoded to `/search`. Users lose their search keyword, location, and price filters when returning.
*   **Evidence:** `src/app/listings/[slug]/page.tsx` contains `<Link href="/search">Back to search...</Link>`.
*   **Solution:** Pass the serialized search parameters from `src/app/search/page.tsx` down through `ListingCard` to the URL query string (`?ctx=...`). The listing details page reads this `ctx` parameter, validates it against allowed keys (e.g., `q`, `category`), imposes length limits, and constructs a safe back link.

### C. Homepage Search Form
*   **Issue:** The homepage uses a standard HTML `<form method="GET">`, triggering a full page reload rather than a fast Next.js client-side navigation.
*   **Evidence:** `src/app/page.tsx` contains `<form action="/search" method="GET">`.
*   **Solution:** Upgrade to `next/form` to enable progressive enhancement and fast client-side routing.

### D. Filter State and Back Navigation
*   **Issue:** `SearchFilters.tsx` initializes state from props but doesn't react if the URL changes without unmounting (e.g., Browser Back/Forward buttons).
*   **Evidence:** Uses `useState(initialFilters.q)` but lacks a synchronization mechanism.
*   **Solution:** Implement safe state synchronization comparing `prevFilters` with current `initialFilters` to update local state without triggering infinite loops.

## 3. Deferred Items

### Loading Feedback (`loading.tsx`)
*   We evaluated adding `src/app/search/loading.tsx` and implemented it. It safely includes the `<Header />` and `<Footer />` components directly since they are not in the root layout.
*   **Deferred:** We chose *not* to implement `src/app/listings/[slug]/loading.tsx`. Adding a route-level loading boundary there intercepts `notFound()` calls and can damage SEO by rendering a `200 OK` loading state for non-existent slugs before redirecting. It is better to rely on fast server rendering for the listing details.

## 4. Implementation Details

*   **`src/app/search/page.tsx`**: Updated to pass `searchContext={new URLSearchParams(flatParams).toString()}` to `ListingCard`.
*   **`src/components/listings/ListingCard.tsx`**: Accepts `searchContext` and appends `?ctx=...` to the listing URL.
*   **`src/app/listings/[slug]/page.tsx`**: Reads `searchParams.ctx`, safely parses it using `URLSearchParams` (avoiding explicit `decodeURIComponent` which causes double-decoding bugs), filters by a whitelist of allowed keys, limits values to <200 chars, and generates a dynamic "Back to search" link.
*   **`src/components/listings/SearchFilters.tsx`**: Syncs state on Back/Forward navigation using a `prevFilters` check.
*   **`src/app/page.tsx`**: Replaced standard `<form>` with `<Form from="next/form">`.
*   **`src/components/header.tsx`**: Updated fragment links to use `<Link href="/#how-it-works">`.
*   **`e2e/navigation.spec.ts`**: (Tests removed per instruction, preserving only the production implementation).

## 5. Security & Performance Verification

*   **Security:** Context parsing uses strict whitelisting. No open redirects are possible because the constructed path is hardcoded to `/search?...`.
*   **Performance:** The new `next/form` prevents full-page reloads, speeding up navigation for mobile users.
*   **Validation:** Handled decoding safely—`URLSearchParams` automatically handles standard percent encoding, avoiding the `URIError: URI malformed` crash.