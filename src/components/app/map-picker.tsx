"use client";

/**
 * Pemilih lokasi toko dengan peta (Leaflet + OpenStreetMap — tanpa API key).
 * Bisa: klik/tarik pin di peta, pakai GPS beneran, atau tempel link share
 * Google Maps (koordinat otomatis diparse).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LocateFixed, Link2, Loader2, AlertTriangle } from "lucide-react";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Parse koordinat dari berbagai bentuk link Google Maps. */
export function parseGmapsLink(input: string): LatLng | null {
  const s = input.trim();
  if (!s) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // .../@-7.0595,110.4483,15z
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // ...!3d-7.0595!4d110.4483
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=-7.05,110.44
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?ll=..
    /^(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)$/, // langsung "lat,lng"
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

const DEFAULT_CENTER: LatLng = { lat: -6.9932, lng: 110.4203 }; // Semarang

export function LocationPicker({
  value,
  onChange,
  error,
}: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  error?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
   
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [gmapsInput, setGmapsInput] = useState("");
  const [gmapsError, setGmapsError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Posisi awal: value → default
  const initial = value ?? DEFAULT_CENTER;

  const setMarker = useCallback(
    (pos: LatLng, fly = false) => {
      const L = LRef.current;
      if (!L || !mapRef.current) return;
      if (!markerRef.current) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="transform:translate(-50%,-100%)">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" fill="#0d9488" stroke="white" stroke-width="1.6"/>
              <circle cx="12" cy="10" r="2.6" fill="white"/>
            </svg>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [0, 0],
        });
        const marker: Marker = L.marker([pos.lat, pos.lng], { draggable: true, icon }).addTo(mapRef.current);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onChange({ lat: p.lat, lng: p.lng });
        });
      } else {
        markerRef.current.setLatLng([pos.lat, pos.lng]);
      }
      if (fly) mapRef.current.setView([pos.lat, pos.lng], Math.max(mapRef.current.getZoom(), 16));
      onChange(pos);
    },
    [onChange]
  );

  // Init map (dynamic import — leaflet tak boleh jalan saat SSR)
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, {
        center: [initial.lat, initial.lng],
        zoom: value ? 16 : 12,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        setGpsError(null);
        setMarker({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      setReady(true);
      if (value) setMarker(value);
      setTimeout(() => map.invalidateSize(), 150);
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
     
  }, []);

  const useGps = async () => {
    setGpsBusy(true);
    setGpsError(null);
    try {
      const pos = await new Promise<LatLng>((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(new Error("Perangkat tidak mendukung GPS"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? "Izin lokasi ditolak" : "Lokasi tidak tersedia")),
          { enableHighAccuracy: true, timeout: 12000 }
        );
      });
      setMarker(pos, true);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : "Gagal mengambil lokasi");
    } finally {
      setGpsBusy(false);
    }
  };

  const applyGmaps = () => {
    setGmapsError(null);
    const pos = parseGmapsLink(gmapsInput);
    if (!pos) {
      setGmapsError("Link tidak dikenali. Salin link dari tombol Share di Google Maps (pilih “Salin link”).");
      return;
    }
    setMarker(pos, true);
    setGmapsInput("");
  };

  return (
    <div className="space-y-2.5">
      {/* Map */}
      <div
        className={cn(
          "relative h-52 w-full overflow-hidden rounded-2xl border-2 bg-teal-50 sm:h-60",
          error ? "border-red-300" : value ? "border-emerald-300" : "border-teal-100"
        )}
      >
        <div ref={containerRef} className="h-full w-full [&_.leaflet-container]:h-full" aria-label="Peta lokasi toko" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-teal-50">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {value && (
          <span className="pointer-events-none absolute left-2 top-2 z-[500] rounded-full bg-white/95 px-2.5 py-1 font-mono text-[10px] font-bold text-teal-700 shadow">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </div>

      {/* Actions */}
      <Button
        type="button"
        onClick={useGps}
        disabled={gpsBusy}
        className="press h-10 w-full rounded-xl bg-primary text-[11px] font-extrabold hover:bg-teal-700"
      >
        {gpsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        Pakai Lokasi GPS Saya
      </Button>
      <p className="text-center text-[10px] font-medium text-slate-400">
        💡 Ketuk / geser peta untuk menempatkan pin toko
      </p>
      {gpsError && (
        <p className="flex items-start gap-1.5 text-[10px] font-medium text-amber-600">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {gpsError}
        </p>
      )}

      {/* Paste link Google Maps */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700">
          <Link2 className="h-3.5 w-3.5" /> Atau tempel link share Google Maps
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-teal-900/70">
          Buka Google Maps → cari lokasi toko → <b>Bagikan</b> → <b>Salin link</b> → tempel di sini.
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            value={gmapsInput}
            onChange={(e) => setGmapsInput(e.target.value)}
            placeholder="https://maps.app.goo.gl/… atau -7.059,110.448"
            className="h-10 min-w-0 flex-1 rounded-xl border-teal-100 bg-white text-xs"
            inputMode="url"
            onKeyDown={(e) => e.key === "Enter" && applyGmaps()}
          />
          <Button
            type="button"
            onClick={applyGmaps}
            disabled={!gmapsInput.trim()}
            className="press h-10 shrink-0 rounded-xl bg-primary px-4 text-xs font-extrabold hover:bg-teal-700"
          >
            Pindahkan Pin
          </Button>
        </div>
        {gmapsError && <p className="mt-1.5 text-[10px] font-medium text-red-500">{gmapsError}</p>}
      </div>

      {error && <p className="text-[10px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}
