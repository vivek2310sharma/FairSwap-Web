"use client";

import { useRouter } from "next/navigation";
import type { SearchFilters } from "@/types/listing";
import { discoveryHref, type PublicArea } from "@/lib/location/discovery";
import { DiscoveryLocationSelector } from "./DiscoveryLocationSelector";

/** Search URLs are authoritative, including an explicit All India /search URL. */
export function SearchLocation({ filters, area }: { filters: SearchFilters; area: PublicArea | null }) {
  const router = useRouter();
  return <div className="mb-5 max-w-xl"><DiscoveryLocationSelector area={area} onConfirm={next => router.push(discoveryHref(filters, next))} /></div>;
}
