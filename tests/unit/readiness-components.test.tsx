import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import type {Listing} from '@/types/listing';
import {evaluateReadiness} from '@/lib/listings/submission-readiness';
import TypedReviewPacket from '@/components/listings/TypedReviewPacket';
import SubmissionReadinessPanel from '@/components/listings/SubmissionReadinessPanel';
import ListingForm from '@/components/listings/ListingForm';
import {fixture,cid} from './readiness-fixtures';
const m=vi.hoisted(()=>({create:vi.fn(),save:vi.fn(),submit:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/app/account/listings/actions',()=>({createDraftListingAction:m.create,updateListingAction:m.save,submitListingAction:m.submit}));
vi.mock('@/components/listings/MediaUploader',()=>({default:()=> <p>Saved media only</p>}));
vi.mock('@/components/listings/PincodeLocationPicker',()=>({default:()=> <p>Existing location</p>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('shows approved, candidate, policy and unavailable groups without ready claims',()=>{render(<SubmissionReadinessPanel result={evaluateReadiness(fixture('cars'))}/>);expect(screen.getByText(/Approved completeness checks/)).toBeInTheDocument();expect(screen.getAllByText(/Policy pending/).length).toBeGreaterThan(0);expect(screen.getByText(/Submission requires at least one ready photo/)).toBeInTheDocument();expect(screen.queryByText('Ready to submit')).toBeNull();expect(screen.queryByRole('button')).toBeNull();});
it('does not treat an empty checklist as success',()=>{render(<SubmissionReadinessPanel result={{packet:null,checks:[]}}/>);expect(screen.getByRole('alert')).toHaveTextContent('No checks were available');});
it('actual saved form marks persisted results outdated without changing state or calling actions',()=>{
 const v=fixture('goods'),r=evaluateReadiness(v);const listing={...v.listing,slug:'synthetic',seller_id:'owner',pin_code:'302021',landmark:null,renewal_count:0,rejection_reason:null,removal_reason:null,removed_by:null,created_at:v.capturedAt,submitted_at:null,published_at:null,expires_at:null,sold_at:null} as Listing;
 render(<ListingForm categories={[{id:cid,name:'Electronics',is_active:true}]} allAttributes={[]} cities={[]} initialListing={listing} postAdEntry="goods" readiness={r}/>);
 expect(screen.getByText(/Based on the last saved draft/)).toBeInTheDocument();fireEvent.change(screen.getByLabelText(/Description/),{target:{value:'Unsaved changed description'}});expect(screen.getByRole('status')).toHaveTextContent('Outdated');expect(screen.getByLabelText(/Description/)).toHaveValue('Unsaved changed description');for(const fn of Object.values(m))expect(fn).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Submit for Review'})).toBeInTheDocument();
});
it('typed packet renders separate rent/deposit/maintenance with no action controls',()=>{const v=fixture('property');v.context!.financial={currency:'INR',period:'month',basis:'dwelling',rent:{state:'known',amount_paise:123450},deposit:{state:'known',amount_paise:0},maintenance:{state:'separate',amount_paise:123,basis:'dwelling',period:'month'}};render(<TypedReviewPacket packet={evaluateReadiness(v).packet!}/>);expect(screen.getByText('INR 1234.50 / month')).toBeInTheDocument();expect(screen.getByText('One-time deposit: INR 0.00')).toBeInTheDocument();expect(screen.getByText(/Maintenance: INR 1.23/)).toBeInTheDocument();expect(screen.queryByRole('button')).toBeNull();expect(screen.getByText(/not atomically verified or approval-ready/)).toBeInTheDocument();});
it('unexpected private DTO fields fail controlled component validation',()=>{const p={...evaluateReadiness(fixture()).packet!,society_name:'PRIVATE_SOCIETY'};render(<TypedReviewPacket packet={p}/>);expect(screen.getByRole('alert')).toHaveTextContent('unexpected data');expect(screen.queryByText('PRIVATE_SOCIETY')).toBeNull();});
it.each([true,false,undefined])('draft availability copy follows the saved projection: %s',available=>{
 const v=fixture('cars');v.testSubmissionAvailable=available;
 render(<SubmissionReadinessPanel result={evaluateReadiness(v)}/>);
 expect(screen.getByText(available?/Test submission is enabled for this saved draft/:/Test submission is currently disabled or unavailable/)).toBeInTheDocument();
 expect(screen.getByText(/Public amount rules remain undecided/)).toBeInTheDocument();
 expect(screen.getByText(/Approval and publication remain blocked/)).toBeInTheDocument();
});
it.each(['two-wheelers','cars','property'] as const)('pending %s assessment has no locked-field editing instructions',family=>{
 const v=fixture(family);v.listing.status='pending_review';v.listing.category_attributes={year:{state:'known'}};
 render(<TypedReviewPacket packet={evaluateReadiness(v).packet!}/>);
 expect(screen.getByRole('heading',{name:'Saved ad assessment'})).toBeInTheDocument();
 expect(screen.getByText(/Saved details and photos are read-only; the ad is not publicly visible/)).toBeInTheDocument();
 expect(screen.queryByText(/Correct invalid|Complete description|Draft saving remains permissive/)).toBeNull();
 expect(screen.getByText(/not atomically verified or approval-ready/)).toBeInTheDocument();
 expect(screen.getByText(/Approval and publication remain blocked/)).toBeInTheDocument();
});
it('staff snapshot retains future approval warnings without seller editing instructions',()=>{
 const v=fixture('cars');v.reader='staff';v.consistency='statement_snapshot';v.listing.category_attributes={year:{state:'known'}};
 render(<TypedReviewPacket packet={evaluateReadiness(v).packet!}/>);
 expect(screen.getByRole('heading',{name:'Read-only review packet — no approval controls'})).toBeInTheDocument();
 expect(screen.getByText(/This does not establish approval freshness/)).toBeInTheDocument();
 expect(screen.getByText(/context\/media revision coverage remains unfinished/)).toBeInTheDocument();
 expect(screen.queryByText(/Correct invalid|Complete description|Draft saving remains permissive/)).toBeNull();
 expect(screen.queryByRole('button')).toBeNull();
});
it('Goods does not receive the new-family publication restriction',()=>{
 render(<SubmissionReadinessPanel result={evaluateReadiness(fixture('goods'))}/>);
 expect(screen.getByText(/existing Goods submission behavior is unchanged/)).toBeInTheDocument();
 expect(screen.queryByText(/Approval and publication remain blocked|seller read-only|ad is not publicly visible/)).toBeNull();
});
