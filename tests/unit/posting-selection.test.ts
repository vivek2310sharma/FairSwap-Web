import { describe,it,expect } from "vitest";
import { changePostingSelection } from "@/lib/listings/posting-selection";
const phone={category:"mobiles",subcategory:"mobile-phones",version:2};
const tablet={category:"mobiles",subcategory:"tablets",version:2};
const definitions=[{...phone,listingCategoryId:"phone-db-id",detailsContract:"phone-v2",enabled:true},{...tablet,listingCategoryId:"tablet-db-id",detailsContract:"tablet-v2",enabled:true}];
const state={choice:phone,detailsContract:"phone-v2",common:{title:"My device",description:"Keep text"},photos:[{id:"photo-id"}],details:{model:"selected"}};
describe("Shared posting selection controller",()=>{
 it("retains compatible fields and photos for repeated/manual/programmatic choices",()=>{const result=changePostingSelection(state,phone,definitions);expect(result.status).toBe("selected");expect(result.state.common).toBe(state.common);expect(result.state.photos).toBe(state.photos);expect(result.state.details).toBe(state.details);});
 it("requires explicit confirmation before clearing incompatible details",()=>{expect(changePostingSelection(state,tablet,definitions)).toEqual({status:"confirmation-required",state});const result=changePostingSelection(state,tablet,definitions,true);expect(result.state.details).toEqual({});expect(result.state.photos).toBe(state.photos);expect(result.state.common).toBe(state.common);});
 it("rejects missing, disabled and stale definitions",()=>{expect(()=>changePostingSelection(state,{...phone,version:1},definitions)).toThrow();expect(()=>changePostingSelection(state,tablet,definitions.map(d=>({...d,enabled:false})))).toThrow();});
});
