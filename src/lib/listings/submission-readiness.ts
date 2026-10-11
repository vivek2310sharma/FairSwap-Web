import {z} from 'zod';
import {draftListingSchema,submitListingSchema} from '@/types/listing';
import {twoWheelerV1,resolutionSchema,validateVehicleAnswers,validateVehicleSubmission,validateModelResolution} from './two-wheeler/contract';
import {carsV1,validateCarAnswers,carCompatibility} from './cars/contract';
import {propertyV1,validatePropertyDraft,propertyFinancialSchema} from './property/contract';

export const families=['goods','legacy','two-wheelers','cars','property','unresolved'] as const;
const familySchema=z.enum(families);
const outcome=z.enum(['pass','fail','not_verified','not_applicable']);
const provenance=z.object({contract:z.string(),versionId:z.string().uuid().nullable(),source:z.string()}).strict();
export const checkSchema=z.object({id:z.string(),family:familySchema,field:z.string(),
  ruleStatus:z.enum(['approved','recommended','policy_pending']),
  stage:z.enum(['draft','approved_completeness','candidate','review','runtime','freshness']),
  outcome,message:z.string().max(400),provenance}).strict();
export type ReadinessCheck=z.infer<typeof checkSchema>;
// Saved category membership is checked separately; private metadata never becomes
// a business answer. storage_gb is capacity, unlike storage paths/object keys.
export function reviewableField(name:string):boolean {
  return /^[a-z][a-z0-9_]*$/.test(name)
    && !/(?:^|_)(?:pin|pincode|address|landmark|society|building|credentials?|tokens?)(?:_|$)/i.test(name)
    && !/(?:^|_)(?:path|url|bucket|object_key|secret|password)(?:_|$)/i.test(name);
}
const identity=z.object({id:z.string().uuid(),category_id:z.string().uuid(),status:z.string().max(30),revision:z.number().int().positive(),updated_at:z.string()});
const listingSchema=identity.extend({title:draftListingSchema.shape.title,description:draftListingSchema.shape.description.transform(v=>v??null),city_id:z.string().uuid().nullable(),locality_id:z.string().uuid().nullable(),condition:z.enum(['new','like_new','good','fair','poor']).nullable(),price_type:z.enum(['fixed','negotiable','free']).nullable(),price_paise:z.number().nullable(),category_attributes:z.record(z.unknown()),cover_photo_id:z.string().uuid().nullable()}).strip();
const contextSchema=z.object({listing_id:z.string().uuid(),category_id:z.string().uuid(),version_id:z.string().uuid(),mode:z.string().optional(),brand_id:z.string().uuid().nullable().optional(),model_id:z.string().uuid().nullable().optional(),brand_text:z.string().nullable().optional(),model_text:z.string().nullable().optional(),classification_review_required:z.boolean().optional(),financial:z.unknown().optional()}).strip();
const referenceSchema=z.object({categoryId:z.string().uuid(),versionId:z.string().uuid().nullable(),path:z.array(z.string()).min(1).max(3),fields:z.array(z.string()),attributes:z.array(z.object({name:z.string(),label:z.string(),is_required:z.boolean()}).strip()),snapshotId:z.string().uuid().nullable(),contractKey:z.string(),versionDefinition:z.unknown().optional(),categoryDefinition:z.unknown().optional()}).strict();
const modelSchema=z.object({id:z.string().uuid(),brand_id:z.string().uuid(),brand:z.string().max(100),model:z.string().max(150),snapshotId:z.string().uuid(),selectionEnabled:z.boolean(),raw:z.union([
  z.object({brand:z.string(),model:z.string(),vehicle_type:z.string(),category:z.string(),fuel_type:z.string(),engine_cc:z.string(),status:z.string()}).strict(),
  z.object({brand:z.string(),model:z.string(),body_type:z.string(),segment:z.string(),status:z.string()}).strict(),
])}).strict();
const observationsSchema=z.object({owner:outcome,account:outcome,policy:outcome,maintenance:outcome,pin:outcome,location:outcome,registration:outcome,privateDraft:outcome}).strict();
export const readinessInputSchema=z.object({family:familySchema,listing:listingSchema,context:contextSchema.nullable(),reference:referenceSchema.nullable(),model:modelSchema.nullable(),
  reader:z.enum(['owner','staff']).default('owner'),consistency:z.enum(['multiple_reads','statement_snapshot']).default('multiple_reads'),answerProjectionComplete:z.boolean().default(true),testSubmissionAvailable:z.boolean().optional(),
  media:z.array(z.object({id:z.string().uuid(),listing_id:z.string().uuid(),processing_status:z.enum(['uploading','processing','ready','failed']),display_order:z.number().int()}).strict()).nullable(),
  savedContract:z.object({versionId:z.string().uuid(),contractKey:z.string().nullable()}).strict().optional(),
  observations:observationsSchema,capturedAt:z.string().datetime(),endIdentity:identity.nullable(),now:z.string().datetime()}).strict();
