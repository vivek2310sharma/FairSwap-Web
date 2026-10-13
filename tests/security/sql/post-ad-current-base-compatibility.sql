-- AUTHORED / NOT RUN: structural plus real-operation disposable regressions.
-- Use only after source review, on an explicitly approved disposable database.
-- Behavioural companion suites: listings-rls.test.ts and
-- pending_review_media_invalidation.test.sql; neither is replaced here.
BEGIN;
SET LOCAL search_path=public,extensions,pg_temp;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
-- Run only through the dedicated loopback/marker-gated local test runner.
-- All fixtures and effects roll back. SQL role simulation is not real MFA proof.
DO $isolation$
BEGIN
  IF current_setting('app.post_ad_test_run_id',true) IS NULL OR NOT EXISTS (
    SELECT 1 FROM test_validation_meta.run_identity
    WHERE run_id=current_setting('app.post_ad_test_run_id',true)
      AND task='POST-AD-DISPOSABLE-DB-VERIFY-01'
  ) THEN RAISE EXCEPTION 'Positively identified disposable Post Ad database required'; END IF;
  -- Ensure direct-mutation denial tests reach the installed permit/lifecycle guard,
  -- rather than falsely succeeding because this role lacks UPDATE privilege.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'Existing native service_role BYPASSRLS contract missing; do not fabricate role rights';
  END IF;
  IF NOT has_column_privilege('service_role','public.listing_media','processing_status','UPDATE') THEN
    RAISE EXCEPTION 'Installed service_role lacks required media UPDATE privilege; do not fabricate grants';
  END IF;
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name IN (
    'email_outbox_worker_url','email_worker_secret','moderation_worker_url','moderation_worker_secret'))
  THEN RAISE EXCEPTION 'Disposable suite requires no worker dispatch secrets/endpoints'; END IF;
  IF (SELECT setting_value FROM public.app_system_settings
      WHERE setting_key='moderation_automation_enabled') IS DISTINCT FROM 'false'
  THEN RAISE EXCEPTION 'Existing moderation dispatch must already be disabled'; END IF;
END;
$isolation$;
SELECT no_plan();
SELECT alike(pg_get_functiondef('app_security.impl_seller_submit_listing(uuid)'::regprocedure),
  '%v_next_revision := v_listing.revision + 1%', 'rejected resubmission advances reviewed revision');
SELECT alike(pg_get_functiondef('app_security.impl_seller_submit_listing(uuid)'::regprocedure),
  '%rejection_reason = NULL%', 'resubmission clears the rejected-state reason');
SELECT alike(pg_get_functiondef('app_security.impl_seller_submit_listing(uuid)'::regprocedure),
  '%RETURN app_security.impl_submit_test_family(p_listing_id,null)%', 'family submission delegation survives');
SELECT alike(pg_get_functiondef('app_security.impl_record_media_processing_result(uuid,jsonb,jsonb,text,text)'::regprocedure),
  '%v_media.listing_id IS DISTINCT FROM v_listing_id%', 'media membership is revalidated after locking');
SELECT alike(pg_get_functiondef('app_security.impl_record_media_processing_result(uuid,jsonb,jsonb,text,text)'::regprocedure),
  '%test_submission_permits%', 'family worker completion permit survives');
SELECT ok(
  strpos(pg_get_functiondef('app_security.impl_record_media_processing_result(uuid,jsonb,jsonb,text,text)'::regprocedure), 'SELECT * INTO parent') > 0 AND
  strpos(pg_get_functiondef('app_security.impl_record_media_processing_result(uuid,jsonb,jsonb,text,text)'::regprocedure), 'SELECT * INTO parent') <
  strpos(pg_get_functiondef('app_security.impl_record_media_processing_result(uuid,jsonb,jsonb,text,text)'::regprocedure), 'SELECT * INTO v_media'),
  'parent lock precedes attachment lock');

