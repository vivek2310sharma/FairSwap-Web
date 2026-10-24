import Link from 'next/link';
import type {Listing,ListingMedia} from '@/types/listing';
import type {ReadinessResult} from '@/lib/listings/submission-readiness';
import TypedReviewPacket from './TypedReviewPacket';

/** Request-scoped owner page only; contains owner-private location details. */
export default function PendingOwnerListing({listing,media,readiness,society}:{listing:Listing;media:ListingMedia[];readiness:ReadinessResult|null;society?:string|null}){
 return <div className="mx-auto max-w-4xl px-4 py-10 space-y-5">
  <Link href="/account/listings">My ads</Link>
  <h1 className="text-2xl font-bold">Awaiting review</h1>
  <p>Your saved ad is read-only and remains private. Approval and publication are disabled for this Test submission.</p>
  <p>{listing.id} · submitted {listing.submitted_at} · revision {listing.revision}</p>
  {readiness?.packet?<TypedReviewPacket packet={readiness.packet}/>:<><h2>{listing.title}</h2><p>{listing.description}</p><p role="alert">Saved assessment is unavailable. Reload to verify the details.</p></>}
  <section aria-label="Owner-private location"><h2>Private location — visible to you</h2><p>PIN: {listing.pin_code??'Unanswered'}</p><p>Landmark: {listing.landmark??'Unanswered'}</p>{society!==undefined&&<p>Society: {society??'Unanswered'}</p>}</section>
  <section aria-label="Saved photos"><h2>Saved photos</h2><ul>{media.map(m=><li key={m.id}><p>{m.processing_status}{m.id===listing.cover_photo_id?' · cover':''}</p>{m.processing_status==='ready'&&
   // eslint-disable-next-line @next/next/no-img-element
   <img src={`/api/listings/${listing.id}/media/${m.id}/thumb`} alt="Saved ad photo" width={200} height={200}/>} {m.processing_status==='failed'&&<p>Processing failed. This remains recorded for review.</p>}</li>)}</ul></section>
 </div>;
}
