import {propertyRupeesToPaise,paiseToPropertyRupees,type PropertyFinancial} from './contract';
export type FinancialEdit=Record<string,unknown>;
export function financialToEdit(financial:PropertyFinancial):FinancialEdit {
 const edit:FinancialEdit={...financial};
 for(const key of ['rent','deposit','maintenance']){
  const a=financial[key as 'rent'|'deposit'|'maintenance'];
  if(a&&'amount_paise' in a){const {amount_paise,...rest}=a;edit[key]={...rest,rupees:paiseToPropertyRupees(amount_paise)};}
 }
 return edit;
}
export function financialToPersist(edit:FinancialEdit):unknown {
 const financial={...edit};
 for(const key of ['rent','deposit','maintenance']){
  const a=edit[key] as {state?:string;rupees?:string}|undefined;
  if(a&&(a.state==='known'||a.state==='separate')){const {rupees,...rest}=a;financial[key]={...rest,amount_paise:propertyRupeesToPaise(rupees??'')};}
 }
 return financial;
}
export function hasFinancialInput(edit:FinancialEdit,shared:boolean):boolean {
 return (shared&&!!edit.basis)||['rent','deposit','maintenance'].some(k=>{const a=edit[k] as {state?:string}|undefined;return !!a?.state&&a.state!=='unanswered';});
}
