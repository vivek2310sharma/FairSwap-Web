import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import MacroCategorySelector from "@/components/listings/MacroCategorySelector";
import {parseTaxonomy} from "@/lib/listings/taxonomy-v2";
import fixture from "./taxonomy-v2-fixture.json";
const bindings=Object.fromEntries(fixture.nodes.filter(n=>n.posting_enabled).map(n=>[n.posting_flow,n.id]));
const catalogue=parseTaxonomy(fixture,bindings);
const availability={goods:{available:true},vehicles:{available:true},property:{available:true}} as const;
const capabilities={mobilePhones:true,tablets:true,wearables:true,cars:"off",twoWheelers:"off",property:"off",goodsCategories:[],propertyPaths:[]} as const;
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("renders all 15 server-defined groups and preserves safety messaging",()=>{render(<MacroCategorySelector catalogue={catalogue} capabilities={capabilities} availability={availability}/>);for(const g of catalogue)expect(screen.getByRole("button",{name:new RegExp('^'+g.label.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))})).toBeVisible();expect(screen.getByText(/UPI PIN/)).toBeVisible();});
it("searches canonical leaves and routes only released matching specialists",()=>{render(<MacroCategorySelector catalogue={catalogue} capabilities={capabilities} availability={availability}/>);fireEvent.change(screen.getByRole("searchbox"),{target:{value:"Mobile Phones"}});expect(screen.getByRole("link",{name:/Mobile Phones/})).toHaveAttribute("href","/account/listings/new?category=mobile-phones");fireEvent.change(screen.getByRole("searchbox"),{target:{value:"Projectors"}});expect(screen.queryByRole("link",{name:/Projectors/})).toBeNull();expect(screen.getByRole("button",{name:/Projectors/})).toBeVisible();});
it("does not fall back to a hardcoded catalogue on failure",()=>{render(<MacroCategorySelector catalogue={null} capabilities={capabilities} availability={availability}/>);expect(screen.getByRole("status")).toHaveTextContent("temporarily unavailable");expect(screen.queryByRole("button",{name:/Mobiles & Tablets/})).toBeNull();});

it("mobile dialog restores focus to the selected group on close",()=>{
 vi.stubGlobal("matchMedia",()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 const open=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"showModal");
 const close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"close");
 Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
 Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");}});
 try {
  render(<MacroCategorySelector catalogue={catalogue} capabilities={capabilities} availability={availability}/>);
  const trigger=screen.getByRole("button",{name:/^Mobiles & Tablets/});
  fireEvent.click(trigger);expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Close"}));expect(trigger).toHaveFocus();
 } finally {
  if(open)Object.defineProperty(HTMLDialogElement.prototype,"showModal",open);
  else Reflect.deleteProperty(HTMLDialogElement.prototype,"showModal");
  if(close)Object.defineProperty(HTMLDialogElement.prototype,"close",close);
  else Reflect.deleteProperty(HTMLDialogElement.prototype,"close");
 }
});

it("preserves rental anti-scam guidance under the canonical property group",()=>{
 render(<MacroCategorySelector catalogue={catalogue} capabilities={capabilities} availability={availability}/>);
 fireEvent.click(screen.getByRole("button",{name:/^Property/}));
 expect(screen.getByText(/Beware of fake landlords/)).toBeVisible();
});

it("has one category chooser and no legacy creation escape hatch",()=>{render(<MacroCategorySelector catalogue={catalogue} capabilities={capabilities} availability={availability}/>);expect(screen.queryByText("Existing posting options")).toBeNull();expect(screen.getAllByRole("heading",{level:1})).toHaveLength(1);});
