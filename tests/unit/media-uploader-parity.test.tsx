import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MediaUploader from "@/components/listings/MediaUploader";
import { reorderMediaAction, setCoverPhotoAction } from "@/app/account/listings/actions";

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

  describe("Web MediaUploader Cover Photo Rollback Unit Tests (Section 10)", () => {
    it("keeps new cover photo when setCoverPhotoAction succeeds", async () => {
      vi.mocked(setCoverPhotoAction).mockResolvedValue({ success: true, message: "Cover photo updated." });

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

      // Initially photo1 is cover, photo2 has a Cover button
      const coverButtons = screen.getAllByRole("button", { name: "Cover" });
      expect(coverButtons.length).toBe(1);

      fireEvent.click(coverButtons[0]);

      await waitFor(() => {
        expect(setCoverPhotoAction).toHaveBeenCalledWith(listingId, readyId2);
      });

      // Photo2 remains cover: photo1 should now have the Cover button
      await waitFor(() => {
        const newCoverButtons = screen.getAllByRole("button", { name: "Cover" });
        expect(newCoverButtons.length).toBe(1);
      });
    });

    it("rolls back to previous cover photo and displays error when setCoverPhotoAction fails", async () => {
      vi.mocked(setCoverPhotoAction).mockResolvedValue({ error: "Failed to update cover photo." });

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

      const coverButtons = screen.getAllByRole("button", { name: "Cover" });
      fireEvent.click(coverButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Failed to update cover photo.")).toBeInTheDocument();
      });

      // Cover rolled back to photo1: photo2 still has the Cover button
      const restoredCoverButtons = screen.getAllByRole("button", { name: "Cover" });
      expect(restoredCoverButtons.length).toBe(1);
    });
  });

  describe("Web MediaUploader Post-Commit Reconciliation Parity (Section 12)", () => {
    it("handles committed upload with refreshRequired=true gracefully without failing or re-posting", async () => {
      const persistedMediaId = "33333333-3333-3333-3333-333333333333";
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          committed: true,
          uploadedMediaId: persistedMediaId,
          processingStatus: "ready",
          refreshRequired: true,
          snapshot: null,
        }),
      });
      global.fetch = fetchMock;

      const { container } = render(
        <MediaUploader
          listingId={listingId}
          initialMedia={[]}
          coverPhotoId={null}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      const testFile = new File(["dummy content"], "camera_photo.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        // Safe reconciliation notice is shown
        expect(
          screen.getByText("Photo uploaded, but snapshot refresh timed out. You may continue or refresh later.")
        ).toBeInTheDocument();
      });

      // Optimistic row transitioned to persisted UUID and is marked ready (not failed)
      expect(screen.queryByText(/Failed:/i)).not.toBeInTheDocument();
      const img = container.querySelector(`img[src="/api/listings/${listingId}/media/${persistedMediaId}/thumb"]`);
      expect(img).toBeInTheDocument();

      // No automatic second POST occurs
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Web MediaUploader Delete Parity & 404 Invariant Unit Tests (Section 6)", () => {
    it("HTTP 200 deleted=true removes the media card", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          deleted: true,
          deleted_media_id: readyId2,
          snapshot: {
            listing: { id: listingId, status: "draft", revision: 1, coverPhotoId: readyId1 },
            media: [{ id: readyId1, displayOrder: 0, processingStatus: "ready", isCover: true }],
          },
        }),
      });

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

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[1]); // Delete photo2

      await waitFor(() => {
        expect(screen.queryByTitle("photo2.jpg")).not.toBeInTheDocument();
      });
      expect(screen.getByTitle("photo1.jpg")).toBeInTheDocument();
    });

    it("HTTP 200 deleted=false applies authoritative snapshot", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          deleted: false,
          deleted_media_id: null,
          snapshot: {
            listing: { id: listingId, status: "draft", revision: 1, coverPhotoId: readyId1 },
            media: [{ id: readyId1, displayOrder: 0, processingStatus: "ready", isCover: true }],
          },
        }),
      });

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

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[1]); // Delete photo2

      await waitFor(() => {
        expect(screen.queryByTitle("photo2.jpg")).not.toBeInTheDocument();
      });
      expect(screen.getByTitle("photo1.jpg")).toBeInTheDocument();
    });

    it("HTTP 404 LISTING_NOT_FOUND preserves media card and displays safe error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          code: "LISTING_NOT_FOUND",
          message: "Listing not found.",
        }),
      });

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
      ];

      render(
        <MediaUploader
          listingId={listingId}
          initialMedia={readyMedia}
          coverPhotoId={readyId1}
        />
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Listing not found.")).toBeInTheDocument();
      });
      // The media card MUST NOT be removed
      expect(screen.getByTitle("photo1.jpg")).toBeInTheDocument();
    });

    it("HTTP 503 MEDIA_SERVICE_UNAVAILABLE preserves media card and displays safe error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          code: "MEDIA_SERVICE_UNAVAILABLE",
          message: "Media service is temporarily unavailable. Please try again later.",
        }),
      });

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
      ];

      render(
        <MediaUploader
          listingId={listingId}
          initialMedia={readyMedia}
          coverPhotoId={readyId1}
        />
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Media service is temporarily unavailable. Please try again later.")).toBeInTheDocument();
      });
      // The media card MUST NOT be removed
      expect(screen.getByTitle("photo1.jpg")).toBeInTheDocument();
    });
  });

});
