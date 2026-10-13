import {describe,it,expect} from 'vitest';
import {propertyV1,validatePropertyDraft,propertyRupeesToPaise,propertyRentSummary,emptyPropertyFinancial,maxPropertyPaise} from '@/lib/listings/property/contract';
import {financialToPersist,financialToEdit} from '@/lib/listings/property/editing';
import {isVerifiedPropertyTestEnvironment} from '@/lib/listings/test-runtime';
const apartment=propertyV1.paths[0],pg=propertyV1.paths[5],shared=propertyV1.paths[9];
describe('Property monthly rental V1',()=>{
 it.each(propertyV1.paths)('preserves exact optional path $slug',path=>{expect(path.provenance.source.file).toBe('india_categories.csv');expect(validatePropertyDraft({},emptyPropertyFinancial(path),null,path).error).toBeUndefined();expect(path.fields).not.toContain('condition');});
 it.each([['1.01',101],['0',0],['1000001.50',100000150],['90071992547409.91',maxPropertyPaise]])('parses exact %s without the item business cap',(value,paise)=>expect(propertyRupeesToPaise(value)).toBe(paise));
 it.each(['1.001','-1','NaN','Infinity','1e2','90071992547409.92','', '1.','0.000'])('rejects invalid monetary text %s',value=>expect(()=>propertyRupeesToPaise(value)).toThrow());
 it('Known editing state stays incomplete and deliberate zero deposit survives round-trip',()=>{
  expect(()=>financialToPersist({...emptyPropertyFinancial(apartment),rent:{state:'known'}})).toThrow();
  const financial={...emptyPropertyFinancial(apartment),rent:{state:'known' as const,amount_paise:12345},deposit:{state:'known' as const,amount_paise:0}};
  expect(financialToPersist(financialToEdit(financial))).toEqual(financial);
  expect(validatePropertyDraft({},financial,null,apartment).error).toBeUndefined();
 });
 it.each([{rent:{state:'known'}},{rent:{state:'known',amount_paise:0}},{rent:{state:'unknown',amount_paise:0}},{maintenance:{state:'none',amount_paise:0}},{maintenance:{state:'included_in_rent',amount_paise:1}},{maintenance:{state:'separate',amount_paise:100,basis:'per_bed',period:'month'}},{deposit:{state:'known',amount_paise:1.1}},{rent:{state:'known',amount_paise:9007199254740992}}])('rejects incomplete/contradictory financial %j',value=>expect(validatePropertyDraft({},{...emptyPropertyFinancial(apartment),...value},null,apartment).error).toBeTruthy());
 it('does not multiply per-bed rent or infer occupant-share basis',()=>{
  const financial={...emptyPropertyFinancial(pg),rent:{state:'known' as const,amount_paise:12345}};
  expect(propertyRentSummary(financial)).toBe('INR 123.45 / bed / month');
  expect(validatePropertyDraft({sharing_type:'Seller says shared'},financial,null,pg).data?.financial.rent).toEqual(financial.rent);
  expect(validatePropertyDraft({},{...emptyPropertyFinancial(shared),rent:financial.rent},null,shared).error).toMatch(/basis/);
  const share={...emptyPropertyFinancial(shared),basis:'occupant_share' as const,rent:financial.rent};expect(validatePropertyDraft({},share,null,shared).error).toBeUndefined();expect(propertyRentSummary(share)).toContain("occupant's share");
 });
 it('does not render unanswered or unknown rent as Free or zero',()=>{expect(propertyRentSummary(emptyPropertyFinancial(pg))).toBe('Monthly rent not set');expect(propertyRentSummary({...emptyPropertyFinancial(pg),rent:{state:'unknown'}})).toBe('Monthly rent unknown');});
 it.each([{area_sqft:0},{area_sqft:1.111},{available_from:'2026-02-30'},{available_from:'0000-01-01'},{floor:1.5},{parking:false},{maintenance:0},{monthly_rent:100},{society_name:'must stay private'},{city:'duplicate'}])('rejects supplied invalid/detail duplication %j',answers=>expect(validatePropertyDraft(answers,emptyPropertyFinancial(apartment),null,apartment).error).toBeTruthy());
 it('preserves past calendar dates, explicit amenities and unspecified square-foot basis',()=>{const answers={area_sqft:123.45,area_basis:'unspecified',available_from:'2020-01-01',floor:-1,parking:'no'};expect(validatePropertyDraft(answers,emptyPropertyFinancial(apartment),'Private seller text',apartment).data?.answers).toEqual(answers);});
 it('rejects excluded path charges and society text without manufacturing facts',()=>{expect(validatePropertyDraft({},{...emptyPropertyFinancial(shared),deposit:{state:'known',amount_paise:0}},null,shared).error).toMatch(/Deposit/);expect(validatePropertyDraft({},{...emptyPropertyFinancial(pg),maintenance:{state:'none'}},null,pg).error).toMatch(/Maintenance/);expect(validatePropertyDraft({},emptyPropertyFinancial(pg),'Private text',pg).error).toMatch(/Society/);});
 it.each([{}, {NODE_ENV:'production',POST_AD_PROPERTY_TEST_ENABLED:'true'}])('default-OFF/production stays gated %j',env=>expect(isVerifiedPropertyTestEnvironment(env)).toBe(false));
});
