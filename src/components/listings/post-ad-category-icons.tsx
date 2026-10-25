import {
  AirVent, Armchair, Baby, Backpack, BatteryCharging, Bed, Bike, BookOpen,
  BriefcaseBusiness, Cable, Camera, CarFront, CircuitBoard, Compass, CookingPot,
  Dog, Dumbbell, Fish, Flower2, Gamepad2, Glasses, GraduationCap, HardDrive,
  HeartPulse, House, Keyboard, LandPlot, Laptop, Music, Package, Paintbrush,
  Palette, PawPrint, Printer, Refrigerator, Scale, Shapes, Shirt, Smartphone,
  Sofa, Speaker, SprayCan, Store, Tablet, ToyBrick, Truck, Tv, Users,
  Utensils, Volleyball, Warehouse, WashingMachine, Watch, Wrench,
  createLucideIcon, type LucideIcon,
} from "lucide-react";

// Small local SVGs use the same stroke and sizing contract as Lucide.
const Motorcycle = createLucideIcon("Motorcycle", [
  ["circle", { cx: "5", cy: "17", r: "3", key: "rear" }],
  ["circle", { cx: "19", cy: "17", r: "3", key: "front" }],
  ["path", { d: "M5 17l4-6h5l-3 6H5m6 0h4l-2-6m6 6-4-10h-3m3 0h3M6 9h5", key: "frame" }],
]);
const ElectricCycle = createLucideIcon("ElectricCycle", [
  ["circle", { cx: "5", cy: "17", r: "4", key: "rear" }],
  ["circle", { cx: "19", cy: "17", r: "4", key: "front" }],
  ["path", { d: "M5 17l4-8 5 8H5m9 0 4-9m-2-3h3l2 4M7 9h4M13 1l-3 4h4l-3 4", key: "electric-frame" }],
]);
const Dress = createLucideIcon("Dress", [
  ["path", { d: "M8 3v4l2 3-5 11h14l-5-11 2-3V3h-3v3h-2V3H8Zm2 7h4", key: "dress" }],
]);
const ChildClothing = createLucideIcon("ChildClothing", [
  ["path", { d: "m8 3-5 3 2 5 3-1v5l-2 5 4 1 2-4 2 4 4-1-2-5v-5l3 1 2-5-5-3a4 4 0 0 1-8 0Z", key: "romper" }],
]);
const Stroller = createLucideIcon("Stroller", [
  ["path", { d: "M4 12h15a8 8 0 0 0-8-8v8M4 12l3 6h10l3-9 2-2M7 18l-2 3m12-3 2 3", key: "pram" }],
  ["circle", { cx: "7", cy: "21", r: "1", key: "rear" }],
  ["circle", { cx: "17", cy: "21", r: "1", key: "front" }],
]);
const ChildSeat = createLucideIcon("ChildSeat", [
  ["path", { d: "M7 3h5l2 10h4l2 7H5L7 3Zm1 5 5 6m0-6-5 6M5 20v2m15-2v2", key: "seat-harness" }],
]);

type IconMap = Readonly<Record<string, LucideIcon>>;

export const MAIN_CATEGORY_ICONS: IconMap = {
  mobiles: Smartphone, vehicles: CarFront, property: House, appliances: Refrigerator,
  computers: Laptop, furniture: Armchair, fashion: Shirt, "kids-baby": Baby,
  hobbies: BookOpen, pets: PawPrint, services: Wrench, jobs: BriefcaseBusiness,
  "everything-else": Shapes,
};

// Parent IDs scope the keys so repeated leaf IDs cannot collide.
export const SUBCATEGORY_ICONS: Readonly<Record<string, IconMap>> = {
  mobiles: {
    "mobile-phones": Smartphone, "mobile-accessories": Cable, tablets: Tablet,
    wearables: Watch,
  },
  vehicles: {
    cars: CarFront, "two-wheelers": Motorcycle, bicycles: Bike,
    "electric-cycles": ElectricCycle, "vehicle-parts": Wrench, "commercial-vehicles": Truck,
  },
  property: {
    "rent-houses": House, "rent-commercial": Store, "rent-pg": Bed,
    "rent-land": LandPlot, "rent-flatmates": Users, "rent-warehouses": Warehouse,
    "sale-houses": House, "sale-commercial": Store, "sale-warehouses": Warehouse,
    "sale-land": LandPlot,
  },
  appliances: {
    "tv-audio": Tv, "audio-home-theatre": Speaker, "power-backup-solar": BatteryCharging,
    kitchen: CookingPot, fridge: Refrigerator, ac: AirVent, washing: WashingMachine,
    "other-appliances": House, "general-electronics-tv": CircuitBoard,
    "general-appliances": Refrigerator,
  },
  computers: {
    laptops: Laptop, cameras: Camera, games: Gamepad2, "computer-accessories": Keyboard,
    storage: HardDrive, "printers-monitors": Printer, "general-electronics-pc": CircuitBoard,
  },
  furniture: {
    "sofa-dining": Sofa, "beds-wardrobes": Bed, "decor-garden": Flower2,
    "kids-furniture": Armchair, "tables-chairs": Armchair, "other-household": Package,
    "kitchenware-utensils": Utensils, "general-furniture": Armchair,
  },
  fashion: {
    mens: Shirt, womens: Dress, "kids-clothing": ChildClothing, watches: Watch,
    "sunglasses-accessories": Glasses,
  },
  "kids-baby": {
    "strollers-prams": Stroller, "baby-car-seats": ChildSeat, "baby-furniture": Bed,
    "baby-gear": Baby, "toys-games": ToyBrick, "school-essentials": Backpack,
  },
  hobbies: {
    books: BookOpen, gym: Dumbbell, instruments: Music, "sports-equipment": Volleyball,
    "other-hobbies": Palette, "general-hobbies": Palette,
  },
  pets: { fish: Fish, "pet-supplies": PawPrint, dogs: Dog, "other-pets": PawPrint },
  services: {
    packers: Truck, education: GraduationCap, travel: Compass, repair: Wrench,
    "health-beauty": HeartPulse, renovation: Paintbrush, cleaning: SprayCan,
    legal: Scale, "other-services": Wrench,
  },
  jobs: {},
  "everything-else": { "other-items": Shapes },
};

function lookup(map: IconMap, id: string): LucideIcon {
  return Object.prototype.hasOwnProperty.call(map, id) ? map[id] : Shapes;
}

export const getMainCategoryIcon = (id: string): LucideIcon => lookup(MAIN_CATEGORY_ICONS, id);
export const getSubcategoryIcon = (parentId: string, id: string): LucideIcon =>
  Object.prototype.hasOwnProperty.call(SUBCATEGORY_ICONS, parentId)
    ? lookup(SUBCATEGORY_ICONS[parentId], id) : Shapes;

export function SubcategoryIcon({ parentId, id }: { parentId: string; id: string }) {
  const icons = Object.prototype.hasOwnProperty.call(SUBCATEGORY_ICONS, parentId)
    ? SUBCATEGORY_ICONS[parentId] : {};
  const Icon = Object.prototype.hasOwnProperty.call(icons, id) ? icons[id] : Shapes;
  return <Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-emerald-600" />;
}