-- Helpers never replace application functions, grant privileges or mint permits.
-- Calls run under real installed roles; caught failures roll back their subtransaction.
CREATE FUNCTION pg_temp.pc_call(actor text, subject uuid, statement text, aal text DEFAULT 'aal1')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $helper$
DECLARE answer jsonb; prior_sub text:=current_setting('request.jwt.claim.sub',true);
 prior_claims text:=current_setting('request.jwt.claims',true);
BEGIN
  IF actor NOT IN ('authenticated','service_role') THEN RAISE EXCEPTION 'Unsupported test role'; END IF;
  BEGIN
    EXECUTE format('SET LOCAL ROLE %I',actor);
    PERFORM set_config('request.jwt.claim.sub',coalesce(subject::text,''),true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role',actor,'aal',aal)::text,true);
    EXECUTE statement INTO answer;
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub',coalesce(prior_sub,''),true);
    PERFORM set_config('request.jwt.claims',coalesce(prior_claims,'{}'),true);
    RETURN jsonb_build_object('ok',true,'result',answer);
  EXCEPTION WHEN OTHERS THEN
    -- SET ROLE, JWT changes, permits and database writes rolled back together.
    RETURN jsonb_build_object('ok',false,'code',SQLSTATE,'message',SQLERRM);
  END;
END;
$helper$;

CREATE TEMP TABLE pc_ids AS SELECT gen_random_uuid() owner_id, gen_random_uuid() reviewer_id,
 gen_random_uuid() city_id, gen_random_uuid() goods_category_id;
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at)
SELECT id,'pc-'||id::text||'@example.invalid',jsonb_build_object(
 'display_name','Disposable compatibility fixture','terms_accepted','true','terms_version','2026-09-18',
 'privacy_policy_version','2026-09-18','acceptable_use_version','2026-09-18','age_confirmed','true'),now(),now()
FROM pc_ids CROSS JOIN LATERAL (VALUES(owner_id),(reviewer_id)) u(id);
INSERT INTO public.policy_acceptance_records(user_id,terms_version,privacy_policy_version,acceptable_use_version,minimum_age_confirmed)
SELECT id,'2026-09-18','2026-09-18','2026-09-18',18
FROM pc_ids CROSS JOIN LATERAL (VALUES(owner_id),(reviewer_id)) u(id);
INSERT INTO public.staff_roles(user_id,role) SELECT reviewer_id,'moderator' FROM pc_ids;
INSERT INTO public.cities(id,name,state,slug,is_active)
SELECT city_id,'Disposable compatibility city','Synthetic state','pc-'||city_id::text,true FROM pc_ids;
INSERT INTO public.categories(id,name,slug,macro_category,is_active,new_listing_enabled)
SELECT goods_category_id,'Disposable Goods','pc-'||goods_category_id::text,'goods',true,true FROM pc_ids;

CREATE FUNCTION pg_temp.pc_media(lid uuid,subject uuid,ordering integer) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER AS $helper$
DECLARE answer jsonb; mid uuid;
BEGIN
 answer:=pg_temp.pc_call('authenticated',subject,format(
  'INSERT INTO public.listing_media(listing_id,original_filename,content_type,file_size_bytes) VALUES(%L::uuid,''pc.jpg'',''image/jpeg'',512) RETURNING to_jsonb(id)',lid));
 IF answer->>'ok'<>'true' THEN RAISE EXCEPTION 'Media fixture failed: %',answer; END IF;
 mid:=(answer->>'result')::uuid;
 IF (SELECT display_order FROM public.listing_media WHERE id=mid) IS DISTINCT FROM ordering THEN
   RAISE EXCEPTION 'Native media insertion order differs from expected fixture order';
 END IF;
 RETURN mid;
END;
$helper$;
CREATE FUNCTION pg_temp.pc_process(lid uuid,mid uuid,subject uuid,actor text,state text DEFAULT 'ready') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $helper$
 SELECT pg_temp.pc_call(actor,subject,format(
  'SELECT public.record_media_processing_result(%L::uuid,%L::jsonb,%L::jsonb,%L,%L)',mid,
  jsonb_build_object('original',lid::text||'/'||mid::text||'/original.jpg',
   'thumbnail',lid::text||'/'||mid::text||'/thumbnail.jpg','medium',lid::text||'/'||mid::text||'/medium.jpg',
   'large',lid::text||'/'||mid::text||'/large.jpg')::text,'{"width":320,"height":240}',state,
   CASE WHEN state='failed' THEN 'Synthetic processing failure' ELSE NULL END));
