import { describe, expect, it } from 'vitest';
import { sourceCategories, groupsFor, catalogueScope } from '../../src/lib/listings/csv-fields/contract';
import { evaluateField, confirmBrandChange, proposalFor, answered } from '../../src/lib/listings/csv-fields/rules';
import { lookupCatalogue, catalogueRowSchema } from '../../src/lib/listings/csv-fields/catalogue';
import { z } from 'zod';
import { twoWheelerProposal, proposalForPath, assessCompatibility, proposalIssues } from '../../src/lib/listings/csv-fields/two-wheeler-proposal';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import catalogue from '../../src/lib/listings/csv-fields/generated/catalogues.v1.json';
import { GET } from '../../tools/post-ad-preview/app/api/catalogue/route';

const path = (group: string, leaf?: string) => sourceCategories.find(c => c.path[1] === group && (!leaf || c.path[2] === leaf))!;
const parsedRows=z.array(catalogueRowSchema).parse(catalogue.rows);
describe('source-backed contract', () => {
  it('preserves the full snapshot and exact ordered memberships for every path', () => {
    expect(sourceCategories).toHaveLength(202);
    expect(sourceCategories.filter(c => c.path[0] === 'Goods')).toHaveLength(129);
    expect(sourceCategories.filter(c => c.path[0] === 'Vehicles')).toHaveLength(39);
    expect(sourceCategories.filter(c => c.path[0] === 'Property')).toHaveLength(34);
    expect(new Set(sourceCategories.map(c => c.path.slice(0, 2).join('/'))).size).toBe(25);
    expect(sourceCategories.flatMap(c => c.fields)).toHaveLength(1236);
    expect(new Set(sourceCategories.flatMap(c => c.fields.map(f => f.key))).size).toBe(171);
    for (const [i, c] of sourceCategories.entries()) {
      expect(c.sourceOrder).toBe(i); expect(c.source.row).toBe(i + 2);
      expect(c.fields.map(f => f.key)).toEqual(c.raw.key_fields.split('|'));
      for (const [j, field] of c.fields.entries()) {
        expect(field.source).toEqual(c.source); expect(field.order).toBe(j + 1);
        expect(field.id).toBe(c.reviewKey + ':' + field.key);
        expect(field.required).toBe('unknown'); expect(field.options).toBeNull(); expect(field.bounds).toBeNull();
      }
    }
  });
  it('scopes generic definitions and preserves amount and electric keys', () => {
    const storage = sourceCategories.filter(c => c.fields.some(f => f.key === 'storage_type'));
    const laptop = storage.find(c => c.path[2] === 'Laptops')!;
    const bed = storage.find(c => c.path[2] === 'Beds & Mattresses')!;
    expect(laptop.fields.find(f => f.key === 'storage_type')!.id).not.toBe(bed.fields.find(f => f.key === 'storage_type')!.id);
    for (const c of sourceCategories.filter(c => /Electric/.test(c.path[2]) && ['Motorcycles','Scooters'].includes(c.path[1]))) {
      expect(c.fields.map(f => f.key)).toEqual(expect.arrayContaining(['range_km','battery_warranty_left']));
      expect(c.fields.map(f => f.key)).not.toContain('battery_capacity_kwh');
    }
    const propertyKeys = sourceCategories.filter(c => c.path[0] === 'Property').flatMap(c => c.fields.map(f => f.key));
    expect(propertyKeys).toEqual(expect.arrayContaining(['price','monthly_rent','monthly_rent_per_bed','monthly_rent_per_seat','rent_per_night']));
    expect(groupsFor('vehicles')).toEqual(['Motorcycles','Scooters','Cars','Bicycles','Vehicle Parts & Accessories','Commercial Vehicles']);
  });
});
describe('pure proposed rules', () => {
  it('leaves unknown requiredness and widgets unresolved; never authorizes publishing', () => {
    expect(evaluateField({field:'capacity',applicable:true,values:{}})).toEqual({visible:true,enabled:true,required:'unknown',widget:'unresolved',publishingAuthorized:false});
    expect(proposalFor(path('Mobiles & Tablets').fields.find(f => f.key === 'model')!,false)).toBeUndefined();
  });
  it('distinguishes false/zero/unanswered, visibility, enabledness and requiredness without deleting values', () => {
    expect([answered(false),answered(0),answered(null),answered(''),answered(undefined)]).toEqual([true,true,false,false,false]);
    const values={parent:false,number:0,child:'retained'};
    const rule={field:'child',required:'required',requiredWhen:{field:'parent',operation:'equals',value:true},visibleWhen:{field:'parent',operation:'equals',value:true},enabledWhen:{field:'number',operation:'answered'}};
    expect(evaluateField({field:'child',applicable:true,values,rule})).toMatchObject({visible:false,enabled:false,required:'optional'});
    expect(values.child).toBe('retained');
    expect(evaluateField({field:'model',applicable:true,values:{},rule:{field:'model',enabledWhen:{field:'brand',operation:'answered'}}}).enabled).toBe(false);
    expect(evaluateField({field:'model',applicable:true,values:{brand:'Bajaj'},rule:{field:'model',lookupDependent:true},lookup:'error'}).enabled).toBe(false);
  });
  it.each([undefined,'unstarted','loading','error','empty','ready'] as const)('requires explicit ready lookup for Model (%s) and preserves values', lookup => {
    const field=path('Motorcycles').fields.find(f=>f.key==='model')!;
    const rule=proposalFor(field,true);
    const values={brand:'Bajaj',model:'retained-row',km_driven:0,negotiable:false};
    const copy={...values};
    expect(evaluateField({field:'model',applicable:true,values,rule,...(lookup===undefined?{}:{lookup})}).enabled).toBe(lookup==='ready');
    expect(values).toEqual(copy);
    expect(evaluateField({field:'model',applicable:true,values:{brand:null},rule,lookup:'ready'}).enabled).toBe(false);
    expect(evaluateField({field:'model',applicable:false,values,rule,lookup:'ready'}).enabled).toBe(false);
  });
  it('does not make Brand or every catalogue widget model-lookup-dependent; false and zero remain answered', () => {
    const rule=proposalFor(path('Motorcycles').fields.find(f=>f.key==='brand')!,true);
    expect(rule?.lookupDependent).toBeUndefined();
    expect(evaluateField({field:'brand',applicable:true,values:{},rule,lookup:'error'}).enabled).toBe(true);
    for(const parent of [false,0])expect(evaluateField({field:'child',applicable:true,values:{parent},rule:{field:'child',lookupDependent:true,enabledWhen:{field:'parent',operation:'answered'}},lookup:'ready'}).enabled).toBe(true);
  });
  it('rejects executable or extra rule keys at the input boundary', () => {
    for (const rule of [{field:'model',eval:'alert(1)'},{field:'model',sql:'DROP TABLE x'},{field:'model',enabledWhen:{field:'brand',operation:'javascript',value:'x'}},{field:'model',enabledWhen:{field:'brand',operation:'equals'}}]) {
      expect(() => evaluateField({field:'model',applicable:true,values:{},rule})).toThrow();
    }
  });
  it('confirms an incompatible model reset and retains other false/zero attributes', () => {
    const input={values:{brand:'Bajaj',model:'row-69',bill_available:false,storage_gb:0},nextBrand:'Honda'};
    expect(confirmBrandChange(input,false)).toEqual({needsConfirmation:true,values:input.values});
    expect(confirmBrandChange(input,true)).toEqual({needsConfirmation:false,values:{brand:'Honda',bill_available:false,storage_gb:0}});
    expect(confirmBrandChange({...input,nextBrand:'Bajaj'},false).values.model).toBe('row-69');
  });
});
describe('bounded source catalogue lookup', () => {
  it('retains complete raw rows, counts, source order and lifecycle without eligibility inference', () => {
    const cars=catalogue.rows.filter(r => r.catalogue === 'cars'), bikes=catalogue.rows.filter(r => r.catalogue === 'two-wheelers');
    expect(cars).toHaveLength(578); expect(bikes).toHaveLength(830);
    expect(new Set(cars.map(r=>r.raw.brand)).size).toBe(52); expect(new Set(bikes.map(r=>r.raw.brand)).size).toBe(58);
    expect(new Set(cars.map(r=>r.raw.status))).toEqual(new Set(['on_sale','discontinued','import_only']));
    expect(new Set(bikes.map(r=>r.raw.status))).toEqual(new Set(['Current','Discontinued','Upcoming']));
    expect(bikes.find(r=>r.raw.model==='Freedom 125')?.raw.fuel_type).toBe('CNG');
    expect(bikes.filter(r=>r.raw.engine_cc==='')).toHaveLength(176);
    for(const rows of [cars,bikes]) rows.forEach((r,i)=>{expect(r.sourceOrder).toBe(i);expect(r.source.row).toBe(i+2);});
  });
  it('scopes brands/types, paginates and keeps car powertrain crosswalk unresolved', () => {
    const motorcycle=path('Motorcycles');
    const result=lookupCatalogue(catalogue.rows,{path:motorcycle.reviewKey,brand:'Bajaj',limit:3});
    expect(result.rows).toHaveLength(3); expect(result.total).toBeGreaterThan(3);
    expect(result.rows.every(r=>r.raw.brand==='Bajaj' && r.catalogue==='two-wheelers' && catalogueScope('Motorcycles')!.types.includes(r.raw.vehicle_type))).toBe(true);
    expect(lookupCatalogue(catalogue.rows,{path:motorcycle.reviewKey,brand:'Bajaj',limit:3,offset:3}).rows[0].id).not.toBe(result.rows[0].id);
    const scooter=lookupCatalogue(catalogue.rows,{path:path('Scooters').reviewKey,brand:'Honda'});
    expect(scooter.rows.every(r=>r.catalogue==='two-wheelers' && ['Scooter','Electric Scooter','Moped'].includes(r.raw.vehicle_type))).toBe(true);
    const car=lookupCatalogue(catalogue.rows,{path:path('Cars','Electric & Hybrid Cars').reviewKey,brand:'Tata'});
    expect(car.crosswalk.status).toBe('unresolved'); expect(car.crosswalk.note).toContain('no fuel/year/variant');
    expect(lookupCatalogue(catalogue.rows,{path:path('Bicycles').reviewKey,brand:'Honda'}).coverage).toBe(false);
    expect(lookupCatalogue(catalogue.rows,{path:motorcycle.reviewKey,brand:'missing'}).rows).toEqual([]);
    expect(lookupCatalogue(catalogue.rows,{path:motorcycle.reviewKey,brand:'Honda',selected:result.rows[0].id}).selected).toBeNull();
  });
  it('validates the preview API and never returns an unbounded catalogue', async () => {
    const base='http://localhost/api/catalogue?path='+path('Cars').reviewKey;
    const response=GET(new Request(base+'&brand=Maruti+Suzuki&limit=5'));
    expect(response.status).toBe(200); expect((await response.json()).rows).toHaveLength(5);
    for(const query of ['&limit=1408','&offset=-1','&eval=x','&brand=A&brand=B']) expect(GET(new Request(base+query)).status).toBe(400);
  });
  it.each(['brand','model'])('rejects missing/empty/whitespace source %s before filtering', key => {
    const valid=catalogue.rows[0];
    for(const value of [undefined,'','   ',42,false,null]) {
      const raw:Record<string,unknown>={...valid.raw};
      if(value===undefined)delete raw[key];else raw[key]=value;
      const row={...valid,raw};
      expect(catalogueRowSchema.safeParse(row).success).toBe(false);
      expect(()=>lookupCatalogue([row],{path:path('Cars').reviewKey,brand:'irrelevant',search:'x'})).toThrow(z.ZodError);
    }
  });
  it('checks catalogue-specific columns/types/kind and exact provenance without source normalization', () => {
    const car=catalogue.rows[0], bike=catalogue.rows.find(r=>r.catalogue==='two-wheelers' && r.raw.engine_cc==='')!;
    expect(catalogueRowSchema.parse(bike)).toEqual(bike);
    const spaces={...car,raw:{...car.raw,brand:'  Source brand  ',model:' Source model '}};
    expect(catalogueRowSchema.parse(spaces).raw.brand).toBe('  Source brand  ');
    for(const row of [
      {...car,catalogue:'boats'}, {...car,sourceOrder:0.5}, {...car,source:{...car.source,row:1}},
      {...car,source:{...car.source,row:3}}, {...car,source:{...car.source,file:'wrong.csv'}}, {...car,id:'uuid'},
      {...car,raw:{brand:'A',model:'B',body_type:'C',status:'on_sale'}}, {...bike,raw:{...bike.raw,engine_cc:0}},
      {...bike,raw:{brand:'A',model:'B',engine_cc:'',fuel_type:'Electric',status:'Current'}},
      {...car,raw:{...car.raw,unknownColumn:'extra'}},
    ])expect(catalogueRowSchema.safeParse(row).success).toBe(false);
    expect(lookupCatalogue([bike],{path:path('Scooters','Electric Scooters').reviewKey,brand:bike.raw.brand}).rows[0]).toEqual(bike);
  });
});

