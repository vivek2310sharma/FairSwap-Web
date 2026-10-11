import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import PendingOwnerListing from '@/components/listings/PendingOwnerListing';
import {evaluateReadiness} from '@/lib/listings/submission-readiness';
import type {Listing,ListingMedia} from '@/types/listing';
import {fixture,lid,photoId} from './readiness-fixtures';
afterEach(cleanup);
it('pending owner presentation keeps saved finances/private details/photo reads without mutation controls',()=>{
 const f=fixture('property');f.listing.status='pending_review';
 const l={...f.listing,slug:'synthetic',seller_id:'owner',pin_code:'302021',landmark:'Private synthetic landmark',submitted_at:f.capturedAt} as Listing;
 render(<PendingOwnerListing listing={l} readiness={evaluateReadiness(f)} society="Private synthetic society" media={[{id:photoId,listing_id:lid,processing_status:'ready'},{id:lid,listing_id:lid,processing_status:'failed'}] as ListingMedia[]}/>);
 expect(screen.getByRole('heading',{name:'Awaiting review'})).toBeVisible();expect(screen.getByText('Society: Private synthetic society')).toBeVisible();expect(screen.getByText(/Landmark: Private synthetic landmark/)).toBeVisible();expect(screen.getByRole('img')).toHaveAttribute('src',`/api/listings/${lid}/media/${photoId}/thumb`);expect(screen.getByText(/Processing failed/)).toBeVisible();expect(screen.queryByRole('button')).toBeNull();expect(screen.queryByLabelText(/upload/i)).toBeNull();expect(screen.getByText('INR 1234.50 / month')).toBeVisible();
});
