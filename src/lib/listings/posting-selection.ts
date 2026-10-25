/** Shared controller for manual selection and a future confirmed assistant pick.
 * The caller supplies DB definitions, never an AI-authored category definition.
 * Common fields and photos are retained; only incompatible details need consent.
 */
export type PostingChoice={category:string;subcategory:string;version:number};
export type PostingDefinition=PostingChoice&{listingCategoryId:string;detailsContract:string;enabled:boolean};
export type PostingSelectionState<Common,Photo>={choice:PostingChoice|null;detailsContract:string|null;common:Common;photos:Photo[];details:Record<string,unknown>};
export function changePostingSelection<Common,Photo>(state:PostingSelectionState<Common,Photo>,choice:PostingChoice,definitions:readonly PostingDefinition[],confirmed=false) {
 const definition=definitions.find(d=>d.category===choice.category&&d.subcategory===choice.subcategory&&d.version===choice.version&&d.enabled);
 if(!definition)throw new Error("Category selection is unavailable.");
 const incompatible=state.detailsContract!==null&&state.detailsContract!==definition.detailsContract;
 if(incompatible&&Object.keys(state.details).length&&!confirmed)return {status:"confirmation-required" as const,state};
 return {status:"selected" as const,state:{...state,choice:{category:definition.category,subcategory:definition.subcategory,version:definition.version},detailsContract:definition.detailsContract,details:incompatible?{}:state.details},listingCategoryId:definition.listingCategoryId};
}
