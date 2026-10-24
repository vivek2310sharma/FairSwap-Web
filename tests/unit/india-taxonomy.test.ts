import { describe, expect, it } from 'vitest';
import { POST_AD_CATALOGUE, resolveSub, searchCatalogue, type PostAdCapabilities } from '@/lib/listings/post-ad-category-catalogue';
import { validateGoodsAnswerContract } from '@/lib/listings/post-ad-server';

const caps: PostAdCapabilities = { goodsCategories: [], cars: 'off', twoWheelers: 'off', property: 'off', propertyPaths: [] };
const main = (id: string) => POST_AD_CATALOGUE.find(c => c.id === id)!;

describe('India category contracts', () => {
  it('provides Hindi names for every main category and subcategory', () => {
    for (const category of POST_AD_CATALOGUE) {
      expect(category.label.hi).toBeTruthy();
      for (const sub of category.subs) expect(sub.hi).toBeTruthy();
    }
  });

  it('validates the DB-marked Goods contract with Zod without changing old answers', () => {
    const attributes = [{ validation_rules: { contract: 'india_goods_v1' } }];
    const form = new FormData();
    for (const answers of [{}, { item_type: 'Kurta', brand: 'Local' }]) {
      form.set('category_attributes', JSON.stringify(answers));
      expect(validateGoodsAnswerContract(form, attributes)).toBeNull();
    }
    for (const answers of [{ brand: 42 }, { item_type: 'x'.repeat(101) }, { extra: 'forged' }, null, []]) {
      form.set('category_attributes', JSON.stringify(answers));
      expect(validateGoodsAnswerContract(form, attributes)).toBeTruthy();
      expect(validateGoodsAnswerContract(form, [])).toBeNull();
    }
    form.set('category_attributes', '{bad json');
    expect(validateGoodsAnswerContract(form, attributes)).toBe('Invalid category answers.');
    form.append('category_attributes', '{}');
    expect(validateGoodsAnswerContract(form, attributes)).toBe('Invalid category answers.');
  });
  it('keeps exactly five Fashion choices and keeps children’s clothes out of baby equipment', () => {
    expect(main('fashion').subs.map(s => s.label)).toEqual(['Men', 'Women', 'Kids', 'Watches', 'Sunglasses & Accessories']);
    expect(main('kids-baby').subs).toHaveLength(6);
    expect(main('kids-baby').subs.some(s => /clothing/i.test(s.label))).toBe(false);
    expect(main('fashion').subs.map(s => s.id)).toEqual(['mens', 'womens', 'kids-clothing', 'watches', 'sunglasses-accessories']);
  });

  it.each([
    ['RO', 'other-appliances'], ['silai machine', 'other-appliances'], ['सिलाई मशीन', 'other-appliances'],
    ['godown', 'rent-warehouses'], ['गोदाम', 'sale-warehouses'], ['roommate', 'rent-flatmates'],
    ['रूममेट', 'rent-flatmates'], ['e-scooty', 'electric-cycles'], ['ई स्कूटी', 'electric-cycles'],
    ['power backup', 'power-backup-solar'], ['इन्वर्टर', 'power-backup-solar'],
    ['pram', 'strollers-prams'], ['बर्तन', 'kitchenware-utensils'],
  ])('finds %s in the intended category', (query, id) => {
    expect(searchCatalogue(query).some(hit => hit.sub?.id === id)).toBe(true);
  });

  it('requires the exact loaded Goods key for every newly routable leaf', () => {
    for (const c of POST_AD_CATALOGUE) for (const sub of c.subs) {
      if (sub.route.kind !== 'goods') continue;
      expect(resolveSub(sub, caps).macro).toBeUndefined();
      expect(resolveSub(sub, { ...caps, goodsCategories: [sub.route.key] })).toEqual({ readiness: 'available', macro: 'goods' });
    }
  });

  it('never activates unsupported safety-sensitive categories even with all families live', () => {
    const live: PostAdCapabilities = { ...caps, cars: 'live', twoWheelers: 'live', property: 'live', goodsCategories: ['baby-car-seats', 'everything-else', 'electric-cycles', 'bicycles-sports'] };
    for (const id of ['baby-car-seats', 'other-items', 'electric-cycles', 'rent-warehouses', 'sale-warehouses']) {
      const sub = POST_AD_CATALOGUE.flatMap(c => c.subs).find(s => s.id === id)!;
      expect(resolveSub(sub, live).macro).toBeUndefined();
    }
    expect(POST_AD_CATALOGUE.at(-1)?.id).toBe('everything-else');
    expect(POST_AD_CATALOGUE.some(c => /business|industrial/.test(c.id))).toBe(false);
  });

  it('retains the stored flatmates path independently of PG accommodation', () => {
    const flatmates = main('property').subs.find(s => s.id === 'rent-flatmates')!;
    const pg = main('property').subs.find(s => s.id === 'rent-pg')!;
    const available = { ...caps, property: 'live' as const, propertyPaths: ['PG & Co-living/Flatmates & Shared Rooms'] };
    expect(resolveSub(flatmates, available).macro).toBe('property');
    expect(resolveSub(pg, available).macro).toBeUndefined();
  });
});

