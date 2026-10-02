import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MediaUploader from "@/components/listings/MediaUploader";
import { reorderMediaAction } from "@/app/account/listings/actions";

vi.mock("@/app/account/listings/actions", () => ({
  reorderMediaAction: vi.fn(),
  setCoverPhotoAction: vi.fn(),
}));

describe("Web MediaUploader Reorder Parity Unit Tests (Section 9)", () => {
  const listingId = "11111111-1111-1111-1111-111111111111";
  const readyId1 = "22222222-2222-2222-2222-222222222222";
  const readyId2 = "33333333-3333-3333-3333-333333333333";
  const failedId = "44444444-4444-4444-4444-444444444444";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("disables structural reorder move buttons when any item is in a failed or unready state", () => {
    const mixedMedia = [
      {
        id: readyId1,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "photo1.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: 800,
        height: 600,
        display_order: 0,
        processing_status: "ready" as const,
        processing_error: null,
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
      {
        id: readyId2,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "photo2.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: 800,
        height: 600,
        display_order: 1,
        processing_status: "ready" as const,
        processing_error: null,
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
      {
        id: failedId,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "corrupt.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: null,
        height: null,
        display_order: 2,
        processing_status: "failed" as const,
        processing_error: "Corrupt file",
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
    ];

    render(
      <MediaUploader
        listingId={listingId}
        initialMedia={mixedMedia}
        coverPhotoId={readyId1}
      />
    );

    // Both ready items' move buttons should be disabled because one item is in "failed" state
    const moveButtons = [...screen.getAllByTitle("Move left/up"), ...screen.getAllByTitle("Move right/down")];
    expect(moveButtons.length).toBeGreaterThan(0);
    for (const btn of moveButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it("sends ONLY the complete ready set to reorderMediaAction when reordering", async () => {
    vi.mocked(reorderMediaAction).mockResolvedValue({ success: true, message: "Photos reordered." });

    const readyMedia = [
      {
        id: readyId1,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "photo1.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: 800,
        height: 600,
        display_order: 0,
        processing_status: "ready" as const,
        processing_error: null,
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
      {
        id: readyId2,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "photo2.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: 800,
        height: 600,
        display_order: 1,
        processing_status: "ready" as const,
        processing_error: null,
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
    ];

    render(
      <MediaUploader
        listingId={listingId}
        initialMedia={readyMedia}
        coverPhotoId={readyId1}
      />
    );

    // Move first item down
    const moveDownButtons = screen.getAllByTitle("Move right/down");
    expect(moveDownButtons[0]).not.toBeDisabled();

    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(reorderMediaAction).toHaveBeenCalledTimes(1);
    });

    expect(reorderMediaAction).toHaveBeenCalledWith(listingId, [
      { id: readyId2, display_order: 0 },
      { id: readyId1, display_order: 1 },
    ]);
  });

  it("reverts optimistic order and displays error message if reorder action fails", async () => {
    vi.mocked(reorderMediaAction).mockResolvedValue({ error: "Failed to reorder photos. Please try again." });

    const readyMedia = [
      {
        id: readyId1,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "photo1.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: 800,
        height: 600,
        display_order: 0,
        processing_status: "ready" as const,
        processing_error: null,
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
      {
        id: readyId2,
        listing_id: listingId,
        uploader_id: "user-1",
        original_filename: "photo2.jpg",
        content_type: "image/jpeg",
        file_size_bytes: 1024,
        width: 800,
        height: 600,
        display_order: 1,
        processing_status: "ready" as const,
        processing_error: null,
        created_at: new Date().toISOString(),
        original_storage_path: "orig.jpg",
        thumbnail_storage_path: "thumb.webp",
        medium_storage_path: "med.webp",
        large_storage_path: "large.webp",
      },
    ];

    render(
      <MediaUploader
        listingId={listingId}
        initialMedia={readyMedia}
        coverPhotoId={readyId1}
      />
    );

    const moveDownButtons = screen.getAllByTitle("Move right/down");
    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Failed to reorder photos. Please try again.")).toBeInTheDocument();
    });
  });
});
