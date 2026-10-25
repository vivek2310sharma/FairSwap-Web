"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { compressPostingPhoto } from "@/lib/listings/posting-recovery";
import { postingText, phoneErrorText, type PostingLocale } from "@/lib/listings/mobiles/locale";
export type PostingPhoto={id:string;state:"pending"|"uploading"|"ready"|"failed";blob?:Blob;url?:string;error?:string};
export default function PreListingMediaUploader({photos,onChange,sessionId,disabled,onReady,locale="en"}:{locale?:PostingLocale;photos:PostingPhoto[];onChange:(photos:PostingPhoto[])=>void;sessionId:string;disabled:boolean;onReady:()=>Promise<void>}) {
 const t=(text:string)=>postingText(locale,text);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const latest=useRef(photos);
 useEffect(()=>{latest.current=photos;},[photos]);
 const change=(next:PostingPhoto[])=>{latest.current=next;onChange(next);};
 async function upload(items:PostingPhoto[]) {
  if(busy)return;setBusy(true);setError("");
  try {for(const photo of items) {
   if(!photo.blob)continue;
   change(latest.current.map(p=>p.id===photo.id?{...p,state:"uploading",error:undefined}:p));
   try {
    const data=new FormData();data.append("file",photo.blob,"photo.webp");data.append("media_id",photo.id);
    const r=await fetch(`/api/post-ad/sessions/${sessionId}/media`,{method:"POST",body:data});const result=await r.json();if(!r.ok)throw new Error(result.error);
    change(latest.current.map(p=>p.id===photo.id?{...p,state:"ready"}:p));
   }catch(e){change(latest.current.map(p=>p.id===photo.id?{...p,state:"failed",error:e instanceof Error?e.message:"Upload failed"}:p));}
  }await onReady();}catch{setError("Could not refresh photos. Retry or refresh this page.");}finally{setBusy(false);}
 }
 return <section id="mobile-media_ids" tabIndex={-1} className="space-y-3" aria-labelledby="photo-heading">
  <h2 id="photo-heading" className="font-semibold">{t("Photos (1–8)")}</h2>
  <p className="text-sm text-gray-700">{t("Show the front, back, screen on, sides and box. Hide IMEI and names/addresses on bills.")}</p>
  <input aria-label={t("Add photos")} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled||busy||photos.length>=8} onChange={async e=>{
   const files=Array.from(e.target.files??[]);e.target.value="";if(!files.length)return;
   if(photos.length+files.length>8){setError("Choose at most 8 photos.");return;}
   setBusy(true);const added:PostingPhoto[]=[];
   try{for(const file of files)added.push({id:crypto.randomUUID(),state:"pending",blob:await compressPostingPhoto(file)});change([...latest.current,...added]);}catch(err){setError(err instanceof Error?err.message:"Photo processing failed");}finally{setBusy(false);}
  }}/>
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map(p=><li key={p.id} className="rounded-lg border p-2">
   {p.url&&<Image src={p.url} alt="Listing photo" width={200} height={200} unoptimized className="aspect-square w-full rounded object-cover"/>}
   <p className="text-sm" role="status">{t(p.state==="ready"?"Ready":p.state==="failed"?"Upload failed":p.state==="uploading"?"Uploading…":"Ready to upload")}</p>
   {p.error&&<p className="text-xs text-red-700">{phoneErrorText(locale,p.error)}</p>}
   <button type="button" disabled={disabled||busy} className="mt-2 text-sm underline" onClick={async()=>{
    try {
      const r=await fetch(`/api/post-ad/sessions/${sessionId}/media`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({media_id:p.id})});
      if(r.ok)change(latest.current.filter(x=>x.id!==p.id));else setError("Could not remove photo. Retry.");
    } catch { setError("Could not remove photo. Retry."); }
   }}>{t("Remove photo")}</button>
  </li>)}</ul>
  {photos.some(p=>p.state!=="ready")&&<button type="button" disabled={disabled||busy} className="rounded-lg border px-4 py-2" onClick={()=>void upload(photos.filter(p=>p.state!=="ready"))}>{t(busy?"Uploading…":"Upload / retry photos")}</button>}
  {error&&<p role="alert" className="text-sm text-red-700">{phoneErrorText(locale,error)}</p>}
 </section>;
}
