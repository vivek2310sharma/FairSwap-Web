-- Migration 33: 20261002000033_seller_media_management.sql
-- Native Seller Media Management Contract (#103 / iOS-5 Task A)
--
-- Security and Architecture Requirements:
-- 1. Tighten public.listing_media RLS:
--    - Enforces listing status is in ('draft', 'rejected', 'active', 'reserved', 'paused', 'pending_review')
--    - Rejects mutations on terminal statuses ('expired', 'sold', 'removed')
--    - Strictly requires active account status and current policy acceptance
-- 2. Transactional Reorder RPC (seller_reorder_listing_media):
--    - Atomic reordering of all non-failed photos for a listing
--    - Validates complete membership (no omitted persisted photos, no foreign photos)
--    - Enforces max 8 photos limit
--    - Handles active/reserved/paused -> pending_review re-review once
--    - Does not manufacture additional status transitions if already pending_review
-- 3. Transactional Cover Photo RPC (seller_set_listing_cover_photo):
--    - Narrow authenticated RPC setting cover_photo_id
--    - Validates owner, active account, policy acceptance, and ready media
--    - Works cleanly when listing is pending_review without failing direct RLS updates
--    - Preserves existing material-edit trigger semantics
-- 4. Storage boundaries remain strictly private (server-mediated).
--    No direct anon/authenticated storage policies.

-- =============================================================================
-- 1. Tighten public.listing_media RLS Policies
-- =============================================================================

DROP POLICY IF EXISTS listing_media_insert_policy ON public.listing_media;
CREATE POLICY listing_media_insert_policy ON public.listing_media
FOR INSERT WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_media.listing_id
      AND l.seller_id = auth.uid()
      AND l.status IN ('draft', 'rejected', 'active', 'reserved', 'paused', 'pending_review')
      AND app_security.get_account_status(auth.uid()) = 'active'
      AND app_security.has_current_policy_acceptance(auth.uid())
  )
);

DROP POLICY IF EXISTS listing_media_update_policy ON public.listing_media;
CREATE POLICY listing_media_update_policy ON public.listing_media
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_media.listing_id
      AND l.seller_id = auth.uid()
      AND l.status IN ('draft', 'rejected', 'active', 'reserved', 'paused', 'pending_review')
      AND app_security.get_account_status(auth.uid()) = 'active'
      AND app_security.has_current_policy_acceptance(auth.uid())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_media.listing_id
      AND l.seller_id = auth.uid()
      AND l.status IN ('draft', 'rejected', 'active', 'reserved', 'paused', 'pending_review')
      AND app_security.get_account_status(auth.uid()) = 'active'
      AND app_security.has_current_policy_acceptance(auth.uid())
  )
);

