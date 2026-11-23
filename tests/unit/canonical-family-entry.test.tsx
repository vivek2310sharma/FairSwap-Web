import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import GoodsPostAdEntry from '@/components/listings/GoodsPostAdEntry';
import {parseTaxonomy} from '@/lib/listings/taxonomy-v2';
import cars from '@/lib/listings/cars/v1.json';
import twoWheelers from '@/lib/listings/two-wheeler/v1.json';
import property from '@/lib/listings/property/v1.json';
import fixture from './taxonomy-v2-fixture.json';
const m=vi.hoisted(()=>({form:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()}),useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/components/listings/ListingForm',()=>({default:(p:{categories:{id:string;name:string}[]})=>{m.form(p);return <select aria-label="Specialist type">{p.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>;}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const reference=(definition:typeof cars|typeof twoWheelers|typeof property,prefix:string)=>definition.paths.map((p,i)=>({id:prefix+i,name:p.path[2],is_active:true,new_listing_enabled:true,version_id:'20000000-0000-4000-8000-000000000001',path:p.path,fields:p.fields,display_order:i,...(definition===cars?{family:'cars' as const}:{}),...('basis'in p?{basis:p.basis}:{} )}));
const props=()=>{
 const data=structuredClone(fixture);
 for(const node of data.nodes)if(['v2-cars','v2-motorcycles-scooters','v2-houses-apartments','v2-pg-hostels-guest-houses','v2-flatmates-shared-rooms'].includes(node.slug)){node.status='live';node.posting_enabled=true;}
 const city={id:'30000000-0000-4000-8000-000000000001',name:'Synthetic city',slug:'synthetic-city',state:'Synthetic state',is_active:true,created_at:'2026-01-01T00:00:00Z'};
 return {catalogue:parseTaxonomy(data),references:{status:'ready' as const,categories:[],attributes:[],cities:[city]},
  vehicles:{categories:[...reference(cars,'car-'),...reference(twoWheelers,'tw-')],states:[]},
  property:{categories:reference(property,'rent-').map((c,i)=>({...c,basis:property.paths[i].basis}))},locations:{status:'ready' as const,cities:[city]},
  submission:{cars:true,twoWheelers:true,property:true},isMaintenanceActive:false};
};
it.each([
 ['v2-cars','vehicle',9,'car-'],['v2-motorcycles-scooters','vehicle',9,'tw-'],
 ['v2-houses-apartments','property',5,'rent-'],['v2-pg-hostels-guest-houses','property',4,'rent-'],['v2-flatmates-shared-rooms','property',1,'rent-'],
])('%s constrains the existing entry form to %s specialist contracts', (slug,entry,count,prefix)=>{
 render(<GoodsPostAdEntry {...props()} canonicalCategory={slug}/>);
 expect(screen.getByRole('combobox',{name:'Specialist type'}).children).toHaveLength(count);
 const form=m.form.mock.calls.at(-1)![0];expect(form.postAdEntry).toBe(entry);
 expect(form.categories.every((c:{id:string})=>c.id.startsWith(prefix))).toBe(true);
 expect(form.submissionEnabled).toBe(true);
 expect((entry==='vehicle'?form.vehicle:form.property).references.categories).toHaveLength(count);
});
it.each(['family','catalogue','references'])('does not render a canonical form when %s is unavailable',failure=>{
 const p=props();if(failure==='family')p.submission.cars=false;
 if(failure==='catalogue')p.catalogue=parseTaxonomy(fixture);
 if(failure==='references')p.vehicles.categories=[];
 render(<GoodsPostAdEntry {...p} canonicalCategory="v2-cars"/>);
 expect(screen.getByRole('status')).toHaveTextContent('isn’t available');expect(m.form).not.toHaveBeenCalled();
});
