import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import NewListingPage from "@/app/account/listings/new/page";
import { parseTaxonomy } from "@/lib/listings/taxonomy-v2";
import cars from "@/lib/listings/cars/v1.json";
import twoWheelers from "@/lib/listings/two-wheeler/v1.json";
import property from "@/lib/listings/property/v1.json";
import fixture from "./taxonomy-v2-fixture.json";
const m=vi.hoisted(()=>({live:false,enabled:true,vehicles:vi.fn(),property:vi.fn(),taxonomy:vi.fn(),locations:vi.fn(),references:vi.fn(),entry:vi.fn(),ordinary:vi.fn(),goods:vi.fn(),phone:vi.fn(),form:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:"owner"}}})}})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw Error(`REDIRECT:${url}`);}}));
vi.mock("@/lib/listings/taxonomy-v2-server",()=>({loadTaxonomy:m.taxonomy}));
vi.mock("@/lib/listings/ordinary-goods/server",()=>({loadGoodsBindings:async()=>({}),loadGoodsDefinition:m.goods}));
vi.mock("@/lib/listings/post-ad-server",()=>({isGoodsPostAdEnabled:()=>m.enabled,loadGoodsReferences:m.references}));
vi.mock("@/lib/listings/post-ad-locations",()=>({loadPostAdLocations:m.locations}));
vi.mock("@/lib/listings/test-runtime",()=>({isVerifiedProductionFamilyLaunchEnvironment:()=>m.live,isVerifiedSubmissionTestEnvironment:()=>false}));
vi.mock("@/lib/listings/two-wheeler/server",()=>({isCarsEnabled:()=>m.live,isTwoWheelerEnabled:()=>m.live,loadVehicleReferences:m.vehicles}));
vi.mock("@/lib/listings/property/server",()=>({isPropertyEnabled:()=>m.live,loadPropertyReferences:m.property}));
vi.mock("@/lib/listings/mobiles/server",()=>({loadMobileCatalogue:m.phone}));
vi.mock("@/lib/listings/tablets/server",()=>({loadTabletCatalogue:async()=>null}));
vi.mock("@/lib/listings/wearables/server",()=>({loadWearableCatalogue:async()=>null}));
vi.mock("@/lib/listings/accessories/server",()=>({loadAccessoryCatalogue:async()=>null}));
vi.mock("@/components/listings/GoodsPostAdEntry",()=>({default:(props:unknown)=>{m.entry(props);return <div>Existing Goods entry</div>;}}));
vi.mock("@/components/listings/posting/OrdinaryGoodsForm",()=>({default:(props:unknown)=>{m.ordinary(props);return <div>Existing Goods wizard</div>;}}));
vi.mock("@/components/listings/ListingForm",()=>({default:(props:unknown)=>{m.form(props);return <div>Raw form</div>;}}));
vi.mock("@/components/listings/MobilePhoneForm",()=>({default:()=> <div>Phone wizard</div>}));
const familySlugs=["v2-cars","v2-motorcycles-scooters","v2-houses-apartments","v2-pg-hostels-guest-houses","v2-flatmates-shared-rooms"];
const refs=(definition:typeof cars|typeof twoWheelers|typeof property)=>definition.paths.map((p,i)=>({
 id:`10000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,name:p.path[2],is_active:true,new_listing_enabled:true,
 version_id:"20000000-0000-4000-8000-000000000001",path:p.path,fields:p.fields,display_order:i,
 ...(definition===cars?{family:"cars" as const}:{}),...("basis" in p?{basis:p.basis}:{}),
}));
beforeEach(()=>{
 vi.clearAllMocks();m.live=true;m.enabled=true;m.phone.mockResolvedValue(null);
 const value=structuredClone(fixture);
 for(const n of value.nodes)if(familySlugs.includes(n.slug)){n.status="live";n.posting_enabled=true;}
 m.taxonomy.mockResolvedValue(parseTaxonomy(value));
 m.vehicles.mockImplementation(async(_client,_saved,family)=>({categories:refs(family==="cars"?cars:twoWheelers),states:[]}));
 m.property.mockResolvedValue({categories:refs(property)});
 m.locations.mockResolvedValue({status:"ready",cities:[{id:"30000000-0000-4000-8000-000000000001",name:"Fixture city"}]});
 m.references.mockResolvedValue({status:"ready",categories:[],attributes:[],cities:[]});
});
afterEach(cleanup);
it("preserves main's existing GoodsPostAdEntry architecture on the chooser",async()=>{
 render(await NewListingPage({searchParams:Promise.resolve({})}));
 expect(screen.getByText("Existing Goods entry")).toBeVisible();expect(m.entry).toHaveBeenCalledOnce();
 expect(m.form).not.toHaveBeenCalled();expect(m.ordinary).not.toHaveBeenCalled();expect(m.references).toHaveBeenCalledOnce();
});
it.each([
 ["v2-cars","vehicles",9],["v2-motorcycles-scooters","vehicles",9],
 ["v2-houses-apartments","property",5],["v2-pg-hostels-guest-houses","property",4],["v2-flatmates-shared-rooms","property",1],
])("%s uses GoodsPostAdEntry with %i eligible specialist contracts",async(category,family,count)=>{
 render(await NewListingPage({searchParams:Promise.resolve({category})}));
 expect(screen.getByText("Existing Goods entry")).toBeVisible();
 const props=m.entry.mock.calls[0][0];expect(props.canonicalCategory).toBe(category);expect(props[family].categories).toHaveLength(count);
 expect(props[family].categories.every((c:{id:string})=>c.id.startsWith("10000000-"))).toBe(true);
 expect(m.form).not.toHaveBeenCalled();expect(m.ordinary).not.toHaveBeenCalled();expect(m.goods).not.toHaveBeenCalled();
});
it.each(["runtime","integration","catalogue","contracts","fields","locations"])("fails closed when family %s readiness is lost",async failure=>{
 if(failure==="runtime")m.live=false;
 if(failure==="integration")m.enabled=false;
 if(failure==="catalogue")m.taxonomy.mockResolvedValue(parseTaxonomy(fixture));
 if(failure==="contracts")m.vehicles.mockResolvedValue({categories:[],states:[],error:"unavailable"});
 if(failure==="fields")m.vehicles.mockResolvedValue({categories:refs(cars).map(c=>({...c,fields:["unrecognized"]})),states:[]});
 if(failure==="locations")m.locations.mockResolvedValue({status:"error",message:"unavailable"});
 render(await NewListingPage({searchParams:Promise.resolve({category:"v2-cars"})}));
 expect(m.entry).not.toHaveBeenCalled();expect(m.form).not.toHaveBeenCalled();expect(m.ordinary).not.toHaveBeenCalled();
});
it("does not let a failed car family block healthy motorcycles",async()=>{
 m.vehicles.mockImplementation(async(_client,_saved,family)=>family==="cars"?{categories:[],states:[],error:"unavailable"}:{categories:refs(twoWheelers),states:[]});
 render(await NewListingPage({searchParams:Promise.resolve({category:"v2-motorcycles-scooters"})}));
 expect(m.entry.mock.calls[0][0].vehicles.categories).toHaveLength(9);
});
it.each(["v2-shops-offices","v2-land-plots","v2-warehouses-godowns","v2-bicycles","v2-other-items"])("does not route unsupported %s to another form",async category=>{
 render(await NewListingPage({searchParams:Promise.resolve({category})}));
 expect(screen.getByRole("heading",{name:/isn’t available/})).toBeVisible();expect(m.entry).not.toHaveBeenCalled();expect(m.goods).not.toHaveBeenCalled();
});
it("preserves main's existing mobile posting URL",async()=>{
 m.phone.mockResolvedValue({listing_category_id:"40000000-0000-4000-8000-000000000001"});
 render(await NewListingPage({searchParams:Promise.resolve({posting:"mobile-phones"})}));
 expect(screen.getByText("Phone wizard")).toBeVisible();expect(m.entry).not.toHaveBeenCalled();
});
