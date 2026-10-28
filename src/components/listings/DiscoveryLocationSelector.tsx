"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { areaResponseSchema, LOCATION_PREFERENCE_KEY, locationPreferenceSchema, type PublicArea } from "@/lib/location/discovery";

export function rememberPublicArea(area: PublicArea | null) {
  try {
    if (!area) localStorage.removeItem(LOCATION_PREFERENCE_KEY);
    else localStorage.setItem(LOCATION_PREFERENCE_KEY, JSON.stringify({
      city: area.city, locality: area.locality, expires: Date.now() + 30 * 86400000,
    }));
  } catch { /* Storage may be disabled; discovery still works. */ }
}

export function DiscoveryLocationSelector({ area, onConfirm, onRestore, restoreSaved = false, summaryId }: {
  summaryId?: string;
  area: PublicArea | null;
  onConfirm: (area: PublicArea | null) => void;
  onRestore?: (area: PublicArea) => void;
  restoreSaved?: boolean;
}) {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ query: string; items: PublicArea[]; message?: string } | null>(null);
  const [status, setStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const sequence = useRef(0);
  const gpsController = useRef<AbortController | null>(null);
  const restoreCallback = useRef(onRestore);
  useEffect(() => { restoreCallback.current = onRestore; }, [onRestore]);

  useEffect(() => {
    if (!restoreSaved) return;
    const controller = new AbortController();
    const seq = sequence.current;
    try {
      const saved = locationPreferenceSchema.safeParse(JSON.parse(localStorage.getItem(LOCATION_PREFERENCE_KEY) || "null"));
      if (saved.success && saved.data.expires > Date.now()) {
        const params = new URLSearchParams({ city: saved.data.city });
        if (saved.data.locality) params.set("locality", saved.data.locality);
        void fetch(`/api/location/areas?${params}`, { signal: controller.signal, cache: "no-store" })
          .then(r => r.ok ? r.json() : null).then(data => {
            const parsed = areaResponseSchema.safeParse(data);
            if (!controller.signal.aborted && seq === sequence.current && parsed.success && parsed.data.items[0]) restoreCallback.current?.(parsed.data.items[0]);
          }).catch(() => { /* All India remains available. */ });
      }
    } catch { /* Malformed or unavailable storage is ignored. */ }
    return () => controller.abort();
  }, [restoreSaved]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2 || (/^\d+$/.test(value) && value.length !== 6)) return;
    const controller = new AbortController();
    const seq = sequence.current;
    const timer = setTimeout(async () => {
      setStatus("Finding public areas…");
      try {
        const response = await fetch(`/api/location/areas?${new URLSearchParams({ q: value })}`, { signal: controller.signal, cache: "no-store" });
        const parsed = areaResponseSchema.safeParse(await response.json());
        if (!response.ok || !parsed.success) throw new Error();
        if (seq !== sequence.current) return;
        setResult({ query, ...parsed.data });
        setStatus(parsed.data.items.length ? "Choose an area to search." : "No supported areas found. Try a district name or PIN.");
      } catch {
        if (!controller.signal.aborted && seq === sequence.current) setStatus("Location search unavailable. Edit your search to retry.");
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => () => { sequence.current++; gpsController.current?.abort(); }, []);
  function confirm(value: PublicArea | null) {
    sequence.current++;
    gpsController.current?.abort();
    rememberPublicArea(value);
    if (details.current) details.current.open = false;
    onConfirm(value);
  }
  function locate() {
    sequence.current++;
    const seq = sequence.current;
    gpsController.current?.abort();
    const controller = new AbortController();
    gpsController.current = controller;
    setResult(null);
    if (!navigator.geolocation) { setStatus("Device location unavailable. Enter a place name or PIN."); return; }
    setLocating(true);
    setStatus("Waiting for your device location…");
    navigator.geolocation.getCurrentPosition(async position => {
      if (seq !== sequence.current) return;
      try {
        const response = await fetch("/api/location/reverse", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }), signal: controller.signal });
        const data = await response.json();
        if (seq !== sequence.current) return;
        const parsed = areaResponseSchema.safeParse(data);
        if (!response.ok || !parsed.success) { setStatus(typeof data.message === "string" ? data.message : "Location unavailable. Use manual search."); return; }
        setResult({ query, ...parsed.data });
        setStatus("Choose a public area below, or enter a place name or PIN.");
      } catch { if (seq === sequence.current) setStatus("Location provider unavailable. Enter a place name or PIN."); }
      finally { if (seq === sequence.current) setLocating(false); }
    }, error => {
      if (seq !== sequence.current) return;
      setLocating(false);
      setStatus(error.code === 1 ? "Location permission denied. Enter a place name or PIN."
        : error.code === 3 ? "Location request timed out. Enter a place name or PIN."
        : "Device location unavailable. Enter a place name or PIN.");
    }, { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 });
  }
  return (
    <details ref={details} className="relative min-w-0" onKeyDown={event => {
      if (event.key === "Escape" && details.current) { sequence.current++; gpsController.current?.abort(); setLocating(false); details.current.open = false; details.current.querySelector("summary")?.focus(); }
    }}>
      <summary id={summaryId} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-action-500">
        <MapPin className="h-4 w-4 shrink-0 text-brand-link" aria-hidden="true" />
        <span className="min-w-0 break-words">{area?.label || "All India"}</span>
        <span className="ml-auto text-xs text-brand-link">Change</span>
      </summary>
      <div className="mt-2 rounded-xl border border-border bg-card p-4 text-foreground">
        <button type="button" onClick={() => confirm(null)} className="min-h-11 w-full text-left text-sm font-semibold text-brand-link">All India — clear location</button>
        <label htmlFor={id} className="block text-sm font-medium">City, district, area or PIN</label>
        <input id={id} type="search" maxLength={80} value={query} autoComplete="off" aria-describedby={`${id}-help ${id}-status`}
          placeholder="e.g. Bengaluru or 560034"
          onChange={event => { sequence.current++; gpsController.current?.abort(); setLocating(false); setQuery(event.target.value); setResult(null); setStatus(""); }}
          className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm focus:outline-2 focus:outline-action-500" />
        <p id={`${id}-help`} className="mt-2 text-xs text-muted">Districts are administrative areas, not metro boundaries. Only your confirmed public area is remembered on this device for 30 days. Clear it with All India.</p>
        <button type="button" disabled={locating} onClick={locate} className="my-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-link disabled:opacity-50">
          <Navigation className="h-4 w-4" aria-hidden="true" />{locating ? "Locating…" : "Use my current location"}
        </button>
        <p className="text-xs text-muted">On request, coordinates are sent to Google through our server to find public areas. FairSwap does not save them.</p>
        <p id={`${id}-status`} role="status" className="mt-2 text-sm">{status}</p>
        {result?.query === query && <>
          {result.message && <p className="mt-2 text-xs text-muted">{result.message}</p>}
          <ul className="mt-2 max-h-72 overflow-y-auto">
            {result.items.map(item => <li key={`${item.city}:${item.locality || ""}`}><button type="button" onClick={() => confirm(item)} className="min-h-11 w-full rounded-lg px-2 py-3 text-left text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-action-500">{item.label}</button></li>)}
          </ul>
        </>}
      </div>
    </details>
  );
}
