# Profile onboarding — Web release notes

- Backend forward migrations (`FairSwap-Backend/supabase/forward-migrations/profile-onboarding/`) must be applied to the target environment **before** this Web release. `save_my_profile_details` requires the `p_clear_full_name` argument.
- `src/types/database.ts` is hand-aligned with the Backend contract (`docs/contracts/profile-public-private.md`). After the staging migrations are applied, regenerate it from the staging project (`supabase gen types typescript --project-id <staging-project-ref>`, no secrets in the command or output) and reconcile any signature differences before production.
- Avatars: `/api/account/avatar` uploads the sanitized WebP, updates the profile through a service-role RPC with compare-and-swap, and only then deletes the previous object. User-initiated removal clears the row and then deletes the object. A failed object deletion is logged immediately (`account.avatar_object_delete_failed`); there is no queue, worker, scheduler or retry service.
- Account deletion removes private details and the profile's avatar reference, but **does not erase avatar files from Storage**. Storage erasure on account deletion is deferred to a separate implementation and is not claimed anywhere in product copy.
- No new environment variables.
