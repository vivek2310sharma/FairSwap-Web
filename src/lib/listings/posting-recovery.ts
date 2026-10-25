"use client";
/** One small account-bound record, including sanitized retry blobs. No raw photo persists. */
const database = "fairswap-posting-v2";
async function store() {
 return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore("drafts");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error("Local recovery unavailable"));});
}
export async function readPostingRecovery(account:string):Promise<unknown> {
 const db=await store();try{return await new Promise((resolve,reject)=>{const r=db.transaction("drafts").objectStore("drafts").get(account);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
export async function writePostingRecovery(account:string,value:unknown) {
 const db=await store();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction("drafts","readwrite");if(value===null)t.objectStore("drafts").delete(account);else t.objectStore("drafts").put(value,account);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}finally{db.close();}
}
export async function compressPostingPhoto(file:File):Promise<Blob> {
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>20*1024*1024)throw new Error("Choose a JPEG, PNG or WebP image up to 20 MB.");
 const bitmap=await createImageBitmap(file);
 try {
  if(bitmap.width*bitmap.height>64000000)throw new Error("Photo dimensions are too large.");
  const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");
  canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Photo processing unavailable.");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Photo processing failed.")),"image/webp",0.82));
 }finally{bitmap.close();}
}
