"use client";
import { useRouter, useSearchParams } from "next/navigation";
import PostAdFlow from "./PostAdFlow";
import type { FamilyState, PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
import ListingForm from "./ListingForm";
import { buildMacroCategoryUrl, parseMacroCategory } from "@/lib/listings/macro-category";
import type { GoodsReferences } from "@/lib/listings/post-ad-server";
import type { PostAdLocations } from "@/lib/listings/post-ad-locations";
import type { VehicleReferences } from "@/lib/listings/two-wheeler/server";
import type { PropertyReferences } from '@/lib/listings/property/server';
import type { ListingCategoryReference, ListingAttributeReference } from '@/types/listing';

export default function GoodsPostAdEntry({references, vehicles, property, locations, isMaintenanceActive, maintenanceMessage, submission}: {submission?: {twoWheelers: boolean; cars: boolean; property: boolean}; references: GoodsReferences; vehicles?: VehicleReferences; property?:PropertyReferences; locations?:PostAdLocations; isMaintenanceActive: boolean; maintenanceMessage?: string}) {
  const router = useRouter();
  const query = useSearchParams();
  const values = query.getAll("macro");
  const parsed = parseMacroCategory(values.length > 1 ? values : values[0]);
  // Readiness is derived from server-loaded references; `submission` only distinguishes draft-only from live.
  const usable = (v?: {categories: unknown[]; error?: string}) => !!v && !v.error && v.categories.length > 0;
  const family = (has: boolean, live?: boolean): FamilyState => !has ? "off" : live ? "live" : "draft";
  const capabilities: PostAdCapabilities = {
    goods: references.status === "ready" && references.categories.length > 0,
    twoWheelers: family(!!vehicles && !vehicles.error && vehicles.categories.some(c => c.family !== "cars"), submission?.twoWheelers),
    cars: family(!!vehicles && !vehicles.error && vehicles.categories.some(c => c.family === "cars"), submission?.cars),
    property: family(usable(property), submission?.property),
    propertyCategoryLabels: usable(property) ? property!.categories.map(c => c.path.join(" ")) : [],
  };
  return <div className="space-y-6">
    <PostAdFlow capabilities={capabilities} vehiclesAvailable={!!vehicles} propertyAvailable={!!property} macro={parsed.status === "valid" ? parsed.macroCategory : null} invalidQuery={parsed.status === "invalid"} hrefForSection={buildMacroCategoryUrl} navigate={(macro, replace) => { const url = macro ? buildMacroCategoryUrl(macro) : "/account/listings/new"; if (replace) router.replace(url); else router.push(url); }} renderForm={({section,...controls}) => {
      if(locations?.status==='error')return <p role="alert">{locations.message}</p>;
      let categories:ListingCategoryReference[];
      let attributes:ListingAttributeReference[]=[];
      if(section==='property') {
        if(!property)return <p role="status">Property posting is unavailable.</p>;
        if(property.error)return <p role="alert">{property.error}</p>;
        if(!property.categories.length)return <p role="status">No Property categories are available.</p>;
        categories=property.categories.map(c=>({...c,name:`${c.path[1]} › ${c.path[2]}`}));
      } else if(section==='vehicles') {
        if(!vehicles)return <p role="status">Vehicle posting is unavailable.</p>;
        if(vehicles.error)return <p role="alert">{vehicles.error}</p>;
        if(!vehicles.categories.length)return <p role="status">No Vehicle categories are available.</p>;
        categories=vehicles.categories.map(c=>({...c,name:`${c.path[1]} › ${c.path[2]}`}));
      } else {
        if(references.status==='error')return <p role="alert">{references.message}</p>;
        if(!references.categories.length)return <p role="status">No Goods categories are available.</p>;
        categories=references.categories;
        attributes=references.attributes;
      }
      // Older Goods callers retain their existing city result; the new entry
      // always supplies an independently loaded shared result, including errors.
      const cities=locations?.cities??(references.status==='ready'?references.cities:undefined);
      if(!cities)return <p role="status">Shared city/location references are unavailable.</p>;
      if(locations&&!cities.length)return <p role="status">No active city/location references are available.</p>;
      return <ListingForm categories={categories} allAttributes={attributes} cities={cities} postAdEntry={section==='property'?'property':section==='vehicles'?'vehicle':'goods'} property={section==='property'&&property?{references:property}:undefined} vehicle={section==='vehicles'&&vehicles?{references:vehicles}:undefined} {...controls} isMaintenanceActive={isMaintenanceActive} maintenanceMessage={maintenanceMessage} />;
    }} />
  </div>;
}