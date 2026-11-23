# DigiLocker Production parity

This is a selective port of signed DigiLocker verification and mandatory posting/messaging UX from staging to production. No Test Lab or diagnostics are shipped. Backend's protected database gate is authoritative; UX checks only guide users.

Production requirements before activation: the signed-identity parity migration must be applied by the protected Test→Production pipeline, both `idv-digilocker-*` Edge Functions must be deployed from the reviewed Backend commit with `verify_jwt=true`, the separate production DigiLocker client must have the exact `https://fairswap.in/api/idv/digilocker/callback` registered, and production Web must have `FAIRSWAP_DIGILOCKER_ENABLED=true`. Production Supabase must provide `DIGILOCKER_AUTH_MODE=oidc_v2`, `FAIRSWAP_DIGILOCKER_ENABLED=true`, `DIGILOCKER_CLIENT_ID`, `DIGILOCKER_CLIENT_SECRET`, `DIGILOCKER_REDIRECT_URI`, `IDV_DIGILOCKER_STATE_KEY`, `IDV_DIGILOCKER_FP_KEY_CURRENT`, and the matching `IDV_DIGILOCKER_FP_KEY_V*`. Never print or copy Test credentials.

Security: signed DigiLocker ID, state, PKCE, single-use attempt, fingerprint binding, fraud blocks, revocation, and database-side write enforcement. The `acr=aadhaar` authorization request relies on Setu's owner-confirmed enforcement guarantee; signed ID token ACR is not required. Public badge must always use the authoritative badge RPC.

Production rollback: disable mandatory identity gate through protected operator release, restore prior Vercel build/Edge code if necessary, and use a reviewed forward migration for any database correction. Never erase installed migration history.