$helper$;
CREATE FUNCTION pg_temp.pc_snapshot(lid uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER AS $helper$
 SELECT jsonb_build_object('listing',(SELECT to_jsonb(l) FROM public.listings l WHERE id=lid),
  'media',(SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM public.listing_media m WHERE listing_id=lid),
  'permits',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) FROM app_security.test_submission_permits p WHERE listing_id=lid));
$helper$;

-- Real Goods creation, submission, rejection and both resubmission routes.
CREATE FUNCTION pg_temp.pc_goods() RETURNS SETOF text LANGUAGE plpgsql SECURITY INVOKER AS $cases$
DECLARE ids record; lid uuid; mid uuid; answer jsonb; stored public.listings; initial_revision integer; after_submit integer;
 route text; before_state jsonb;
BEGIN
 SELECT * INTO ids FROM pc_ids;
 FOREACH route IN ARRAY ARRAY['direct','edited'] LOOP
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,format(
   'INSERT INTO public.listings(category_id,city_id,title,description,condition,price_type,price_paise,pin_code,category_attributes) VALUES(%L::uuid,%L::uuid,''Disposable Goods fixture'',''Disposable compatibility description'',''good'',''fixed'',123450,''560001'',''{}'') RETURNING to_jsonb(id)',ids.goods_category_id,ids.city_id));
  IF answer->>'ok'<>'true' THEN RAISE EXCEPTION 'Goods fixture failed: %',answer; END IF;
  lid:=(answer->>'result')::uuid; mid:=pg_temp.pc_media(lid,ids.owner_id,0);
  answer:=pg_temp.pc_process(lid,mid,NULL,'service_role');
  IF answer->>'ok'<>'true' THEN RAISE EXCEPTION 'Ready Goods fixture failed: %',answer; END IF;
  SELECT revision INTO initial_revision FROM public.listings WHERE id=lid;
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,format('SELECT public.seller_submit_listing(%L::uuid)',lid));
  RETURN NEXT is(answer->>'ok','true','Goods '||route||': draft submission succeeds');
  SELECT * INTO stored FROM public.listings WHERE id=lid;
  RETURN NEXT is(stored.revision,initial_revision,'Goods '||route||': draft keeps revision');
  RETURN NEXT is((answer->'result'->>'revision')::integer,stored.revision,'Goods '||route||': returned draft revision matches stored');
  RETURN NEXT is(stored.status::text,'pending_review','Goods '||route||': draft persisted pending');
  after_submit:=stored.revision;
  answer:=pg_temp.pc_call('authenticated',ids.reviewer_id,format(
   'SELECT public.moderate_listing_reviewed(%L::uuid,''reject'',''Synthetic rejection'',%s,''pending_review'')',lid,after_submit),'aal2');
  RETURN NEXT is(answer->>'ok','true','Goods '||route||': current review token permits reject');
  SELECT * INTO stored FROM public.listings WHERE id=lid;
  RETURN NEXT is(stored.status::text,'rejected','Goods '||route||': rejection persisted');
  IF route='edited' THEN
   answer:=pg_temp.pc_call('authenticated',ids.owner_id,format(
    'UPDATE public.listings SET title=''Edited disposable Goods fixture'' WHERE id=%L::uuid RETURNING to_jsonb(id)',lid));
   RETURN NEXT is(answer->>'ok','true','Goods edited: owner edit succeeds');
   SELECT * INTO stored FROM public.listings WHERE id=lid;
   RETURN NEXT is(stored.status::text,'draft','Goods edited: edit restores draft');
   RETURN NEXT is(stored.revision,after_submit+1,'Goods edited: edit increments revision once');
   RETURN NEXT is(stored.rejection_reason,NULL::text,'Goods edited: edit clears reason');
  END IF;
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,format('SELECT public.seller_submit_listing(%L::uuid)',lid));
  RETURN NEXT is(answer->>'ok','true','Goods '||route||': resubmission succeeds');
  SELECT * INTO stored FROM public.listings WHERE id=lid;
  RETURN NEXT is(stored.revision,after_submit+1,'Goods '||route||': exactly one revision advancement, no double increment');
  RETURN NEXT is((answer->'result'->>'revision')::integer,stored.revision,'Goods '||route||': returned resubmission revision matches persisted');
  RETURN NEXT is(stored.rejection_reason,NULL::text,'Goods '||route||': resubmission clears reason');
  before_state:=pg_temp.pc_snapshot(lid);
  answer:=pg_temp.pc_call('authenticated',ids.reviewer_id,format(
   'SELECT public.moderate_listing_reviewed(%L::uuid,''reject'',''Stale synthetic token'',%s,''pending_review'')',lid,after_submit),'aal2');
  RETURN NEXT is(answer->>'code','PT409','Goods '||route||': stale review token rejected');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,'Goods '||route||': stale token leaves protected state unchanged');
  answer:=pg_temp.pc_call('authenticated',ids.reviewer_id,format(
   'SELECT public.moderate_listing_reviewed(%L::uuid,''reject'',''Current synthetic token'',%s,''pending_review'')',lid,stored.revision),'aal2');
  RETURN NEXT is(answer->>'ok','true','Goods '||route||': current review token remains valid');
  RETURN NEXT is((SELECT status::text FROM public.listings WHERE id=lid),'rejected','Goods '||route||': current-token decision persisted');
  RETURN NEXT is((SELECT rejection_reason FROM public.listings WHERE id=lid),'Current synthetic token','Goods '||route||': current-token reason persisted');
 END LOOP;