describe('separate two-wheeler proposal', () => {
  it('covers every exact membership in source order without changing source snapshot bytes or requiredness', () => {
    expect(twoWheelerProposal.status).toBe('proposed-not-approved');
    expect(twoWheelerProposal.paths).toHaveLength(9);
    expect(twoWheelerProposal.paths.flatMap(p=>p.fields)).toHaveLength(101);
    for(const ref of twoWheelerProposal.sourceSnapshots)expect(createHash('sha256').update(readFileSync(ref.file)).digest('hex')).toBe(ref.sha256);
    for(const proposal of twoWheelerProposal.paths){
      const original=sourceCategories.find(c=>c.reviewKey===proposal.reviewKey)!;
      expect(proposal.path).toEqual(original.path);
      expect(proposal.fields.map(f=>[f.definitionId,f.key,f.order,f.source])).toEqual(original.fields.map(f=>[f.id,f.key,f.order,f.source]));
      for(const field of proposal.fields){
        expect(field.requirements).toMatchObject({draft:'optional',source:'unknown'});
        expect(field.rule.required).toBe('unknown'); expect(field.persistence.status).toBe('unresolved');
        expect(field.sourceStatus).toBe('source-derived-membership');
        expect(field.proposalStatus).toBe('proposed-not-approved');
      }
    }
    expect(proposalForPath(path('Cars').reviewKey)).toBeUndefined();
    expect(proposalForPath(path('Mobiles & Tablets').reviewKey)).toBeUndefined();
    expect(twoWheelerProposal.extensions).toEqual([]);
  });
  it('makes all explicit type/style mappings auditable and retains ambiguous or unknown rows with reasons', () => {
    expect(twoWheelerProposal.mappings.filter(m=>m.status==='proposed-explicit')).toHaveLength(14);
    expect(twoWheelerProposal.mappings.filter(m=>m.status==='unresolved').map(m=>m.style)).toEqual(['Naked','Sports Commuter','Scrambler','Roadster','Dual-Sport']);
    const bikes=parsedRows.filter(r=>r.catalogue==='two-wheelers');
    const explicit=bikes.filter(row=>twoWheelerProposal.paths.some(p=>assessCompatibility(sourceCategories.find(c=>c.reviewKey===p.reviewKey)!,row).status==='proposed-compatible'));
    expect(explicit).toHaveLength(685);
    const unknown=bikes.filter(r=>assessCompatibility(path('Motorcycles'),r).status==='unresolved');
    expect(unknown).toHaveLength(145);
    expect(assessCompatibility(path('Motorcycles'),{catalogue:'two-wheelers',raw:{vehicle_type:'Motorcycle',category:'Unknown source style',fuel_type:'CNG'}})).toMatchObject({status:'unresolved',approved:false});
    const cng=bikes.find(r=>r.raw.fuel_type==='CNG')!;
    expect(assessCompatibility(path('Motorcycles','Commuter Bikes'),cng).status).toBe('proposed-compatible');
    expect(cng.raw.fuel_type).toBe('CNG');
  });
  it.each([['Motorcycles','Electric Motorcycles','Electric Motorcycle',30],['Scooters','Electric Scooters','Electric Scooter',144]] as const)('prevents a broad %s group from implying electric leaf compatibility', (group,leaf,type,count) => {
    const category=path(group,leaf);
    const brands=lookupCatalogue(catalogue.rows,{path:category.reviewKey}).brands;
    const matches=brands.flatMap(brand=>{
      const first=lookupCatalogue(catalogue.rows,{path:category.reviewKey,brand,limit:25});
      return first.rows;
    });
    expect(matches).toHaveLength(count);
    expect(matches.every(r=>r.catalogue==='two-wheelers' && r.raw.vehicle_type===type)).toBe(true);
    const wrong=catalogue.rows.find(r=>r.catalogue==='two-wheelers' && r.raw.vehicle_type===(group==='Motorcycles'?'Motorcycle':'Scooter'))!;
    expect(lookupCatalogue(catalogue.rows,{path:category.reviewKey,brand:wrong.raw.brand,selected:wrong.id,view:'review'}).selected).toBeNull();
  });
  it('paginates the complete review population and accounts for every source row without approval claims', () => {
    const category=path('Motorcycles','Commuter Bikes');
    const summary=lookupCatalogue(catalogue.rows,{path:category.reviewKey}).coverageSummary;
    expect(summary).toEqual({sourceRows:830,broadGroupRows:573,outsideBroadGroup:257,proposedCompatible:87,unresolved:145,incompatible:341,approvedCompatible:0});
    const reference=parsedRows.filter(r=>r.catalogue==='two-wheelers' && ['Motorcycle','Electric Motorcycle'].includes(r.raw.vehicle_type));
    const seen:string[]=[];
    for(const brand of new Set(reference.map(r=>r.raw.brand))){
      let offset=0;
      while(true){const result=lookupCatalogue(catalogue.rows,{path:category.reviewKey,brand,view:'review',offset,limit:25});seen.push(...result.rows.map(r=>r.id));expect(result.rows.length).toBeLessThanOrEqual(25);result.rows.forEach(r=>expect(result.compatibilities[r.id]).toMatchObject({approved:false,reason:expect.any(String)}));if(offset+25>=result.total)break;offset+=25;}
    }
    expect(new Set(seen)).toEqual(new Set(reference.map(r=>r.id)));
  });
  it('offers concrete advisory units/bounds without enforcing submission requirements or duplicating common money', () => {
    const conventional=proposalForPath(path('Motorcycles').reviewKey)!;
    const field=(key:string)=>conventional.fields.find(f=>f.key===key)!;
    expect(proposalIssues(field('km_driven'),0,2026)).toEqual([]);
    expect(proposalIssues(field('engine_cc'),null,2026)).toEqual([]);
    expect(proposalIssues(field('engine_cc'),0,2026).length).toBe(1);
    expect(proposalIssues(field('year'),2027,2026).length).toBe(1);
    expect(proposalIssues(field('owner_number'),1.5,2026).length).toBe(1);
    expect(proposalIssues(field('variant'),'a'.repeat(81),2026).length).toBe(1);
    expect(proposalIssues(field('insurance_valid_till'),'2026-02-30',2026).length).toBe(1);
    expect(proposalIssues(field('insurance_valid_till'),'2020-02-29',2026)).toEqual([]);
    expect(field('price').input).toBe('linked-common');expect(field('negotiable').input).toBe('linked-common');
    expect(field('registration_state').options.unresolvedReason).toContain('no enum');
  });
});
