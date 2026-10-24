import {reviewPacketSchema, type ReviewPacket} from '@/lib/listings/submission-readiness';
import {propertyRentSummary,paiseToPropertyRupees} from '@/lib/listings/property/contract';
import SubmissionReadinessPanel from './SubmissionReadinessPanel';

/** Presentation only. This component does not establish reviewer authorization. */
export default function TypedReviewPacket({packet}:{packet:ReviewPacket}){
  const validated=reviewPacketSchema.safeParse(packet);
  if(!validated.success)return <p role="alert">Review packet unavailable: invalid or unexpected data. No review decision is available.</p>;
  const p=validated.data;
  return <section aria-label="Typed review packet" className="space-y-4">
    <h2>{p.reader==='staff'?'Read-only review packet — no approval controls':'Saved ad details — read-only assessment'}</h2>
    <p>{p.identity.id} · {p.identity.status} · revision {p.identity.revision} · captured {p.capturedAt}</p>
    <p>{p.category.join(' › ')} · contract {p.provenance.contract} · version {p.provenance.versionId??'existing definitions'}</p>
    <p>{p.consistency==='statement_snapshot'?'Consistent calling-statement database snapshot.':p.consistency==='mismatch'?'Snapshot mismatch: refresh required.':'Multiple authorized reads; not atomically verified or approval-ready.'} Context/media revision coverage remains incomplete. Assessment only; not approval-ready.</p>
    <div><h3>Saved advertisement</h3><p className="whitespace-pre-wrap">{p.advertisement.title}</p>{p.advertisement.description===null?<p>Description not supplied.</p>:p.advertisement.description===''?<p>Description is empty.</p>:<p className="whitespace-pre-wrap">{p.advertisement.description}</p>}</div>
    {p.catalogue&&<div><h3>Catalogue context — separate from seller answers</h3><p>{p.catalogue.mode} · {p.catalogue.brand??'Brand unavailable'} / {p.catalogue.model??'Model unavailable'} · model ID {p.catalogue.modelId??'Not listed'} · snapshot {p.catalogue.snapshotId??'Unavailable'}</p><dl>{p.catalogue.facts.map(f=><div key={f.field}><dt>{f.field}</dt><dd>{f.value}</dd></div>)}</dl></div>}
    <div><h3>Seller answers</h3><dl>{p.sellerAnswers.map(a=><div key={a.field}><dt>{a.label}</dt><dd>{a.value}</dd></div>)}</dl>{!p.sellerAnswers.length&&<p>No validated applicable seller answers available.</p>}</div>
    <div><h3>{p.pricing.kind==='rental'?'Rental financial declarations':'Item amount'}</h3>{p.pricing.kind==='rental'?<><p>{propertyRentSummary(p.pricing.financial)}</p><p>Basis: {p.pricing.financial.basis??'Unanswered'} · period: month</p><p>One-time deposit: {p.pricing.financial.deposit?.state==='known'?`INR ${paiseToPropertyRupees(p.pricing.financial.deposit.amount_paise)}`:p.pricing.financial.deposit?.state??'Unanswered'}</p><p>Maintenance: {p.pricing.financial.maintenance?.state==='separate'?`INR ${paiseToPropertyRupees(p.pricing.financial.maintenance.amount_paise)} / month / ${p.pricing.financial.maintenance.basis}`:p.pricing.financial.maintenance?.state??'Unanswered'}</p></>:p.pricing.kind==='item'?<p>{p.pricing.type==='free'?'Free':p.pricing.amountPaise===null?'Amount not set':`INR ${paiseToPropertyRupees(p.pricing.amountPaise)}`} · {p.pricing.type??'Price type not set'}</p>:<p>Financial values could not be validated.</p>}</div>
    <p>Photos: {p.photos.count??'Not verified'} · ready: {p.photos.ready??'Not verified'} · cover: {p.photos.coverId??'Not selected'}</p>
    {p.reader==='staff'&&<ul aria-label="Authorized photo metadata">{p.photos.items.map(photo=><li key={photo.id}>{photo.id} · {photo.processing_status} · order {photo.display_order}{photo.id===p.photos.coverId?' · cover':''}</li>)}</ul>}
    <SubmissionReadinessPanel result={{checks:p.checks,packet:p}}/>
  </section>;
}