END;
$cases$;
SELECT * FROM pg_temp.pc_goods();

CREATE FUNCTION pg_temp.pc_families() RETURNS SETOF text LANGUAGE plpgsql SECURITY INVOKER AS $cases$
DECLARE ids record; family text; ref record; attrs jsonb; common jsonb; answer jsonb; lid uuid;
 ready_mid uuid; work_mid uuid; fail_mid uuid; rev integer; before_state jsonb; scratch_mid uuid; save_statement text;
BEGIN
 SELECT * INTO ids FROM pc_ids;
 FOREACH family IN ARRAY ARRAY['two-wheelers','cars','property'] LOOP
  IF family='two-wheelers' THEN
   SELECT p.category_id,p.version_id INTO STRICT ref FROM public.vehicle_category_contracts p JOIN public.vehicle_contract_versions v ON v.id=p.version_id JOIN public.categories c ON c.id=p.category_id WHERE c.slug='tw-commuter-bikes' AND v.contract_key='two-wheeler-draft-v1' AND v.new_assignment_enabled;
  ELSIF family='cars' THEN
   SELECT p.category_id,p.version_id INTO STRICT ref FROM public.car_category_contracts p JOIN public.car_contract_versions v ON v.id=p.version_id JOIN public.categories c ON c.id=p.category_id WHERE c.slug='car-hatchback' AND v.contract_key='cars-draft-v1' AND v.new_assignment_enabled;
  ELSE
   SELECT p.category_id,p.version_id INTO STRICT ref FROM public.property_category_contracts p JOIN public.property_contract_versions v ON v.id=p.version_id JOIN public.categories c ON c.id=p.category_id WHERE c.slug='rental-apartment-or-flat' AND v.contract_key='property-rental-draft-v1' AND v.new_assignment_enabled;
  END IF;
  IF ref.category_id IS NULL THEN RAISE EXCEPTION 'Required installed contract missing for %',family; END IF;
  attrs:=CASE WHEN family='property' THEN '{}'::jsonb ELSE '{"year":{"state":"unknown"},"km_driven":{"state":"unknown"}}'::jsonb END;
  IF family='cars' THEN attrs:=attrs||'{"fuel_type":{"state":"unknown"},"transmission":{"state":"unknown"}}'::jsonb; END IF;
  common:=jsonb_build_object('category_id',ref.category_id,'city_id',ids.city_id,'title','Disposable family fixture',
   'description','Disposable compatibility description','pin_code','560001','category_attributes',attrs);
  IF family<>'property' THEN common:=common||'{"condition":"good","price_type":"fixed","price_paise":123450}'::jsonb; END IF;
  IF family='property' THEN
   answer:=pg_temp.pc_call('authenticated',ids.owner_id,format(
    'SELECT to_jsonb(public.save_property_draft(NULL,%L::jsonb,%L::uuid,%L::jsonb,NULL))',common::text,ref.version_id,
    '{"currency":"INR","period":"month","basis":"dwelling","rent":{"state":"known","amount_paise":123450}}'));
  ELSE
   answer:=pg_temp.pc_call('authenticated',ids.owner_id,format(
    'SELECT to_jsonb(public.%I(NULL,%L::jsonb,%L::uuid,%L::jsonb))',CASE WHEN family='cars' THEN 'save_car_draft' ELSE 'save_two_wheeler_draft' END,
    common::text,ref.version_id,jsonb_build_object('mode','not_listed','brand_text','Local Gate Brand '||left(ids.owner_id::text,8),
     'model_text','Local Gate Model '||left(ids.owner_id::text,8))::text));
  END IF;
  IF answer->>'ok'<>'true' THEN RAISE EXCEPTION 'Valid owner draft fixture failed for %: %',family,answer; END IF;
  lid:=(answer->>'result')::uuid;
  -- BEGIN ADDED OWNERSHIP DRAFT CASES
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  scratch_mid:=pg_temp.pc_media(lid,ids.owner_id,0);
  RETURN NEXT is((SELECT revision FROM public.listings WHERE id=lid),rev+1,'ADDED '||family||': draft media insert invalidates once');
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,format('SELECT public.seller_delete_listing_media(%L::uuid,%L::uuid)',lid,scratch_mid));
  RETURN NEXT is(answer->>'ok','true','ADDED '||family||': draft media deletion remains allowed');
  RETURN NEXT is((SELECT count(*)::integer FROM public.listing_media WHERE id=scratch_mid),0,'ADDED '||family||': draft deletion persisted');
  RETURN NEXT is((SELECT revision FROM public.listings WHERE id=lid),rev+1,'ADDED '||family||': draft deletion invalidates once');
  RETURN NEXT is((SELECT count(*)::integer FROM app_security.test_submission_permits WHERE listing_id=lid),0,'ADDED '||family||': draft operations leave no permits');
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  IF family='property' THEN
   save_statement:=format('SELECT to_jsonb(public.save_property_draft(%L::uuid,%L::jsonb,%L::uuid,%L::jsonb,NULL))',lid,common::text,ref.version_id,
     '{"currency":"INR","period":"month","basis":"dwelling","rent":{"state":"known","amount_paise":123451}}');
  ELSE
   save_statement:=format('SELECT to_jsonb(public.%I(%L::uuid,%L::jsonb,%L::uuid,%L::jsonb))',CASE WHEN family='cars' THEN 'save_car_draft' ELSE 'save_two_wheeler_draft' END,
     lid,common::text,ref.version_id,jsonb_build_object('mode','not_listed','brand_text','Local Gate Brand '||left(ids.owner_id::text,8),
      'model_text','Updated Gate Model '||left(ids.owner_id::text,8))::text);
  END IF;
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,save_statement);
  RETURN NEXT is(answer->>'ok','true','ADDED '||family||': owner context save remains allowed in draft');
  RETURN NEXT ok((SELECT revision FROM public.listings WHERE id=lid)>rev,'ADDED '||family||': real context save advances identity');
  RETURN NEXT is((SELECT status::text FROM public.listings WHERE id=lid),'draft','ADDED '||family||': context save retains draft');
  IF family='property' THEN
   RETURN NEXT is((SELECT financial->'rent'->>'amount_paise' FROM public.listing_property_contexts WHERE listing_id=lid),'123451','ADDED '||family||': changed financial context persisted');
  ELSIF family='cars' THEN
   RETURN NEXT is((SELECT model_text FROM public.listing_car_contexts WHERE listing_id=lid),'Updated Gate Model '||left(ids.owner_id::text,8),'ADDED '||family||': changed model context persisted');
  ELSE
   RETURN NEXT is((SELECT model_text FROM public.listing_vehicle_contexts WHERE listing_id=lid),'Updated Gate Model '||left(ids.owner_id::text,8),'ADDED '||family||': changed model context persisted');
  END IF;
  -- END ADDED OWNERSHIP DRAFT CASES
  ready_mid:=pg_temp.pc_media(lid,ids.owner_id,0);
  work_mid:=pg_temp.pc_media(lid,ids.owner_id,1);
  fail_mid:=pg_temp.pc_media(lid,ids.owner_id,2);
  answer:=pg_temp.pc_process(lid,ready_mid,NULL,'service_role');
  IF answer->>'ok'<>'true' THEN RAISE EXCEPTION 'Family ready photo fixture failed: %',answer; END IF;
  -- Validate deferred parent/context contracts before testing submitted records.
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,format('SELECT public.seller_submit_listing(%L::uuid,%s)',lid,rev));
  RETURN NEXT is(answer->>'ok','true',family||': real owner submit succeeds');
  RETURN NEXT is((SELECT status::text FROM public.listings WHERE id=lid),'pending_review',family||': submitted state persisted');
  IF answer->>'ok'<>'true' OR (SELECT status FROM public.listings WHERE id=lid)<>'pending_review' THEN
    RAISE EXCEPTION 'Required pending fixture could not be established for %',family;
  END IF;
  before_state:=pg_temp.pc_snapshot(lid);
  answer:=pg_temp.pc_process(lid,work_mid,ids.owner_id,'authenticated');
  RETURN NEXT is(answer->>'code','42501',family||': owner cannot invoke service worker RPC');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': unauthorized call leaves protected state unchanged');
  answer:=pg_temp.pc_call('service_role',NULL,format(
   'UPDATE public.listing_media SET processing_status=''ready'' WHERE id=%L::uuid RETURNING to_jsonb(id)',work_mid));
  RETURN NEXT is(answer->>'code','42501',family||': direct service mutation without private permit denied');
  RETURN NEXT is(answer->>'message','Awaiting review content and photos are read-only',family||': denial originates in actual private-permit guard');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': denied direct mutation rolls back');
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,format(
   'UPDATE public.listing_media SET listing_id=%L::uuid WHERE id=%L::uuid RETURNING to_jsonb(id)',gen_random_uuid(),work_mid));
  RETURN NEXT is(answer->>'code','42501',family||': owner cannot forge persisted parent association');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': association attempt leaves parent/media unchanged');
  answer:=pg_temp.pc_process(lid,gen_random_uuid(),NULL,'service_role');
  RETURN NEXT is(answer->>'ok','false',family||': missing media rejected');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': missing attachment leaves protected state unchanged');
  answer:=pg_temp.pc_process(gen_random_uuid(),work_mid,NULL,'service_role');
  RETURN NEXT is(answer->>'code','22023',family||': paths claiming incorrect parent membership rejected');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': invalid association paths roll back permits and state');
  answer:=pg_temp.pc_process(lid,work_mid,NULL,'service_role','invalid-status');
  RETURN NEXT is(answer->>'ok','false',family||': failure after permit insertion rejected');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': failure rolls back private permit and state');
  -- BEGIN ADDED OWNERSHIP PROCESSING CASES
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  answer:=pg_temp.pc_process(lid,work_mid,NULL,'service_role','processing');
  RETURN NEXT is(answer->>'ok','true','ADDED '||family||': accepted pending processing remains allowed');
  RETURN NEXT is((SELECT processing_status::text FROM public.listing_media WHERE id=work_mid),'processing','ADDED '||family||': processing state persisted');
  RETURN NEXT is((SELECT revision FROM public.listings WHERE id=lid),rev+1,'ADDED '||family||': processing invalidates once independently');
  RETURN NEXT is((SELECT count(*)::integer FROM app_security.test_submission_permits WHERE listing_id=lid),0,'ADDED '||family||': processing permit removed');
  -- END ADDED OWNERSHIP PROCESSING CASES
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  answer:=pg_temp.pc_process(lid,work_mid,NULL,'service_role');
  RETURN NEXT is(answer->>'ok','true',family||': authorized worker completion succeeds');
  RETURN NEXT is((SELECT processing_status::text FROM public.listing_media WHERE id=work_mid),'ready',family||': ready state persisted');
  RETURN NEXT is((SELECT listing_id FROM public.listing_media WHERE id=work_mid),lid,family||': parent/media association retained');
  RETURN NEXT is((SELECT medium_storage_path FROM public.listing_media WHERE id=work_mid),lid::text||'/'||work_mid::text||'/medium.jpg',family||': actual saved path is attachment-bound');
  RETURN NEXT is((SELECT width FROM public.listing_media WHERE id=work_mid),320,family||': dimensions persisted');
  RETURN NEXT is((SELECT revision FROM public.listings WHERE id=lid),rev+1,family||': worker advances revision once');
  RETURN NEXT is((SELECT count(*)::integer FROM app_security.test_submission_permits WHERE listing_id=lid),0,family||': worker permit removed');
  before_state:=pg_temp.pc_snapshot(lid);
  answer:=pg_temp.pc_process(lid,work_mid,NULL,'service_role','processing');
  RETURN NEXT is(answer->>'code','42501',family||': completed pending media cannot re-enter processing');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,family||': lifecycle denial rolls back permit and state');
  -- BEGIN ADDED OWNERSHIP PENDING CONTEXT CASES
  before_state:=pg_temp.pc_snapshot(lid);
  answer:=pg_temp.pc_call('authenticated',ids.owner_id,save_statement);
  RETURN NEXT is(jsonb_build_object('code',answer->>'code','message',answer->>'message'),
   jsonb_build_object('code',CASE WHEN family='property' THEN '42501' ELSE 'P0001' END,
    'message',CASE WHEN family='property' THEN 'Owned Property draft required' WHEN family='cars' THEN 'Owned car draft required' ELSE 'Owned vehicle draft required' END),
   'ADDED '||family||': pending owner context save stays denied');
  RETURN NEXT is(pg_temp.pc_snapshot(lid),before_state,'ADDED '||family||': denied context save preserves protected state');
  SELECT revision INTO rev FROM public.listings WHERE id=lid;
  -- END ADDED OWNERSHIP PENDING CONTEXT CASES
  answer:=pg_temp.pc_process(lid,fail_mid,NULL,'service_role','failed');
  RETURN NEXT is(answer->>'ok','true',family||': accepted attachment may complete with failure');
  RETURN NEXT is((SELECT processing_status::text FROM public.listing_media WHERE id=fail_mid),'failed',family||': failure outcome persisted');
  RETURN NEXT is((SELECT processing_error FROM public.listing_media WHERE id=fail_mid),'Synthetic processing failure',family||': failure reason persisted');
  RETURN NEXT is((SELECT count(*)::integer FROM app_security.test_submission_permits WHERE listing_id=lid),0,family||': failed completion also removes permit');
  -- BEGIN ADDED OWNERSHIP FAILED COMPLETION CASES
  RETURN NEXT is((SELECT revision FROM public.listings WHERE id=lid),rev+1,'ADDED '||family||': failed completion invalidates once independently');
  -- END ADDED OWNERSHIP FAILED COMPLETION CASES
 END LOOP;
END;
$cases$;
SELECT * FROM pg_temp.pc_families();
SET CONSTRAINTS ALL IMMEDIATE;

SELECT * FROM finish();
ROLLBACK;