export type ReadinessInput=z.infer<typeof readinessInputSchema>;
export const reviewPacketSchema=z.object({identity:identity, family:familySchema,category:z.array(z.string()),provenance,
  advertisement:z.object({title:draftListingSchema.shape.title,description:draftListingSchema.shape.description.transform(v=>v??null)}).strict(),
  reader:z.enum(['owner','staff']).default('owner'),capturedAt:z.string().datetime(),consistency:z.enum(['multiple_reads','statement_snapshot','mismatch']),
  sellerAnswers:z.array(z.object({field:z.string().refine(reviewableField),label:z.string(),value:z.string().max(600)}).strict()),
  catalogue:z.object({mode:z.string(),brand:z.string().max(100).nullable(),model:z.string().max(150).nullable(),modelId:z.string().uuid().nullable(),snapshotId:z.string().uuid().nullable(),facts:z.array(z.object({field:z.enum(['vehicle_type','category','fuel_type','engine_cc','status','body_type','segment']),value:z.string().max(150)}).strict())}).strict().nullable(),
  pricing:z.union([z.object({kind:z.literal('item'),type:z.enum(['fixed','negotiable','free']).nullable(),amountPaise:z.number().int().nonnegative().nullable()}).strict(),z.object({kind:z.literal('rental'),financial:propertyFinancialSchema}).strict(),z.object({kind:z.literal('unavailable')}).strict()]),
  photos:z.object({count:z.number().int().nonnegative().nullable(),ready:z.number().int().nonnegative().nullable(),coverId:z.string().uuid().nullable(),items:z.array(readinessInputSchema.shape.media.unwrap().element.omit({listing_id:true})).default([])}).strict(),checks:z.array(checkSchema),transition:z.literal('assessment_only')}).strict();
export type ReviewPacket=z.infer<typeof reviewPacketSchema>;
export type ReadinessResult={checks:ReadinessCheck[];packet:ReviewPacket|null};
const source='Post-Ad-Submission-Review-Contract.md';
const contracts={goods:'existing-goods',legacy:'existing-legacy','two-wheelers':twoWheelerV1.key,cars:carsV1.key,property:propertyV1.key,unresolved:'unresolved'};
/** JSONB object order is immaterial; source path/field array order is retained. */
function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value)??'undefined';
}
export function supportsSavedContract(family:ReadinessInput['family'],ref:ReadinessInput['reference']):boolean {
  if(!ref)return false;
  if(family==='goods'||family==='legacy')return ref.contractKey===contracts[family]&&ref.versionId===null&&ref.path.length===1;
  const definition=family==='two-wheelers'?twoWheelerV1:family==='cars'?carsV1:family==='property'?propertyV1:null;
  if(!definition||ref.contractKey!==definition.key||!ref.versionId||canonical(ref.versionDefinition)!==canonical(definition))return false;
  const path=definition.paths.find(p=>canonical(p.path)===canonical(ref.path));
  return !!path&&canonical(ref.fields)===canonical(path.fields)
    && (family==='property'?ref.snapshotId===null&&canonical(ref.categoryDefinition)===canonical(path):!!ref.snapshotId);
}
function scalarAnswer(value:unknown):boolean {
  return typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value);
}
function display(value:unknown):string {
  if(value&&typeof value==='object'&&!Array.isArray(value)){
    const a=value as Record<string,unknown>;
    if(a.state==='known')return `${a.value??a.amount_paise}${a.other?` (${a.other})`:''}${a.basis==='electric_only'?' km electric-only':''}`;
    if(a.state==='provided')return `Provided registration reference ${a.state_id}`;
    if(a.state)return String(a.state).replaceAll('_',' ');
    if(typeof a.months==='number')return `${a.months} months${a.as_of?` as of ${a.as_of}`:''}`;
    return 'Invalid answer';
  }
  return String(value);
}
/** Evaluation never confers transition permission. Policy statuses are fixed here,
 * not accepted from callers. Output is constructed explicitly; private input rows
 * are never spread into a reviewer packet. */
