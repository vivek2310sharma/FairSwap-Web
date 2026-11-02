import MobileBuyerPreview from "./MobileBuyerPreview";
import {compatibilityLabel} from "@/lib/listings/accessories/compatibility";
import {accessoryType} from "@/lib/listings/accessories/catalogue";
import {CONDITIONS,ORIGINALITY} from "@/lib/listings/accessories/contract";
import type {AccessoryDraft} from "./accessory-wizard";
import type {PostingPhoto} from "../PreListingMediaUploader";
export default function AccessoryBuyerPreview({draft,title,price,area,photos}:{draft:AccessoryDraft;title:string;price:string;area:string;photos:PostingPhoto[]}){return <MobileBuyerPreview emptyTitle="Your accessory’s next chapter" title={title} price={price} description={draft.description} area={area} photos={photos} facts={[accessoryType(draft.type)?.name??"",compatibilityLabel(draft.compatibility),draft.condition?CONDITIONS[draft.condition]:"",draft.originality?ORIGINALITY[draft.originality]:"",draft.working?`Working status: ${draft.working.replaceAll("_"," ")}`:"",`Quantity: ${draft.quantity}`,draft.bundle_contents?`Includes: ${draft.bundle_contents}`:""]}/>;}
