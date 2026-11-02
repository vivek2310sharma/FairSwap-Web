export type Compatibility = {state:"seller"|"unknown";device_brand:string;device_model:string;standard:string};
/** No reviewed compatibility catalogue exists in V1. Substrings never establish compatibility. */
export function compatibilityLabel(value:Compatibility) {
 return value.state==="unknown" ? "Compatibility unknown" : `Seller-declared compatibility: ${[value.device_brand,value.device_model,value.standard].filter(Boolean).join(" · ")}`;
}
export const COMPATIBILITY_STATES = {catalogue:"Catalogue-confirmed compatibility",seller:"Seller-declared compatibility",unknown:"Compatibility unknown"} as const;
