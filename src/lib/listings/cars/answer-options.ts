/** Proposed finite Cars V1 seller options; these are not catalogue facts. */
export const carAnswerOptions = {
  fuel_type: ["petrol", "diesel", "cng", "lpg", "electric", "hybrid", "other"],
  transmission: ["manual", "automatic", "amt", "cvt", "dct", "other"],
  powertrain: ["battery_electric", "plug_in_hybrid", "hybrid", "other"],
};

export type CarDeclarationField = keyof typeof carAnswerOptions;
const declarationNames = {fuel_type:"fuel",transmission:"transmission",powertrain:"powertrain"};
/** A Known editing state is incomplete until the seller supplies a supported value. */
export function carDeclarationError(field:CarDeclarationField,answer:unknown):string|undefined {
  if(!answer||typeof answer!=="object"||Array.isArray(answer))return;
  const a=answer as {state?:unknown;value?:unknown;other?:unknown};
  if(a.state!=="known")return;
  if(typeof a.value!=="string"||!carAnswerOptions[field].includes(a.value))return `Select ${declarationNames[field]}.`;
  if(a.value==="other"&&(typeof a.other!=="string"||a.other.trim().length<1||a.other.trim().length>80))return `Enter 1–80 characters for Other ${declarationNames[field]}.`;
  if(a.value!=="other"&&a.other!==undefined)return "Other detail must accompany only the Other option";
  if(Object.keys(answer).some(key=>!["state","value","other"].includes(key)))return `Complete a valid ${declarationNames[field]} declaration.`;
}
export function isCompleteCarDeclaration(field:CarDeclarationField,answer:unknown):boolean {
  return !!answer&&typeof answer==="object"&&!Array.isArray(answer)&&"state" in answer&&answer.state==="known"&&!carDeclarationError(field,answer);
}
