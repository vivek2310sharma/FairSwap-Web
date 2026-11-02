/** V1 seller-declared taxonomy. No independent device-compatibility rules are seeded. */
export const GROUPS = ["Cases, covers & straps", "Screen protection", "Chargers & docks", "Cables & hubs", "Power banks", "Audio", "Keyboards, pens & stands"] as const;
export type Spec = {key:string;label:string;kind:"text"|"number"|"select";options?:string[];min?:number;max?:number;integer?:boolean;when?:{key:string;value:string}};
const text=(key:string,label:string):Spec=>({key,label,kind:"text"});
const number=(key:string,label:string,min:number,max:number):Spec=>({key,label,kind:"number",min,max,...(["ports","capacity","age_months"].includes(key)?{integer:true}:{})});
const select=(key:string,label:string,options:string[]):Spec=>({key,label,kind:"select",options});
const yn=["Yes","No","Not sure"];
const ports=["USB-C","USB-A","Lightning","Micro-USB","Proprietary","Other"];
const charging=[select("port","Port type",ports),number("watts","Output power (W)",1,500),select("protocol","Charging protocol",["USB PD","USB PD + PPS","Qi","Qi2","Proprietary","Other","Not sure"]),number("ports","Number of ports",1,16),select("plug","Plug type",["India two-pin","India three-pin","USB powered","Other"])] ;
const cases=[text("variant","Exact size / variant"),text("material","Material"),text("colour","Colour"),select("magnetic","Magnetic charging support",yn)];
const stand=[text("mount","Mount / attachment"),text("size","Supported size"),text("material","Material")];
const pen=[text("generation","Pen generation"),select("pairing","Pairing / connector",["Bluetooth","USB-C","Lightning","Magnetic","Passive / capacitive","Other"]),select("nib","Nib condition",["Unused","Good","Worn","Needs replacement"])];
const keyboard=[text("layout","Keyboard layout"),select("pairing","Pairing / connector",["Bluetooth","USB-C","Smart connector","Other"]),select("trackpad","Trackpad",yn),select("backlight","Backlight",yn)];
export const TYPES = [
 {id:"phone-case",name:"Phone case, cover or skin",group:0,exact:true,electronic:false,safety:false,guide:"Front, rear, edges and model marking.",specs:cases},
 {id:"tablet-case",name:"Tablet cover or case",group:0,exact:true,electronic:false,safety:false,guide:"Front, rear, corners and tablet size marking.",specs:cases},
 {id:"watch-strap",name:"Watch strap or band",group:0,exact:true,electronic:false,safety:false,guide:"Both connectors, clasp and any wear.",specs:[text("connector","Connector system"),text("size","Connector / strap size"),text("material","Strap material"),text("wrist","Wrist size / length"),select("clasp","Clasp condition",["Unused","Good","Worn","Damaged"])]},
 {id:"watch-case",name:"Watch case or screen protector",group:1,exact:true,electronic:false,safety:false,guide:"Front, edges and exact size marking.",specs:cases},
 {id:"phone-protector",name:"Phone screen protector",group:1,exact:true,electronic:false,safety:false,guide:"Packaging, edges and model marking.",specs:[text("material","Material"),text("variant","Exact size / variant")]},
 {id:"tablet-protector",name:"Tablet screen protector",group:1,exact:true,electronic:false,safety:false,guide:"Packaging, edges and generation marking.",specs:[text("material","Material"),text("variant","Exact size / variant")]},
 {id:"charger",name:"Charger or charging adapter",group:2,exact:false,electronic:true,safety:true,guide:"Front, back, output specifications and connector.",specs:charging},
 {id:"wireless-charger",name:"Wireless charger",group:2,exact:false,electronic:true,safety:true,guide:"Charging surface, underside specifications and power input.",specs:charging},
 {id:"watch-charger",name:"Watch charger or charging dock",group:2,exact:true,electronic:true,safety:true,guide:"Charging connector, dock and model marking.",specs:charging},
 {id:"tablet-charging",name:"Tablet charging accessory",group:2,exact:false,electronic:true,safety:true,guide:"Connectors and output specifications.",specs:charging},
 {id:"cable",name:"Charging or data cable",group:3,exact:false,electronic:true,safety:true,guide:"Both connectors, length and any fraying.",specs:[select("end_a","Connector at first end",ports),select("end_b","Connector at second end",ports),number("length_m","Length (metres)",0.1,20),number("watts","Charging capability (W)",1,500),select("data","Data-transfer support",["Charging only","USB 2","USB 3","USB 4","Thunderbolt","Not sure"]),select("cable_condition","Cable condition",["No fraying or exposed wires","Damaged / exposed wires"])]},
 {id:"hub",name:"USB-C hub or dock",group:3,exact:false,electronic:true,safety:false,guide:"All ports, input connector and specification label.",specs:[select("input","Input connector",ports),text("outputs","Output ports and standards"),number("watts","Pass-through power (W)",0,500)]},
 {id:"power-bank",name:"Power bank",group:4,exact:false,electronic:true,safety:true,guide:"All sides, capacity label, ports and any damage.",specs:[number("capacity","Capacity (mAh)",100,100000),number("watts","Output power (W)",1,500),text("ports","Ports"),select("wireless","Wireless charging",yn),number("age_months","Approximate age (months)",0,240),select("battery","Charging / battery performance",["Normal","Reduced capacity","Not tested"])]},
 {id:"audio",name:"Earphones, earbuds or headphones",group:5,exact:false,electronic:true,safety:true,guide:"Both earpieces, charging case and included accessories.",specs:[select("connection","Connection",["Wired","Wireless"]),{...select("bluetooth","Bluetooth support",["4.x","5.x","6.x","Not sure"]),when:{key:"connection",value:"Wireless"}},select("earpieces","Both earpieces included",["Yes","No","Single-ear product"]),select("case","Charging case included",["Yes","No","Not applicable"]),select("audio","Microphone / audio condition",["Working","Faulty","Not tested"]),select("battery","Battery performance",["Normal","Reduced capacity","Not tested","Not applicable"]),select("anc","Active noise cancellation",yn)]},
 {id:"keyboard-case",name:"Tablet keyboard case or folio",group:6,exact:true,electronic:true,safety:false,guide:"Keyboard, connector, keys and generation marking.",specs:keyboard},
 {id:"stylus",name:"Stylus or digital pen",group:6,exact:true,electronic:true,safety:false,guide:"Pen body, nib and model / generation marking.",specs:pen},
 {id:"phone-stand",name:"Phone mount, holder or stand",group:6,exact:false,electronic:false,safety:false,guide:"Mount, joints and attachment points.",specs:stand},
 {id:"tablet-stand",name:"Tablet stand or mount",group:6,exact:false,electronic:false,safety:false,guide:"Mount, joints and supported size marking.",specs:stand},
 {id:"strap-adapter",name:"Watch strap connector or adapter",group:0,exact:true,electronic:false,safety:false,guide:"Both connectors and size marking.",specs:[text("connector","Connector system"),text("size","Size")]},
 {id:"other-phone",name:"Other phone accessory",group:6,exact:false,electronic:true,safety:true,guide:"Whole item, model markings and any faults.",specs:[text("purpose","Accessory purpose")]},
 {id:"other-wearable",name:"Other wearable accessory",group:6,exact:true,electronic:true,safety:true,guide:"Whole item, connector and model markings. Watches themselves use Smartwatches & Wearables.",specs:[text("purpose","Accessory purpose")]},
] as const;
export type AccessoryType = typeof TYPES[number]["id"];
export const BRANDS = ["Apple","Samsung","Spigen","Anker","Belkin","boAt","Noise","Portronics","Ambrane","Zebronics","Xiaomi","OnePlus","Other","Unbranded"];
export function accessoryType(id:string){return TYPES.find(t=>t.id===id);}
export function visibleSpecs(id:string,values:Record<string,string|number>){return (accessoryType(id)?.specs??[] as Spec[]).filter((s:Spec)=>!s.when||values[s.when.key]===s.when.value) as Spec[];}
