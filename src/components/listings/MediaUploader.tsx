"use client";

import React, { useState } from "react";
import { ListingMedia } from "@/types/listing";
import { reorderMediaAction, setCoverPhotoAction } from "@/app/account/listings/actions";

interface MediaUploaderProps {
  listingId: string;
  initialMedia: ListingMedia[];
  coverPhotoId?: string | null;
  isReadOnly?: boolean;
}

export default function MediaUploader({
  listingId,
  initialMedia,
  coverPhotoId,
  isReadOnly = false,
}: MediaUploaderProps) {
  const [mediaList, setMediaList] = useState<ListingMedia[]>(initialMedia);
  const [activeCoverId, setActiveCoverId] = useState<string | null>(coverPhotoId || null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaList.length >= 8) {
      setErrorMessage("Maximum 8 photos allowed per listing.");
      return;
    }

    setErrorMessage(null);
    setUploading(true);

    try {
      // Upload files sequentially (one request per file as designed)
      for (let i = 0; i < files.length; i++) {
        if (mediaList.length + i >= 8) {
          setErrorMessage("Reached 8 photo limit. Some photos were not uploaded.");
          break;
        }

        const file = files[i];

        if (file.size > 5 * 1024 * 1024) {
          setErrorMessage(`File "${file.name}" exceeds 5 MB limit.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        // Optimistic item
        const tempId = `temp-${Date.now()}-${i}`;
        const tempItem: ListingMedia = {
          id: tempId,
          listing_id: listingId,
          uploader_id: "",
          original_storage_path: null,
          thumbnail_storage_path: null,
          medium_storage_path: null,
          large_storage_path: null,
          original_filename: file.name,
          content_type: file.type,
          file_size_bytes: file.size,
          width: null,
          height: null,
          display_order: mediaList.length + i,
          processing_status: "uploading",
          processing_error: null,
          created_at: new Date().toISOString(),
        };

        setMediaList((prev) => [...prev, tempItem]);

        const res = await fetch(`/api/listings/${listingId}/media`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setMediaList((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    processing_status: "failed",
                    processing_error: data.error || "Upload failed",
                  }
                : item
            )
          );
          setErrorMessage(data.error || "Failed to upload photo.");
        } else {
          setMediaList((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    id: data.id,
                    processing_status: data.processing_status,
                    display_order: data.display_order,
                  }
                : item
            )
          );

          if (!activeCoverId) {
            setActiveCoverId(data.id);
          }
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error uploading photos");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (isReadOnly) return;
    try {
      const res = await fetch(`/api/listings/${listingId}/media/${mediaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
        if (activeCoverId === mediaId) {
          const remaining = mediaList.filter((m) => m.id !== mediaId);
          setActiveCoverId(remaining.length > 0 ? remaining[0].id : null);
        }
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to delete photo");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error deleting photo");
    }
  };

  const handleSetCover = async (mediaId: string) => {
    if (isReadOnly) return;
    setActiveCoverId(mediaId);
    await setCoverPhotoAction(listingId, mediaId);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (isReadOnly) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaList.length) return;

    const updated = [...mediaList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reordered = updated.map((item, idx) => ({
      ...item,
      display_order: idx,
    }));

    setMediaList(reordered);
    await reorderMediaAction(
      listingId,
      reordered.map((item) => ({ id: item.id, display_order: item.display_order }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Photographs ({mediaList.length}/8)</h3>
          <p className="text-xs text-gray-500">
            Upload up to 8 images. JPEG, PNG, or WebP. Max 5 MB each. First photo is used as cover by default.
          </p>
        </div>
        {!isReadOnly && mediaList.length < 8 && (
          <label className="cursor-pointer rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500">
            {uploading ? "Uploading..." : "+ Add Photos"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          {errorMessage}
        </div>
      )}

      {mediaList.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
          No photos uploaded yet. At least one ready photo is required to submit for review.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {mediaList.map((media, index) => {
            const isCover = activeCoverId === media.id;
            const isTemp = media.id.startsWith("temp-");

            return (
              <div
                key={media.id}
                className={`relative overflow-hidden rounded-lg border bg-gray-50 p-2 ${
                  isCover ? "border-emerald-500 ring-2 ring-emerald-500" : "border-gray-200"
                }`}
              >
                <div className="aspect-square w-full relative flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                  {media.processing_status === "ready" && !isTemp ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/listings/${listingId}/media/${media.id}/thumb`}
                      alt={media.original_filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="p-2 text-center text-xs">
                      {media.processing_status === "uploading" && (
                        <span className="text-amber-600 font-medium">Uploading...</span>
                      )}
                      {media.processing_status === "processing" && (
                        <span className="text-blue-600 font-medium">Processing...</span>
                      )}
                      {media.processing_status === "failed" && (
                        <span className="text-red-600 font-medium">
                          Failed: {media.processing_error || "Error"}
                        </span>
                      )}
                    </div>
                  )}

                  {isCover && (
                    <span className="absolute top-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                      Cover
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="truncate text-gray-500 text-[11px]" title={media.original_filename}>
                    {media.original_filename}
                  </div>
                </div>

                {!isReadOnly && !isTemp && (
                  <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-1.5 text-[11px]">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, "up")}
                        className="rounded p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                        title="Move left/up"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={index === mediaList.length - 1}
                        onClick={() => handleMove(index, "down")}
                        className="rounded p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                        title="Move right/down"
                      >
                        →
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isCover && media.processing_status === "ready" && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(media.id)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(media.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
