"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PostAdFlow from "./PostAdFlow";
import ListingForm from "./ListingForm";
import { buildMacroCategoryUrl, parseMacroCategory } from "@/lib/listings/macro-category";
import type { GoodsReferences } from "@/lib/listings/post-ad-server";
import type { PostAdLocations } from "@/lib/listings/post-ad-locations";
import type { VehicleReferences } from "@/lib/listings/two-wheeler/server";
import type { PropertyReferences } from '@/lib/listings/property/server';
import type { ListingCategoryReference, ListingAttributeReference } from '@/types/listing';

export default function GoodsPostAdEntry({references, vehicles, property, locations, isMaintenanceActive, maintenanceMessage}: {references: GoodsReferences; vehicles?: VehicleReferences; property?:PropertyReferences; locations?:PostAdLocations; isMaintenanceActive: boolean; maintenanceMessage?: string}) {
  const router = useRouter();
  const query = useSearchParams();
  const values = query.getAll("macro");
  const parsed = parseMacroCategory(values.length > 1 ? values : values[0]);
  return <div className="space-y-6">
    <PostAdFlow vehiclesAvailable={!!vehicles} propertyAvailable={!!property} macro={parsed.status === "valid" ? parsed.macroCategory : null} invalidQuery={parsed.status === "invalid"} hrefForSection={buildMacroCategoryUrl} navigate={(macro, replace) => { const url = macro ? buildMacroCategoryUrl(macro) : "/account/listings/new"; if (replace) router.replace(url); else router.push(url); }} renderForm={({section,...controls}) => {
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
    <Link href="/account/listings/new?entry=legacy" className="text-sm font-medium text-emerald-700 underline">Use existing posting form</Link>
  </div>;
}
