-- Migration 25: 20260929000025_india_postal_location_schema.sql
-- India Postal Data reference table, Postal Pincode to Locality mapping, City district column, Listing landmark column, and lookup_pincode RPC

-- 1. Create public.india_postal_data table
CREATE TABLE IF NOT EXISTS public.india_postal_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode text NOT NULL CHECK (pincode ~ '^\d{6}$'),
  office_name text NOT NULL,
  office_type text,
  delivery_status text,
  division text,
  region text,
  circle text,
  taluk text,
  district text NOT NULL,
  state text NOT NULL,
  source text NOT NULL DEFAULT 'data.gov.in',
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_india_postal_data_pincode_office UNIQUE (pincode, office_name)
);

-- 2. Add district column to public.cities if not exists
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS district text;

-- 3. Create public.postal_pincode_localities mapping table
CREATE TABLE IF NOT EXISTS public.postal_pincode_localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode text NOT NULL CHECK (pincode ~ '^\d{6}$'),
  locality_id uuid NOT NULL REFERENCES public.localities(id) ON DELETE CASCADE,
  office_name text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_postal_pincode_locality UNIQUE (pincode, locality_id)
);

-- 4. Add landmark column to public.listings if not exists
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS landmark text CHECK (landmark IS NULL OR length(trim(landmark)) <= 200);

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS idx_india_postal_data_pincode ON public.india_postal_data(pincode);
CREATE INDEX IF NOT EXISTS idx_india_postal_data_state_district ON public.india_postal_data(state, district);
CREATE INDEX IF NOT EXISTS idx_postal_pincode_localities_pincode ON public.postal_pincode_localities(pincode);
CREATE INDEX IF NOT EXISTS idx_postal_pincode_localities_locality ON public.postal_pincode_localities(locality_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.india_postal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postal_pincode_localities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Read-only reference data for all users)
CREATE POLICY india_postal_data_select_policy ON public.india_postal_data
  FOR SELECT USING (true);

CREATE POLICY postal_pincode_localities_select_policy ON public.postal_pincode_localities
  FOR SELECT USING (true);

-- 7. Explicit PostgreSQL Grants
REVOKE ALL ON public.india_postal_data FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.postal_pincode_localities FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.india_postal_data TO anon, authenticated;
GRANT SELECT ON public.postal_pincode_localities TO anon, authenticated;

GRANT ALL ON public.india_postal_data TO service_role;
GRANT ALL ON public.postal_pincode_localities TO service_role;

-- 8. Create lookup_pincode RPC function
CREATE OR REPLACE FUNCTION public.lookup_pincode(p_pincode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pincode text := trim(p_pincode);
  v_postal_records jsonb;
  v_localities jsonb;
  v_state text;
  v_district text;
  v_city text;
  v_city_id uuid;
BEGIN
  IF v_pincode IS NULL OR v_pincode !~ '^\d{6}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PINCODE',
      'message', 'PIN code must be exactly 6 numeric digits'
    );
  END IF;

  -- 1. Fetch raw postal records from india_postal_data
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'office_name', office_name,
        'office_type', office_type,
        'delivery_status', delivery_status,
        'division', division,
        'region', region,
        'circle', circle,
        'taluk', taluk,
        'district', district,
        'state', state
      )
    ),
    MAX(state),
    MAX(district),
    MAX(COALESCE(taluk, district))
  INTO v_postal_records, v_state, v_district, v_city
  FROM public.india_postal_data
  WHERE pincode = v_pincode;

  IF v_postal_records IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PINCODE_NOT_FOUND',
      'message', 'PIN code not found in postal database'
    );
  END IF;

  -- 2. Fetch linked FairSwap localities for this pincode
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'slug', l.slug,
      'city_id', l.city_id,
      'city_name', c.name,
      'state', c.state,
      'district', c.district
    ) ORDER BY l.name ASC
  )
  INTO v_localities
  FROM public.postal_pincode_localities ppl
  JOIN public.localities l ON l.id = ppl.locality_id
  JOIN public.cities c ON c.id = l.city_id
  WHERE ppl.pincode = v_pincode AND l.is_active = true AND c.is_active = true;

  -- 3. Also check if city match exists by district/city name in existing cities table
  SELECT id INTO v_city_id
  FROM public.cities
  WHERE is_active = true AND (
    lower(name) = lower(v_district) OR lower(name) = lower(v_city)
  )
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'pincode', v_pincode,
    'state', v_state,
    'district', v_district,
    'city', v_city,
    'city_id', v_city_id,
    'postal_offices', v_postal_records,
    'localities', COALESCE(v_localities, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_pincode(text) TO anon, authenticated, service_role;
