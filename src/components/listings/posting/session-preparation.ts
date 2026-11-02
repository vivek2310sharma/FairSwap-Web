import {blankPhoneDraft,type PhoneDraft} from "./mobile-wizard";
/** Conservative: an empty media list alone does not prove an empty local draft. */
export function canPrepareBlankSession(draft:PhoneDraft,photos:readonly unknown[],priceText:string,manualTitle:boolean,area:string) {
    if (photos.length || priceText || manualTitle || area) return false;
    const blank=blankPhoneDraft();
    return (Object.keys(blank) as (keyof PhoneDraft)[]).every(key=>key==="session_id" || JSON.stringify(draft[key])===JSON.stringify(blank[key]));
}
