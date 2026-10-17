# Dormant Production family draft gates

These server-only Web gates are prepared for a later controlled release of Cars,
Two-Wheelers and Property. **No new Production feature flags are set by this PR.**
Publication and submission are not activated by these changes.

Each new family defaults **OFF**. Only after the Production database receives the
separately approved, verified category foundation and **publication lock**, an
operator may set all common Production attestations:
- Existing verified Goods Production credentials, `NEXT_PUBLIC_SITE_URL=https://fairswap.in`,
  target/project and `main` branch checks
- `POST_AD_EXPERIMENTAL_PRODUCTION_FOUNDATION_VERIFIED=kriuhwppxgxsyyrbjsau`
- `POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED=kriuhwppxgxsyyrbjsau`
- `POST_AD_EXPERIMENTAL_PRODUCTION_MODE=draft_only`

Then, independently and only after a separate reviewed activation:
- `POST_AD_TWO_WHEELER_PRODUCTION_DRAFT_ENABLED=true`
- `POST_AD_CARS_PRODUCTION_DRAFT_ENABLED=true`
- `POST_AD_PROPERTY_PRODUCTION_DRAFT_ENABLED=true`

**Currently none of those flags should be present in Vercel Production.**
They must not be set as Test/Preview flags. These flags are not authorization:
Supabase RLS, guards, category contracts and Post-Ad Zod validation remain
authoritative for all users.

Saved-context reads reject inconsistent Production configuration. Existing
`POST_AD_SUBMISSION_TEST_ENABLED` remains exclusively Test-scoped; Production
cannot submit or publish experimental family listings from this Web change.
No production categories are created/activated by the Web deployment.

See FairSwap-Backend Production cold foundation PR #7. Do not merge the entire
Web staging branch: it includes Test-only S1 email capture code.
