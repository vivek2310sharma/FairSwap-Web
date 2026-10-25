import React from "react";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import MobilePhoneForm from "@/components/listings/MobilePhoneForm";
import type { MobileCatalogue } from "@/lib/listings/mobiles/contract";
const m=vi.hoisted(()=>({read:vi.fn(),write:vi.fn(),replace:vi.fn(),fetch:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({replace:m.replace})}));
vi.mock("@/lib/listings/posting-recovery",()=>({readPostingRecovery:m.read,writePostingRecovery:m.write}));
vi.mock("@/components/listings/PincodeLocationPicker",()=>({default:()=> <div><input type="hidden" name="pin_code" value="560034"/><input type="hidden" name="city_id" value="55555555-5555-4555-8555-555555555555"/><input type="hidden" name="locality_id" value="66666666-6666-4666-8666-666666666666"/></div>}));
vi.mock("@/components/listings/PreListingMediaUploader",()=>({default:({onChange}:{onChange:(v:unknown[])=>void})=><button type="button" onClick={()=>onChange([{id:"44444444-4444-4444-8444-444444444444",state:"ready"}])}>Add ready photo</button>}));
const owner="11111111-1111-4111-8111-111111111111",brand="22222222-2222-4222-8222-222222222222",model="33333333-3333-4333-8333-333333333333";
const catalogue:MobileCatalogue={version:2,revision:"fixture-v2",listing_category_id:owner,enabled:true,selection:{category:"mobiles",subcategory:"mobile-phones",version:2},brands:[{id:brand,name:"Apple",aliases:["iPhone"],sort_order:1}],models:[{id:model,brand_id:brand,name:"iPhone 15",aliases:[],sort_order:1,older_group:false,other:false}]};
beforeEach(()=>{vi.clearAllMocks();m.read.mockResolvedValue(undefined);m.write.mockResolvedValue(undefined);m.fetch.mockImplementation(async(input:string)=>({ok:true,json:async()=>input==="/api/post-ad/submit"?{success:true,listing_id:owner}:{session:{state:"open"},media:[]}}));vi.stubGlobal("fetch",m.fetch);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function ready(){render(<MobilePhoneForm ownerId={owner} catalogue={catalogue} cities={[]}/>);await waitFor(()=>expect(screen.getByRole("button",{name:"Preview / Continue"})).toBeEnabled());}
function fill(){fireEvent.click(screen.getByRole("button",{name:"Add ready photo"}));fireEvent.change(screen.getByLabelText("Brand"),{target:{value:brand}});fireEvent.change(screen.getByLabelText("Model"),{target:{value:model}});fireEvent.change(screen.getByLabelText("Description"),{target:{value:"Used carefully. Battery health 90%."}});fireEvent.change(screen.getByLabelText("Price (₹)"),{target:{value:"25000"}});}
describe("Mobile phone posting journey",()=>{
 it("supports Hindi field labels and honest AI copy without changing stored enum values",async()=>{await ready();fireEvent.click(screen.getByRole("button",{name:"हिंदी"}));expect(screen.getByLabelText("ब्रांड")).toBeVisible();expect(screen.getByLabelText("स्थिति")).toHaveValue("good");expect(screen.getByText("अभी AI आपकी तस्वीरों का विश्लेषण नहीं करता।")).toBeVisible();expect(screen.getByRole("button",{name:"पूर्वावलोकन / आगे बढ़ें"})).toBeVisible();});
 it("keeps the AI panel below photos and never offers a separate draft step",async()=>{await ready();const photo=screen.getByRole("button",{name:"Add ready photo"});const ai=screen.getByRole("complementary",{name:"AI assistant"});expect(photo.compareDocumentPosition(ai)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(screen.getByText("Your photos are not analysed by AI yet.")).toBeVisible();expect(screen.queryByRole("button",{name:/Save.*Draft/i})).toBeNull();});
 it("retains a manually edited title when condition and storage change",async()=>{await ready();fill();fireEvent.change(screen.getByLabelText("Title"),{target:{value:"My carefully used phone"}});fireEvent.change(screen.getByLabelText("Storage"),{target:{value:"256 GB"}});fireEvent.change(screen.getByLabelText("Condition"),{target:{value:"like_new"}});expect(screen.getByLabelText("Title")).toHaveValue("My carefully used phone");});
 it("submits a zero-price giveaway only after preview and Free plan",async()=>{
  await ready();fill();fireEvent.change(screen.getByLabelText("Trade type"),{target:{value:"giveaway"}});expect(screen.queryByLabelText("Price (₹)")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Preview / Continue"}));expect(screen.getByRole("region",{name:"Buyer preview"})).toBeVisible();expect(screen.queryByRole("button",{name:"Submit for review"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Continue"}));expect(screen.getByRole("radio")).toBeChecked();fireEvent.click(screen.getByRole("button",{name:"Submit for review"}));
  await waitFor(()=>expect(m.replace).toHaveBeenCalledWith(`/account/listings/${owner}/edit`));const request=m.fetch.mock.calls.find(([url])=>url==="/api/post-ad/submit")!;expect(JSON.parse(request[1].body)).toMatchObject({trade:"giveaway",price_paise:0,negotiable:false,plan_id:"free-v1"});expect(m.write).toHaveBeenCalledWith(owner,null);
 });
 it("ignores recovery belonging to a different signed-in account",async()=>{
  m.read.mockResolvedValue({version:2,owner:brand,updated:Date.now(),draft:{title:"Other account private title"}});await ready();expect(screen.queryByDisplayValue("Other account private title")).toBeNull();expect(m.read).toHaveBeenCalledWith(owner);
 });
 it("shows a consolidated linked summary for missing price and photos",async()=>{await ready();fireEvent.click(screen.getByRole("button",{name:"Preview / Continue"}));expect(screen.getByRole("alert")).toHaveTextContent("Fix");expect(screen.getByRole("alert").querySelectorAll("button").length).toBeGreaterThan(1);expect(m.fetch.mock.calls.some(([url])=>url==="/api/post-ad/submit")).toBe(false);});
});
