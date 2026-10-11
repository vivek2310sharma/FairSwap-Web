import snapshot from './generated/categories.v1.json';

export interface SourceRef { file: string; row: number }
export interface SourceField {
  id: string; key: string; order: number; source: SourceRef;
  required: string; bounds: null; options: null; proposal: Record<string, string>;
}
export interface SourceCategory {
  reviewKey: string; path: string[]; sourceOrder: number; source: SourceRef;
  raw: Record<string, string>; fields: SourceField[];
}
export const categorySnapshot = snapshot;
export const sourceCategories: SourceCategory[] = snapshot.categories;
export const vehicleDisplayOrder = ['Motorcycles', 'Scooters', 'Cars', 'Bicycles', 'Vehicle Parts & Accessories', 'Commercial Vehicles'];
export function groupsFor(macro: string) {
  const groups = [...new Set(sourceCategories.filter(c => c.path[0].toLowerCase() === macro).map(c => c.path[1]))];
  return macro === 'vehicles' ? [...vehicleDisplayOrder.filter(g => groups.includes(g)), ...groups.filter(g => !vehicleDisplayOrder.includes(g))] : groups;
}
export function catalogueScope(group: string): { catalogue: string; types: string[] } | null {
  if (group === 'Cars') return {catalogue: 'cars', types: []};
  if (group === 'Motorcycles') return {catalogue: 'two-wheelers', types: ['Motorcycle', 'Electric Motorcycle']};
  if (group === 'Scooters') return {catalogue: 'two-wheelers', types: ['Scooter', 'Electric Scooter', 'Moped']};
  return null;
}
export const amountKeys = ['price', 'monthly_rent', 'monthly_rent_per_bed', 'monthly_rent_per_seat', 'rent_per_night'];
