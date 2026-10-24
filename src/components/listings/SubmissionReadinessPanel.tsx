import type {ReadinessResult} from '@/lib/listings/submission-readiness';

const labels={draft:'Saved draft validity',approved_completeness:'Approved completeness checks',candidate:'Candidate policy — recommended, not approved',review:'Review checks and pending policy',freshness:'Record freshness',runtime:'Transition availability'};
const outcomes={pass:'Pass',fail:'Needs attention',not_verified:'Not verified',not_applicable:'Not applicable'};
export default function SubmissionReadinessPanel({result,outdated=false}:{result:ReadinessResult;outdated?:boolean}){
  const staff=result.packet?.reader==='staff';
  const pending=result.packet?.identity.status==='pending_review'&&['two-wheelers','cars','property'].includes(result.packet.family);
  const readOnly=staff||pending;
  const heading=staff?'Saved record review assessment':pending?'Saved ad assessment':'Saved draft readiness';
  const message=(id:string,text:string)=>{
    if(!readOnly)return text;
    if(id==='draft.common'&&text==='Correct invalid common draft values.')return 'Common saved values do not satisfy the draft validator.';
    if(id==='common.details'&&text.startsWith('Complete description'))return 'Saved description, city, condition or non-free item amount is incomplete. PIN integrity is assessed separately.';
    if(id==='draft.answers'&&text==='Correct invalid or incomplete Known vehicle answers.')return 'Saved Known vehicle answers are invalid or incomplete.';
    return text.replace(' Draft saving remains permissive.','');
  };
  return <section aria-label={heading} className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
    <h2 className="text-lg font-semibold">{heading}</h2>
    <p>{staff?'Based on the saved eligible review record.':pending?'Based on the saved ad awaiting review.':'Based on the last saved draft.'} This assessment does not save, submit or approve an ad.</p>
    {outdated&&<p role="status" className="font-semibold">Outdated — the editor was used after capture. The checks below still describe the last saved draft; refresh to reassess.</p>}
    {result.packet&&<p className="text-sm">Captured {result.packet.capturedAt} · {result.packet.identity.status} · revision {result.packet.identity.revision} · saved contract {result.packet.provenance.contract} / {result.packet.provenance.versionId??'existing category definitions'}</p>}
    <p className="text-sm">{staff?'Reviewer access is separate from seller readiness.':pending?'Awaiting review. Saved details and photos are read-only; the ad is not publicly visible.':'Draft saving remains permissive; submission checks use saved details.'} Approved Test submission requirements are separate from pending public pricing, evidence and approval policy. This assessment never grants transition permission.</p>
    {Object.entries(labels).map(([stage,label])=>{const checks=result.checks.filter(c=>c.stage===stage);return checks.length?<div key={stage}><h3 className="font-semibold">{readOnly&&stage==='draft'?'Saved record validity':label}</h3><ul className="space-y-2">{checks.map(c=><li key={c.id} className="text-sm"><strong>{outcomes[c.outcome]}</strong> · {c.ruleStatus==='policy_pending'?'Policy pending':c.ruleStatus==='recommended'?'Recommended':'Approved'} · {message(c.id,c.message)}</li>)}</ul></div>:null;})}
    {!result.checks.length&&<p role="alert">No checks were available. Readiness has not been verified.</p>}
  </section>;
}
