"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { PostingPhoto } from "../PreListingMediaUploader";
const placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3C/svg%3E";
/** Only sanitized retry blobs from the existing compressor are shown locally. */
export default function PostingPhotoImage({ photo, alt = "Listing photo" }: {
    photo: PostingPhoto;
    alt?: string;
}) {
    const image = useRef<HTMLImageElement>(null);
    useEffect(() => { if (photo.url || !photo.blob)
        return; const url = URL.createObjectURL(photo.blob); if (image.current)
        image.current.src = url; return () => URL.revokeObjectURL(url); }, [photo.blob, photo.url]);
    return <Image ref={image} src={photo.url || placeholder} alt={alt} width={480} height={480} unoptimized/>;
}