export function evaluateReadiness(raw:unknown):ReadinessResult {
  const parsed=readinessInputSchema.safeParse(raw);
  if(!parsed.success)return {packet:null,checks:[{id:'snapshot.invalid',family:'unresolved',field:'snapshot',ruleStatus:'approved',stage:'draft',outcome:'not_verified',message:'Saved data could not be validated. Refresh; no readiness conclusion is available.',provenance:{contract:'unresolved',versionId:null,source}}]};
  const v=parsed.data,l=v.listing,f=v.family,ref=v.reference,c=v.context;
  const p={contract:ref?.contractKey??v.savedContract?.contractKey??(['goods','legacy'].includes(f)?contracts[f]:'unavailable-saved-contract'),versionId:ref?.versionId??v.savedContract?.versionId??c?.version_id??null,source};
  const checks:ReadinessCheck[]=[];
  const add=(id:string,field:string,stage:ReadinessCheck['stage'],ruleStatus:ReadinessCheck['ruleStatus'],result:ReadinessCheck['outcome'],message:string)=>checks.push({id,family:f,field,stage,ruleStatus,outcome:result,message,provenance:p});
  if(v.reader==='staff')add('staff.authorization','reviewer access','runtime','approved','pass','Database verified active moderator/administrator, AAL2, current reviewer policy, eligible status and non-self access. This is not seller policy readiness.');
  for(const [key,result] of Object.entries(v.observations))add(`common.${key}`,key,'approved_completeness','approved',result,`${key}: ${result==='pass'?'verified from saved reads':result==='fail'?'needs correction':result==='not_applicable'?'not applicable':'could not be verified'}.`);
  const bound=!!ref&&ref.categoryId===l.category_id&&(f==='goods'||f==='legacy'||!!c&&c.listing_id===l.id&&c.category_id===l.category_id&&c.version_id===ref.versionId);
  add('reference.binding','category/version','draft','approved',bound?'pass':'not_verified',bound?'Saved category/version binding verified.':'Saved category/version is unavailable or mismatched.');
  const supported=bound&&supportsSavedContract(f,ref);
  add('reference.supported','saved contract definition','draft','approved',supported?'pass':'not_verified',supported?'Saved contract key, family, path and definition match the supported implementation.':'Saved contract is missing, unsupported or mismatched. Family validity/completeness is not verified; captured provenance is retained.');
  const common=draftListingSchema.safeParse({...l,pin_code:null,landmark:null});
  add('draft.common','common answers','draft','approved',common.success?'pass':'fail',common.success?'Common saved draft values are valid.':'Correct invalid common draft values.');
  // The database completeness check trims title/description; the PIN is a
  // placeholder solely for this independent details schema, never verification.
  const commonSubmission=submitListingSchema.safeParse({...l,title:l.title.trim(),description:l.description?.trim()??null,pin_code:'000000'});
  if(f!=='property')add('common.details','title/description/city/condition/item price','approved_completeness','approved',!supported?'not_verified':commonSubmission.success?'pass':'fail',!supported?'Saved contract is unsupported; family completeness is not verified.':commonSubmission.success?'Saved common item details are complete.':'Complete description, city, condition and non-free item amount. PIN integrity is assessed separately.');
  else add('property.common','title/description/city','approved_completeness','approved',!supported?'not_verified':l.title.trim().length>=3&&(l.description?.trim().length??0)>=10&&!!l.city_id?'pass':'fail','Approved Test minimum: title, description and city must be complete; no generic item condition or price.');
  const matchedMedia=v.media?.every(m=>m.listing_id===l.id)??false;
  const ready=matchedMedia?v.media!.filter(m=>m.processing_status==='ready').length:null;
  add('photos.submission','photos','approved_completeness','approved',ready===null?'not_verified':ready>=1?'pass':'fail','Submission requires at least one ready photo.');
  add('photos.approval','photos','review','approved',ready===null?'not_verified':v.media!.length>0&&ready===v.media!.length?'pass':'fail','Approval requires a nonempty set with every photo ready.');
  add('photos.maximum','photos','draft','approved',ready===null?'not_verified':v.media!.length<=8?'pass':'fail','Maximum eight photos.');
  add('photos.cover','cover photo','review','approved',ready===null?'not_verified':!l.cover_photo_id?'not_applicable':v.media!.some(m=>m.id===l.cover_photo_id&&m.processing_status==='ready')?'pass':'fail',!l.cover_photo_id?'No cover selected; existing submission can assign a ready photo.':'Cover must belong to this listing and be ready.');
  let answers:Record<string,unknown>={};
  let financial:z.infer<typeof propertyFinancialSchema>|null=null;
  const path=!supported?null:f==='cars'?carsV1.paths.find(x=>JSON.stringify(x.path)===JSON.stringify(ref?.path)):f==='two-wheelers'?twoWheelerV1.paths.find(x=>JSON.stringify(x.path)===JSON.stringify(ref?.path)):null;
  const propertyPath=supported?propertyV1.paths.find(x=>JSON.stringify(x.path)===JSON.stringify(ref?.path)):undefined;
  if((f==='cars'||f==='two-wheelers')&&path&&bound){
    const a=f==='cars'?validateCarAnswers(l.category_attributes,path,new Date(v.now)):validateVehicleAnswers(l.category_attributes,path,new Date(v.now));
    if(!a.error&&a.data)answers=a.data;
    add('draft.answers','seller answers','draft','approved',a.error?'fail':'pass',a.error?'Correct invalid or incomplete Known vehicle answers.':'Saved vehicle answers satisfy the draft validator.');
    const resolution=resolutionSchema.safeParse(c?.mode==='not_listed'?{mode:c.mode,brand_text:c.brand_text,model_text:c.model_text}:c?.mode==='catalogue'||c?.mode==='unresolved'?{mode:c.mode,brand_id:c.brand_id,model_id:c.model_id}:{mode:'unanswered'});
    add('model.declaration','brand/model','approved_completeness','approved',!resolution.success?'fail':resolution.data.mode==='unanswered'?'fail':'pass','Brand and Model information must be explicitly supplied; Not listed text stays seller-entered.');
    if(f==='two-wheelers'&&resolution.success){const r=validateVehicleSubmission(resolution.data,l.category_attributes,path as typeof twoWheelerV1.paths[number],new Date(v.now));add('vehicle.minimum','year/km','approved_completeness','approved',r.error?'fail':'pass','Approved pure minimum: year and kilometres Known or explicit Unknown. This evaluator is not a submit operation.');}
    if(f==='cars'){
      const declared=['year','km_driven',...path.fields.filter(x=>['fuel_type','transmission','powertrain'].includes(x)),...(path.fields.includes('battery_capacity_kwh')?['powertrain']:[])];
      const complete=declared.every(k=>{const a=answers[k] as {state?:string}|undefined;return a?.state==='known'||a?.state==='unknown';});
      add('cars.minimum','Test submission declarations','approved_completeness','approved',a.error||!complete?'fail':'pass','Approved Test minimum: year/km, applicable fuel/transmission and Electric/Hybrid powertrain Known or Unknown. Draft saving remains permissive.');
    }
    let compatibilityResult:ReadinessCheck['outcome']='not_verified';
    if(c?.mode==='not_listed')compatibilityResult='not_applicable';
    else if(v.model&&v.model.id===c?.model_id&&v.model.brand_id===c?.brand_id&&v.model.snapshotId===ref?.snapshotId&&resolution.success){
      if(f==='two-wheelers'&&'vehicle_type' in v.model.raw)compatibilityResult=validateModelResolution(resolution.data,path as typeof twoWheelerV1.paths[number],{id:v.model.id,brand_id:v.model.brand_id,raw:v.model.raw},true)?'fail':'pass';
      if(f==='cars'&&'body_type' in v.model.raw){const kind=carCompatibility(v.model.raw,path as typeof carsV1.paths[number]);compatibilityResult=kind==='incompatible'||(c.mode==='catalogue'&&!['exact','grouped'].includes(kind))||(c.mode==='unresolved'&&kind!=='unresolved')?'fail':'pass';}
    }
    add('model.compatibility','catalogue binding','review','approved',compatibilityResult,'Catalogue compatibility is separate from seller specifications; unavailable references are not verified.');
    const lifecycle=v.model?.raw.status;
    add('model.test_submission','catalogue submission lifecycle','approved_completeness','approved',c?.mode==='not_listed'?'not_applicable':!lifecycle?'not_verified':lifecycle==='Upcoming'?'fail':'pass','Upcoming remains draft-only, including retained references. Unresolved, Not listed and import-only may enter Test review; classification/evidence remains unresolved for approval.');
    const recognized=f==='cars'?['on_sale','discontinued','import_only']:['Current','Discontinued','Upcoming'];
    add('model.lifecycle','catalogue lifecycle','review','approved',c?.mode==='not_listed'?'not_applicable':!lifecycle?'not_verified':recognized.includes(lifecycle)?'pass':'fail','Catalogue lifecycle is a source fact; it does not certify publication eligibility.');
    if(c?.mode==='unresolved'||c?.mode==='not_listed'||lifecycle==='import_only'||lifecycle==='Upcoming'||c?.classification_review_required)add('policy.classification','classification/evidence','review','policy_pending','not_verified','FairSwap must approve evidence criteria before unresolved, Not listed, import-only or retained Upcoming publication.');
  }else if(f==='property'&&bound&&propertyPath){
    const a=validatePropertyDraft(l.category_attributes,c?.financial,null,propertyPath);
    if(a.data){answers=a.data.answers;financial=a.data.financial;}
    add('draft.answers','rental answers/financial','draft','approved',a.error||v.observations.privateDraft==='fail'?'fail':'pass',v.reader==='staff'?'Existing rental validator assesses projected rental answers/financials. Private society validity is not verified by this staff read.':'Existing rental validator: valid supplied details, positive Known rent/basis, separate deposit and maintenance. Society validity is checked privately on the server.');
    add('property.item_null','generic item fields','draft','approved',l.condition===null&&l.price_type===null&&l.price_paise===null?'pass':'fail','Property condition, price type and item price must remain NULL.');
    add('property.minimum','monthly rent/basis','approved_completeness','approved',financial?.rent.state==='known'?'pass':'fail','Approved Test minimum: Known positive monthly INR rent and compatible explicit basis. No rent-on-request submission in this slice. Deposit and maintenance remain separate optional declarations.');
  }else if((f==='goods'||f==='legacy')&&supported){
    answers=l.category_attributes;
    for(const a of ref!.attributes.filter(a=>a.is_required))add(`goods.required.${a.name}`,a.label,'approved_completeness','approved',answers[a.name]!==null&&answers[a.name]!==undefined&&String(answers[a.name]).trim()!==''?'pass':'fail',`${a.label} is required by the saved category definition.`);
  }else add('answers.unavailable','family answers','draft','approved','not_verified','Saved family definitions could not be verified.');
  if(!['goods','legacy'].includes(f)){add('policy.submission','Test submission policy','approved_completeness','approved','pass','Test submission V1 minimum is approved. Submission is not classification/evidence certification or approval permission.');add('policy.approval','approval/evidence policy','review','policy_pending','not_verified','Approval and publication remain blocked for these Test families.');add('policy.amounts','public amount limits','review','policy_pending','not_verified','Public amount rules remain undecided. Current draft/technical limits are not new business price policy.');}
  const consistent=!!v.endIdentity&&['id','category_id','status','revision','updated_at'].every(k=>v.endIdentity![k as keyof typeof v.endIdentity]===l[k as keyof typeof v.endIdentity]);
  const snapshot=v.reader==='staff'&&v.consistency==='statement_snapshot'&&consistent;
  add('snapshot.freshness','status/revision','freshness','approved',snapshot?'pass':consistent?'not_verified':'fail',snapshot?'Consistent calling-statement database snapshot, including authorization helpers. This does not establish approval freshness; context/media revision coverage remains unfinished.':consistent?'Multiple reads: no atomic snapshot guarantee; context/media changes may not advance revision.':'Saved identity changed or could not be re-read. Refresh before interpreting this assessment.');
  if(!v.answerProjectionComplete){
    for(const check of checks)if(['draft.answers','vehicle.minimum','cars.minimum','property.minimum','model.declaration'].includes(check.id)||check.id.startsWith('goods.required.')){check.outcome='not_verified';check.message='Saved answer projection is incomplete or malformed; validity/completeness is not verified.';}
    add('answers.projection','saved answers','draft','approved','not_verified','Some supplied answers could not be safely projected. Missing projected data is not proof of an unanswered or valid saved declaration.');
  }
  add('runtime.transition','transition availability','runtime','approved','not_applicable',['goods','legacy'].includes(f)?'Read-only assessment; existing Goods submission behavior is unchanged.':v.testSubmissionAvailable&&l.status==='draft'?'Test submission is enabled for this saved draft. The database revalidates actual saved data; approval/publication remain disabled.':l.status==='pending_review'?'Awaiting review: seller read-only. Approval and publication remain disabled.':'Test submission is currently disabled or unavailable. Approval/publication remain disabled.');
  const fields=ref?.fields??[];
  const sellerAnswers=Object.entries(answers).filter(([k])=>reviewableField(k)&&(f==='goods'||f==='legacy'?ref?.attributes.some(a=>a.name===k)&&scalarAnswer(answers[k]):fields.includes(k)||k==='powertrain'||k==='area_basis')).map(([field,value])=>({field,label:ref?.attributes.find(a=>a.name===field)?.label??field.replaceAll('_',' '),value:display(value)}));
  const facts=v.model?Object.entries(v.model.raw).filter(([k])=>!['brand','model'].includes(k)).map(([field,value])=>({field,value})):[];
  const packet=reviewPacketSchema.safeParse({identity:{id:l.id,category_id:l.category_id,status:l.status,revision:l.revision,updated_at:l.updated_at},family:f,category:ref?.path??[],provenance:p,advertisement:{title:l.title,description:l.description},reader:v.reader,capturedAt:v.capturedAt,consistency:!consistent?'mismatch':snapshot?'statement_snapshot':'multiple_reads',sellerAnswers,
    catalogue:path?{mode:c?.mode??'unanswered',brand:v.model?.brand??(c?.mode==='not_listed'?c.brand_text:null)??null,model:v.model?.model??(c?.mode==='not_listed'?c.model_text:null)??null,modelId:c?.model_id??null,snapshotId:ref?.snapshotId??null,facts}:null,
    pricing:f==='property'?financial?{kind:'rental',financial}:{kind:'unavailable'}:Number.isSafeInteger(l.price_paise)&&l.price_paise!>=0||l.price_paise===null?{kind:'item',type:l.price_type,amountPaise:l.price_paise}:{kind:'unavailable'},
    photos:{count:matchedMedia?v.media!.length:null,ready,coverId:l.cover_photo_id,items:v.reader==='staff'&&matchedMedia?v.media!.map(m=>({id:m.id,processing_status:m.processing_status,display_order:m.display_order})):[]},checks,transition:'assessment_only'});
  return packet.success?{checks,packet:packet.data}:{packet:null,checks:[...checks,{id:'packet.invalid',family:f,field:'packet',ruleStatus:'approved',stage:'draft',outcome:'not_verified',message:'Saved review data could not be validated. Refresh; no review packet is available.',provenance:p}]};
}
