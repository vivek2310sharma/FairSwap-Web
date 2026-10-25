"use client";

import { useEffect, useMemo, useState } from "react";
import type { PincodeLocalityInfo, PincodeLookupResult } from "@/types/listing";

interface PincodeLocalityProps {
  initialPin: string;
  initialLocalityId: string;
  initialCityId: string;
  disabled?: boolean;
  /** Required for onboarding; optional for legacy users who only edit public fields. */
  required?: boolean;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500 disabled:opacity-60";

/**
 * PIN → locality/district picker. Only identifiers returned by the official postal lookup
 * are submitted (pinCode, localityId, cityId); the server re-validates all of them.
 * State is derived and read-only. The PIN is private and never displayed publicly.
 */
export function PincodeLocality({ initialPin, initialLocalityId, initialCityId, disabled, required = true }: PincodeLocalityProps) {
  const [pin, setPin] = useState(initialPin);
  const [lookup, setLookup] = useState<{ pin: string; result: PincodeLookupResult } | null>(null);
  const [localityId, setLocalityId] = useState(initialLocalityId);
  const [cityId, setCityId] = useState(initialCityId);

  const pinReady = /^[1-9][0-9]{5}$/.test(pin);

  useEffect(() => {
    if (!pinReady) return;
    const controller = new AbortController();
    fetch(`/api/location/pincode/${pin}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<PincodeLookupResult>)
      .then((result) => setLookup({ pin, result }))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setLookup({
          pin,
          result: { success: false, error: "FETCH_ERROR", message: "Could not look up this PIN code. Try again." },
        });
      });
    return () => controller.abort();
  }, [pin, pinReady]);

  const result = pinReady && lookup?.pin === pin ? lookup.result : null;
  const loading = pinReady && lookup?.pin !== pin;
  const success = result?.success ? result : null;
  const failure = result && !result.success ? result : null;
  const multiDistrict = (success?.districts.length ?? 0) > 1;

  const localities: PincodeLocalityInfo[] = useMemo(() => {
    if (!success) return [];
    return multiDistrict && cityId ? success.localities.filter((l) => l.city_id === cityId) : success.localities;
  }, [success, multiDistrict, cityId]);

  function onPinChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setPin(digits);
    setLocalityId("");
    setCityId("");
  }

  const effectiveLocalityId = localities.some((l) => l.id === localityId) ? localityId : "";
  const effectiveCityId = multiDistrict
    ? cityId
    : (success?.localities.find((l) => l.id === effectiveLocalityId)?.city_id ?? success?.districts[0]?.city_id ?? "");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pinCode" className="block text-sm font-medium text-foreground">
          PIN code {required ? "*" : ""}
        </label>
        <input
          id="pinCode"
          name="pinCode"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[1-9][0-9]{5}"
          maxLength={6}
          required={required}
          value={pin}
          disabled={disabled}
          onChange={(e) => onPinChange(e.target.value)}
          className={inputClass}
          aria-describedby="pin-help"
        />
        <p id="pin-help" className="mt-1 text-xs text-muted">
          6 digits. Used only to set your area. Your PIN code is never shown to other members.
        </p>
        {loading && <p className="mt-1 text-xs text-muted">Looking up PIN code…</p>}
        {failure && (
          <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">
            {failure.message}
          </p>
        )}
      </div>

      {success && (
        <>
          {multiDistrict && (
            <div>
              <label htmlFor="districtSelect" className="block text-sm font-medium text-foreground">
                District {required ? "*" : ""}
              </label>
              <select
                id="districtSelect"
                required={required}
                value={cityId}
                disabled={disabled}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setLocalityId("");
                }}
                className={inputClass}
              >
                <option value="">Select your district</option>
                {success.districts.map((d) => (
                  <option key={d.city_id ?? d.name} value={d.city_id ?? ""} disabled={!d.city_id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">This PIN code covers more than one district.</p>
            </div>
          )}

          <div>
            <label htmlFor="localitySelect" className="block text-sm font-medium text-foreground">
              Area / Locality {required ? "*" : ""}
            </label>
            <select
              id="localitySelect"
              required={required}
              value={effectiveLocalityId}
              disabled={disabled || (multiDistrict && !cityId)}
              onChange={(e) => setLocalityId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select your area</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {!multiDistrict && success.district && (
            <div>
              <span className="block text-sm font-medium text-foreground">District</span>
              <p className="mt-1 text-sm text-foreground">{success.district}</p>
            </div>
          )}

          <div>
            <span className="block text-sm font-medium text-foreground">State</span>
            <p className="mt-1 text-sm text-foreground">{success.state}</p>
            <p className="mt-1 text-xs text-muted">Set automatically from your PIN code.</p>
          </div>
        </>
      )}

      <input type="hidden" name="localityId" value={effectiveLocalityId} />
      <input type="hidden" name="cityId" value={effectiveCityId} />
    </div>
  );
}
