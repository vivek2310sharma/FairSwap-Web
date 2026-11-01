"use client";
import { Camera, Images, CircleAlert } from "lucide-react";
import PostingPhotoImage from "./posting/PostingPhotoImage";
import styles from "./posting/Posting.module.css";
import { useEffect, useRef, useState } from "react";
import { compressPostingPhoto } from "@/lib/listings/posting-recovery";
import { postingText, phoneErrorText, type PostingLocale } from "@/lib/listings/mobiles/locale";
export type PostingPhoto = {
    id: string;
    state: "pending" | "uploading" | "ready" | "failed";
    blob?: Blob;
    url?: string;
    error?: string;
};
export default function PreListingMediaUploader({ photos, onChange, sessionId, disabled, onReady, locale = "en" }: {
    locale?: PostingLocale;
    photos: PostingPhoto[];
    onChange: (photos: PostingPhoto[]) => void;
    sessionId: string;
    disabled: boolean;
    onReady: () => Promise<void>;
}) {
    const t = (text: string) => postingText(locale, text);
    const fileInput = useRef<HTMLInputElement>(null);
    const working = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const latest = useRef(photos);
    useEffect(() => { latest.current = photos; }, [photos]);
    const change = (next: PostingPhoto[]) => { latest.current = next; onChange(next); };
    async function upload(items: PostingPhoto[]) {
        if (working.current)
            return;
        working.current = true;
        setBusy(true);
        setError("");
        try {
            for (const photo of items) {
                if (!photo.blob)
                    continue;
                change(latest.current.map(p => p.id === photo.id ? { ...p, state: "uploading", error: undefined } : p));
                try {
                    const data = new FormData();
                    data.append("file", photo.blob, "photo.webp");
                    data.append("media_id", photo.id);
                    const r = await fetch(`/api/post-ad/sessions/${sessionId}/media`, { method: "POST", body: data });
                    const result = await r.json();
                    if (!r.ok)
                        throw new Error(result.error);
                    change(latest.current.map(p => p.id === photo.id ? { ...p, state: "ready" } : p));
                }
                catch (e) {
                    change(latest.current.map(p => p.id === photo.id ? { ...p, state: "failed", error: e instanceof Error ? e.message : "Upload failed" } : p));
                }
            }
            await onReady();
        }
        catch {
            setError("Could not refresh photos. Retry or refresh this page.");
        }
        finally {
            working.current = false;
            setBusy(false);
        }
    }
    return <section className="space-y-4" aria-labelledby="photo-heading">
  <h2 id="photo-heading">Photos</h2><p className={styles.muted}>Add up to 8 photos. Upload at least one photo before continuing.</p>
  <div className={styles.drop}><Camera aria-hidden="true" size={36}/><strong>Show it from every angle</strong><p>Front, back, screen on, sides and any wear.</p><button type="button" className={styles.button} disabled={disabled || busy || photos.length >= 8} aria-controls="mobile-photo-files" onClick={() => fileInput.current?.click()}><Images size={20} aria-hidden="true"/>Add photos</button><p className={styles.muted}>JPEG, PNG or WebP · up to 20 MB each</p>
  <input id="mobile-photo-files" tabIndex={-1} ref={fileInput} aria-label="Choose photo files" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled || busy || photos.length >= 8} style={{ position: "absolute", width: 1, height: 1, minHeight: 1, padding: 0, border: 0, clipPath: "inset(50%)" }} onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length || working.current)
                return;
            if (photos.length + files.length > 8) {
                setError("Choose at most 8 photos.");
                return;
            }
            working.current = true;
            setBusy(true);
            setError("");
            const added: PostingPhoto[] = [];
            try {
                for (const file of files)
                    added.push({ id: crypto.randomUUID(), state: "pending", blob: await compressPostingPhoto(file) });
                change([...latest.current, ...added]);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Photo processing failed");
            }
            finally {
                working.current = false;
                setBusy(false);
            }
        }}/></div>
  <p className={styles.muted}>Hide IMEI and serial numbers. Cover names and addresses on bills.</p>
  <ul className={styles.photoGrid}>{photos.map((p, i) => <li key={p.id}>
   <PostingPhotoImage photo={p} alt={`Phone photo ${i + 1}`}/>
   <p role="status">{i === 0 ? "Cover · " : ""}{t(p.state === "ready" ? "Ready" : p.state === "failed" ? "Upload failed" : p.state === "uploading" ? "Uploading…" : "Ready to upload")}</p>
   {p.error && <p className={styles.error}>{phoneErrorText(locale, p.error)}</p>}
   <button type="button" aria-label={`Remove photo ${i + 1}`} disabled={disabled || busy} onClick={async () => {
                if (working.current)
                    return;
                working.current = true;
                setBusy(true);
                try {
                    const r = await fetch(`/api/post-ad/sessions/${sessionId}/media`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ media_id: p.id }) });
                    if (r.ok)
                        change(latest.current.filter(x => x.id !== p.id));
                    else
                        setError("Could not remove photo. Retry.");
                }
                catch {
                    setError("Could not remove photo. Retry.");
                }
                finally {
                    working.current = false;
                    setBusy(false);
                }
            }}>{t("Remove photo")}</button>
  </li>)}</ul>
  {photos.some(p => p.state !== "ready" && p.blob) && <button type="button" disabled={disabled || busy} className={styles.primary} onClick={() => void upload(photos.filter(p => p.state !== "ready"))}>{t(busy ? "Uploading…" : "Upload / retry photos")}</button>}
  {photos.some(p => p.state !== "ready" && !p.blob) && <p className={styles.muted}>An interrupted photo needs to be removed and added again.</p>}
  {busy && <p role="status">Preparing your photos…</p>}
  {error && <p role="alert" className={styles.error}><CircleAlert aria-hidden="true"/><span>{phoneErrorText(locale, error)}</span></p>}
 </section>;
}
