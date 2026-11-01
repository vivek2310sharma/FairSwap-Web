"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { AccountNav } from "./AccountNav";
export default function AccountChrome({ ratingsAvailable }: {
    ratingsAvailable: boolean;
}) {
    const path = usePathname();
    if (path === "/account/listings/new" || path?.startsWith("/account/listings/new/"))
        return <><a href="#posting-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:text-foreground">Skip to posting</a><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" aria-label="FairSwap home" className="rounded-sm px-1 py-0.5 dark:bg-white/90"><Image src="/brand/FairSwap_Web_Logo_Transparent.png" alt="FairSwap" width={140} height={43} priority className="h-8 w-auto"/></Link><span className="text-sm font-semibold text-muted">Post an ad</span></div></header></>;
    return <><Header /><AccountNav ratingsAvailable={ratingsAvailable}/></>;
}
