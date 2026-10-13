import type { PostAdCategory } from "../../src/components/listings/PostAdFlow";
import type { CategoryAttribute } from "../../src/types/listing";
// Synthetic navigation examples only; not approved taxonomy or production availability.
export const categories: PostAdCategory[] = [
...['Electronics','Furniture','Home Appliances','Books and Hobbies'].map((name,i) => ({id:'goods-'+i, name, macro:'goods' as const})),
...['Motorcycles','Scooters','Cars','Bicycles'].map((name,i) => ({id:'vehicles-'+i, name, macro:'vehicles' as const})),
...['Residential Property','PGs & Rooms','Commercial Property'].map((name,i) => ({id:'property-'+i, name, macro:'property' as const}))];
export const attributes: CategoryAttribute[] = categories.map(c => ({id:c.id+'-sample', category_id:c.id, name:'sample_'+c.id, label:c.macro === 'goods' ? 'Material / specification (sample)' : c.macro === 'vehicles' ? 'Year (sample)' : 'Area in sq ft (sample)', value_type:c.macro === 'goods' ? 'text' : 'number', is_required:false, is_filterable:false, options:null, validation_rules:null, sort_order:0, created_at:''}));
