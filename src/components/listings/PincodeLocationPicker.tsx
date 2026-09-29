"use client";

import React, { useState, useCallback } from "react";
import type { City, Locality, PincodeLookupResult } from "@/types/listing";

interface PincodeLocationPickerProps {
  initialPinCode?: string | null;
  initialCityId?: string | null;
  initialLocalityId?: string | null;
  initialLandmark?: string | null;
  cities: City[];
  localities: Locality[];
}

export default function PincodeLocationPicker({
  initialPinCode = "",
  initialCityId = "",
  initialLocalityId = "",
  initialLandmark = "",
  cities,
  localities,
}: PincodeLocationPickerProps) {
  const [pinCode, setPinCode] = useState<string>(initialPinCode || "");
  const [selectedCityId, setSelectedCityId] = useState<string>(initialCityId || "");
  const [selectedLocalityId, setSelectedLocalityId] = useState<string>(initialLocalityId || "");
  const [landmark, setLandmark] = useState<string>(initialLandmark || "");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [derivedLocationText, setDerivedLocationText] = useState<string | null>(null);
  const [availableLocalities, setAvailableLocalities] = useState<Array<{ id: string; name: string }>>(() => {
    if (initialCityId) {
      return localities.filter((loc) => loc.city_id === initialCityId);
    }
    return [];
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performLookup = useCallback(
    async (pin: string) => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/location/pincode/${pin}`);
        const data: PincodeLookupResult = await res.json();

        if (data.success) {
          setErrorMsg(null);
          setDerivedLocationText(`${data.city}, ${data.state}`);

          if (data.city_id) {
            setSelectedCityId(data.city_id);
          } else {
            // Find existing city by name match
            const match = cities.find(
              (c) => c.name.toLowerCase() === data.city.toLowerCase() || c.name.toLowerCase() === data.district.toLowerCase()
            );
            if (match) {
              setSelectedCityId(match.id);
            } else if (cities.length > 0) {
              setSelectedCityId(cities[0].id);
            }
          }

          if (data.localities && data.localities.length > 0) {
            const locList = data.localities.map((l) => ({ id: l.id, name: l.name }));
            setAvailableLocalities(locList);

            if (locList.length === 1) {
              setSelectedLocalityId(locList[0].id);
            } else if (!locList.some((l) => l.id === selectedLocalityId)) {
              setSelectedLocalityId("");
            }
          } else {
            // Fallback to city's existing localities if database didn't have postal locality links
            const fallbackLocs = localities.filter((l) => l.city_id === data.city_id);
            setAvailableLocalities(fallbackLocs);
          }
        } else {
          setDerivedLocationText(null);
          if (data.error === "PINCODE_NOT_FOUND") {
            setErrorMsg("PIN code not found in location database. Please verify your 6-digit PIN.");
          } else {
            setErrorMsg(data.message || "Failed to lookup PIN code");
          }
        }
      } catch (err: unknown) {
        console.error("PIN lookup request error:", err);
        setErrorMsg("Network error checking PIN code. You can retry or select location manually below.");
      } finally {
        setIsLoading(false);
      }
    },
    [cities, localities, selectedLocalityId]
  );

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPinCode(val);

    if (val.length < 6) {
      setDerivedLocationText(null);
      setErrorMsg(null);
      if (val.length === 0) {
        setSelectedLocalityId("");
      }
    } else if (val.length === 6) {
      performLookup(val);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden inputs to pass state to server action HTML form submit */}
      <input type="hidden" name="pin_code" value={pinCode} />
      <input type="hidden" name="city_id" value={selectedCityId} />
      <input type="hidden" name="locality_id" value={selectedLocalityId} />
      <input type="hidden" name="landmark" value={landmark} />

      <div className="rounded-lg border border-gray-200 bg-emerald-50/50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-emerald-900">Where is the item?</h3>

        {/* PIN Code */}
        <div>
          <label htmlFor="pincode_picker_input" className="block text-xs font-medium text-gray-700">
            PIN Code *
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="pincode_picker_input"
              type="text"
              inputMode="numeric"
              pattern="^\d{6}$"
              maxLength={6}
              value={pinCode}
              onChange={handlePinChange}
              placeholder="e.g. 560034"
              className="block w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {isLoading && (
              <span className="text-xs text-emerald-600 animate-pulse font-medium">
                Searching location...
              </span>
            )}
            {pinCode.length === 6 && !isLoading && !errorMsg && derivedLocationText && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>
          {errorMsg && <p className="mt-1 text-xs text-red-600 font-medium">{errorMsg}</p>}
        </div>

        {/* Derived State & City Header */}
        {derivedLocationText && (
          <div className="text-sm font-semibold text-gray-900 bg-white px-3 py-2 rounded border border-emerald-200">
            {derivedLocationText}
          </div>
        )}

        {/* Area / Locality Dropdown */}
        <div>
          <label htmlFor="locality_picker_select" className="block text-xs font-medium text-gray-700">
            Area / Locality *
          </label>
          <select
            id="locality_picker_select"
            value={selectedLocalityId}
            onChange={(e) => setSelectedLocalityId(e.target.value)}
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100"
          >
            <option value="">
              {availableLocalities.length > 0 ? "-- Select Koramangala, Indiranagar, etc. --" : "-- Enter 6-digit PIN code first --"}
            </option>
            {availableLocalities.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* City fallback (shown if no city derived automatically or for manual selection) */}
        {!derivedLocationText && (
          <div className="pt-2 border-t border-gray-200">
            <label htmlFor="city_picker_select" className="block text-xs font-semibold text-gray-700">
              City *
            </label>
            <select
              id="city_picker_select"
              value={selectedCityId}
              onChange={(e) => {
                const newCityId = e.target.value;
                setSelectedCityId(newCityId);
                const filtered = localities.filter((loc) => loc.city_id === newCityId);
                setAvailableLocalities(filtered);
                setSelectedLocalityId("");
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select City...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.state}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Landmark (Optional) */}
        <div>
          <label htmlFor="landmark_picker_input" className="block text-xs font-medium text-gray-700">
            Landmark (optional)
          </label>
          <input
            id="landmark_picker_input"
            type="text"
            maxLength={200}
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Near Nexus Mall / Opposite Metro Station"
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Privacy reassurance footnote */}
        <div className="pt-2 border-t border-emerald-100/60 text-xs text-gray-500 space-y-0.5">
          <p className="font-medium text-gray-600">🔒 Privacy protection:</p>
          <p>Only your approximate area is shown publicly on FairSwap.</p>
          <p>You can decide the exact pickup location later with the buyer in chat.</p>
        </div>
      </div>
    </div>
  );
}
