-- Migration snippet / contract definition for ADS-01: get_my_listing_counts RPC
-- Seller-only get_my_listing_counts() RPC using SECURITY INVOKER and RLS.

CREATE OR REPLACE FUNCTION public.get_my_listing_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seller_id uuid;
  v_counts jsonb;
BEGIN
  v_seller_id := auth.uid();
  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object(
      'all', 0,
      'active', 0,
      'pending_review', 0,
      'draft', 0,
      'paused', 0,
      'sold', 0,
      'rejected', 0,
      'expired', 0
    );
  END IF;

  SELECT jsonb_build_object(
    'all', count(*)::integer,
    'active', count(*) FILTER (WHERE status IN ('active', 'reserved'))::integer,
    'pending_review', count(*) FILTER (WHERE status = 'pending_review')::integer,
    'draft', count(*) FILTER (WHERE status = 'draft')::integer,
    'paused', count(*) FILTER (WHERE status = 'paused')::integer,
    'sold', count(*) FILTER (WHERE status = 'sold')::integer,
    'rejected', count(*) FILTER (WHERE status = 'rejected')::integer,
    'expired', count(*) FILTER (WHERE status = 'expired')::integer
  ) INTO v_counts
  FROM public.listings
  WHERE seller_id = v_seller_id;

  RETURN COALESCE(v_counts, jsonb_build_object(
    'all', 0,
    'active', 0,
    'pending_review', 0,
    'draft', 0,
    'paused', 0,
    'sold', 0,
    'rejected', 0,
    'expired', 0
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_listing_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_listing_counts() TO authenticated;