-- =============================================================================
-- 2. Transactional Seller Media Reorder RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION app_security.impl_seller_reorder_listing_media(
  p_listing_id uuid,
  p_media_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_listing record;
  v_current_ids uuid[];
  v_requested_count integer;
  v_existing_count integer;
  v_idx integer;
BEGIN
  -- 1. Authentication check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required';
  END IF;

  -- 2. Account status check
  IF app_security.get_account_status(v_uid) != 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_RESTRICTED: Account is not active';
  END IF;

  -- 3. Policy acceptance check
  IF NOT app_security.has_current_policy_acceptance(v_uid) THEN
    RAISE EXCEPTION 'POLICY_ACCEPTANCE_REQUIRED: Policy acceptance required';
  END IF;

  -- 4. Lock and verify listing existence and ownership
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.seller_id != v_uid THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND: Listing not found';
  END IF;

  -- 5. Mutable listing status check
  IF v_listing.status NOT IN ('draft', 'rejected', 'active', 'reserved', 'paused', 'pending_review') THEN
    RAISE EXCEPTION 'LISTING_MEDIA_NOT_EDITABLE: Media cannot be reordered in status %', v_listing.status;
  END IF;

  -- 6. Validate input array bounds
  v_requested_count := coalesce(cardinality(p_media_ids), 0);
  IF v_requested_count < 1 THEN
    RAISE EXCEPTION 'INVALID_MEDIA_REQUEST: Media IDs array cannot be empty';
  END IF;

  IF v_requested_count > 8 THEN
    RAISE EXCEPTION 'PHOTO_LIMIT_REACHED: Maximum 8 photos allowed per listing';
  END IF;

  -- 7. Validate uniqueness in requested array
  IF (SELECT count(DISTINCT id) FROM unnest(p_media_ids) AS id) != v_requested_count THEN
    RAISE EXCEPTION 'INVALID_MEDIA_REQUEST: Duplicate media IDs provided in reorder list';
  END IF;

  -- 8. Lock all current non-failed media rows for this listing
  PERFORM 1
  FROM public.listing_media
  WHERE listing_id = p_listing_id
    AND processing_status != 'failed'
  FOR UPDATE;

  SELECT array_agg(id ORDER BY display_order ASC, created_at ASC)
  INTO v_current_ids
  FROM public.listing_media
  WHERE listing_id = p_listing_id
    AND processing_status != 'failed';

  v_existing_count := coalesce(cardinality(v_current_ids), 0);

  -- 9. Complete membership check: exact match required
  IF v_requested_count != v_existing_count THEN
    RAISE EXCEPTION 'INVALID_MEDIA_REQUEST: Complete membership required. Expected % photos, got %', v_existing_count, v_requested_count;
  END IF;

  -- Ensure every requested ID is in v_current_ids
  IF NOT (p_media_ids <@ v_current_ids AND v_current_ids <@ p_media_ids) THEN
    RAISE EXCEPTION 'INVALID_MEDIA_REQUEST: Reorder list does not match persisted media set';
  END IF;

  -- 10. Perform atomic reorder
  -- Use a CASE statement update to set final display_order 0..(count - 1) deterministically
  UPDATE public.listing_media m
  SET display_order = pos.new_order
  FROM (
    SELECT unnest(p_media_ids) AS id, generate_subscripts(p_media_ids, 1) - 1 AS new_order
  ) pos
  WHERE m.id = pos.id AND m.listing_id = p_listing_id;

  -- 11. Audit log
  PERFORM app_security.log_audit_event(
    'media.reordered',
    'listings',
    p_listing_id,
    jsonb_build_object('media_ids', p_media_ids)
  );

  RETURN jsonb_build_object(
    'success', true,
    'count', v_requested_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_reorder_listing_media(
  listing_id uuid,
  media_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN app_security.impl_seller_reorder_listing_media(listing_id, media_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.seller_reorder_listing_media(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_reorder_listing_media(uuid, uuid[]) TO authenticated, service_role;

-- =============================================================================
-- 3. Transactional Seller Cover Photo Selection RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION app_security.impl_seller_set_listing_cover_photo(
  p_listing_id uuid,
  p_media_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_listing record;
  v_media record;
BEGIN
  -- 1. Authentication check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required';
  END IF;

  -- 2. Account status check
  IF app_security.get_account_status(v_uid) != 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_RESTRICTED: Account is not active';
  END IF;

  -- 3. Policy acceptance check
  IF NOT app_security.has_current_policy_acceptance(v_uid) THEN
    RAISE EXCEPTION 'POLICY_ACCEPTANCE_REQUIRED: Policy acceptance required';
  END IF;

  -- 4. Lock and verify listing existence and ownership
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.seller_id != v_uid THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND: Listing not found';
  END IF;

  -- 5. Mutable listing status check
  IF v_listing.status NOT IN ('draft', 'rejected', 'active', 'reserved', 'paused', 'pending_review') THEN
    RAISE EXCEPTION 'LISTING_MEDIA_NOT_EDITABLE: Cover photo cannot be set in status %', v_listing.status;
  END IF;

  -- 6. Lock and verify media existence on this listing and ready status
  SELECT * INTO v_media
  FROM public.listing_media
  WHERE id = p_media_id AND listing_id = p_listing_id
  FOR UPDATE;

  IF v_media.id IS NULL THEN
    RAISE EXCEPTION 'MEDIA_NOT_FOUND: Media % not found on listing %', p_media_id, p_listing_id;
  END IF;

  IF v_media.processing_status != 'ready' THEN
    RAISE EXCEPTION 'COVER_UPDATE_FAILED: Media is not ready (status: %)', v_media.processing_status;
  END IF;

  -- 7. Update cover_photo_id
  -- trg_listings_before_update will handle material re-review transition if active/reserved/paused,
  -- and will not create duplicate transitions if already pending_review.
  UPDATE public.listings
  SET cover_photo_id = p_media_id,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_listing_id;

  -- 8. Audit log
  PERFORM app_security.log_audit_event(
    'listing.cover_photo_updated',
    'listings',
    p_listing_id,
    jsonb_build_object('cover_photo_id', p_media_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'cover_photo_id', p_media_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_set_listing_cover_photo(
  listing_id uuid,
  media_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN app_security.impl_seller_set_listing_cover_photo(listing_id, media_id);
END;
$$;

REVOKE ALL ON FUNCTION public.seller_set_listing_cover_photo(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_set_listing_cover_photo(uuid, uuid) TO authenticated, service_role;
