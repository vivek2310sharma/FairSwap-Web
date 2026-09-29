import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PincodeLocationPicker from "@/components/listings/PincodeLocationPicker";
import type { City, Locality } from "@/types/listing";

const mockCities: City[] = [
  {
    id: "city-1",
    name: "Bengaluru",
    state: "Karnataka",
    slug: "bengaluru",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const mockLocalities: Locality[] = [
  {
    id: "loc-1",
    city_id: "city-1",
    name: "Koramangala",
    slug: "koramangala",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

describe("PincodeLocationPicker component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders initial state with PIN input and landmark field", () => {
    render(
      <PincodeLocationPicker
        cities={mockCities}
        localities={mockLocalities}
        initialPinCode="560034"
      />
    );

    const pinInput = screen.getByLabelText(/PIN Code/i);
    expect(pinInput).toBeInTheDocument();
    expect(pinInput).toHaveValue("560034");

    const landmarkInput = screen.getByLabelText(/Landmark/i);
    expect(landmarkInput).toBeInTheDocument();
  });

  it("triggers PIN lookup API when 6 digits are typed", async () => {
    const mockLookupResponse = {
      success: true,
      pincode: "560034",
      state: "Karnataka",
      district: "Bengaluru Urban",
      city: "Bengaluru",
      city_id: "city-1",
      localities: [
        {
          id: "loc-1",
          name: "Koramangala",
          slug: "koramangala",
          city_id: "city-1",
          city_name: "Bengaluru",
          state: "Karnataka",
          district: "Bengaluru Urban",
        },
      ],
      postal_offices: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mockLookupResponse,
    } as Response);

    render(<PincodeLocationPicker cities={mockCities} localities={mockLocalities} />);

    const pinInput = screen.getByLabelText(/PIN Code/i);
    fireEvent.change(pinInput, { target: { value: "560034" } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/location/pincode/560034");
    });

    await waitFor(() => {
      expect(screen.getByText("Bengaluru, Karnataka")).toBeInTheDocument();
    });
  });

  it("displays error message if PIN code is not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: false,
        error: "PINCODE_NOT_FOUND",
        message: "PIN code not found",
      }),
    } as Response);

    render(<PincodeLocationPicker cities={mockCities} localities={mockLocalities} />);

    const pinInput = screen.getByLabelText(/PIN Code/i);
    fireEvent.change(pinInput, { target: { value: "999999" } });

    await waitFor(() => {
      expect(
        screen.getByText(/PIN code not found/i)
      ).toBeInTheDocument();
    });

    // Check Retry button is displayed and triggers lookup when clicked
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/location/pincode/999999");
    });
  });

  it("clears stale locality when PIN code changes", async () => {
    const mockLookup560034 = {
      success: true,
      pincode: "560034",
      state: "Karnataka",
      district: "Bengaluru Urban",
      city: "Bengaluru",
      city_id: "city-1",
      localities: [
        {
          id: "loc-1",
          name: "Koramangala",
          slug: "koramangala",
          city_id: "city-1",
          city_name: "Bengaluru",
          state: "Karnataka",
          district: "Bengaluru Urban",
        },
      ],
      postal_offices: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mockLookup560034,
    } as Response);

    render(
      <PincodeLocationPicker
        cities={mockCities}
        localities={mockLocalities}
        initialPinCode="560034"
        initialLocalityId="loc-1"
        initialCityId="city-1"
      />
    );

    const localitySelect = screen.getByLabelText(/Area \/ Locality/i);
    expect(localitySelect).toHaveValue("loc-1");

    // Change PIN to 5 digits (partial edit)
    const pinInput = screen.getByLabelText(/PIN Code/i);
    fireEvent.change(pinInput, { target: { value: "56003" } });

    // Locality selection should be cleared immediately
    expect(localitySelect).toHaveValue("");
  });

  it("updates landmark input correctly", () => {
    render(
      <PincodeLocationPicker
        cities={mockCities}
        localities={mockLocalities}
        initialLandmark="Near Metro"
      />
    );

    const landmarkInput = screen.getByLabelText(/Landmark/i);
    expect(landmarkInput).toHaveValue("Near Metro");

    fireEvent.change(landmarkInput, { target: { value: "Opposite City Mall" } });
    expect(landmarkInput).toHaveValue("Opposite City Mall");
  });
});
