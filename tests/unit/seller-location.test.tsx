import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SellerProfileHeader, formatPublicLocation } from "@/components/seller/SellerProfileHeader";

const profile = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  display_name: "Asha Rao",
  avatar_url: null,
  bio: null,
  created_at: "2026-10-01T00:00:00Z",
};

describe("seller public location", () => {
  it("formats locality and district only", () => {
    expect(formatPublicLocation({ locality: "Koramangala", district: "Bengaluru Urban" })).toBe(
      "Koramangala, Bengaluru Urban"
    );
    expect(formatPublicLocation({ locality: "Jaipur", district: "Jaipur" })).toBe("Jaipur");
    expect(formatPublicLocation({ locality: null, district: "Jaipur" })).toBe("Jaipur");
    expect(formatPublicLocation(null)).toBeNull();
    expect(formatPublicLocation({ locality: " ", district: null })).toBeNull();
  });

  it("renders the location when present and nothing when absent", () => {
    const { rerender } = render(
      <SellerProfileHeader profile={profile} location={{ locality: "Koramangala", district: "Bengaluru Urban" }} />
    );
    expect(screen.getByText("Koramangala, Bengaluru Urban")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b\d{6}\b/);

    rerender(<SellerProfileHeader profile={profile} location={null} />);
    expect(screen.queryByText(/Koramangala/)).toBeNull();
  });
});
