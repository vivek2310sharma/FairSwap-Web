import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListingThumbnail } from "@/app/account/listings/ListingThumbnail";

describe("ListingThumbnail", () => {
  const listingId = "123e4567-e89b-12d3-a456-426614174000";
  const coverPhotoId = "98765432-b987-12d3-a456-426614174000";
  const title = "Vintage Leather Jacket";

  it("renders image thumbnail when cover_photo_id is provided", () => {
    render(
      <ListingThumbnail
        listingId={listingId}
        coverPhotoId={coverPhotoId}
        title={title}
      />
    );

    const img = screen.getByRole("img", { name: `Thumbnail for ${title}` });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain(
      `/api/listings/${listingId}/media/${coverPhotoId}/thumb`
    );
  });

  it("renders placeholder when cover_photo_id is null", () => {
    render(
      <ListingThumbnail
        listingId={listingId}
        coverPhotoId={null}
        title={title}
      />
    );

    expect(
      screen.queryByRole("img", { name: `Thumbnail for ${title}` })
    ).toBeNull();

    const placeholder = screen.getByRole("img", {
      name: `Placeholder for ${title}`,
    });
    expect(placeholder).toBeInTheDocument();
  });

  it("renders placeholder when image fails to load (onError fires)", () => {
    render(
      <ListingThumbnail
        listingId={listingId}
        coverPhotoId={coverPhotoId}
        title={title}
      />
    );

    const img = screen.getByRole("img", { name: `Thumbnail for ${title}` });
    expect(img).toBeInTheDocument();

    // Trigger image load error
    fireEvent.error(img);

    expect(
      screen.queryByRole("img", { name: `Thumbnail for ${title}` })
    ).toBeNull();

    const placeholder = screen.getByRole("img", {
      name: `Placeholder for ${title}`,
    });
    expect(placeholder).toBeInTheDocument();
  });
});
