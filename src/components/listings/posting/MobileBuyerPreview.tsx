"use client";
import { useState } from "react";
import { Images, MapPin } from "lucide-react";
import type { PostingPhoto } from "../PreListingMediaUploader";
import PostingPhotoImage from "./PostingPhotoImage";
import styles from "./Posting.module.css";
export default function MobileBuyerPreview({ title, price, description, area, facts, photos, emptyTitle = "Your phone’s next chapter" }: {
    emptyTitle?: string;
    title: string;
    price: string;
    description: string;
    area: string;
    facts: string[];
    photos: PostingPhoto[];
}) {
    const [selected, setSelected] = useState("");
    const photo = photos.find(p => p.id === selected) ?? photos[0];
    return <aside className={styles.preview} aria-label="Buyer preview" tabIndex={0}><div className={styles.eyebrow}>BUYER PREVIEW</div>{photo ? <><PostingPhotoImage key={photo.id} photo={photo}/><p className={styles.muted}>{photo.state === "ready" ? "Ready" : photo.state === "failed" ? "Upload needs retry" : photo.state === "pending" ? "Ready to upload" : "Uploading…"}</p><div className={styles.thumbs} role="group" aria-label="Preview photos">{photos.map((p, i) => <button type="button" key={p.id} aria-label={`Preview photo ${i + 1}`} aria-pressed={photo.id === p.id} onClick={() => setSelected(p.id)}><PostingPhotoImage photo={p} alt=""/></button>)}</div></> : <div className={styles.placeholder}><Images aria-hidden="true"/><span>Your photos will appear here</span></div>}<div className={styles.price}>{price}</div><h2>{title || emptyTitle}</h2><div className={styles.facts}>{facts.filter(Boolean).map(f => <span key={f}>{f}</span>)}</div><p>{description || "A few honest details help the right buyer find you."}</p><p className="flex items-start gap-2"><MapPin aria-hidden="true" size={18}/>{area || "Approximate area only"}</p><p className={styles.muted}>Seller-declared details. Meet and inspect before paying.</p></aside>;
}
