"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  title: string;
  venue: string;
  neighborhood: string;
  url: string;
  datetime_iso: string;
  price: string;
  lat: number;
  lng: number;
};

const SF_CENTER: [number, number] = [37.7749, -122.4194];

// Black square marker — fits the editorial aesthetic and avoids broken
// default-icon URLs that ship with bundlers.
const dotIcon = L.divIcon({
  className: "fl-pin",
  html: '<span class="fl-pin-dot"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export default function EventsMap({ points }: { points: MapPoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className="relative h-[420px] w-full overflow-hidden border border-line">
      <MapContainer
        center={SF_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: "#fff" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={dotIcon}>
            <Popup>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                {formatDate(p.datetime_iso)}
              </div>
              <div className="mt-1 text-base font-semibold leading-snug">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {p.title}
                </a>
              </div>
              <div className="mt-1 text-xs text-neutral-700">
                {p.venue}
                {p.neighborhood ? ` · ${p.neighborhood}` : ""}
                {p.price ? ` · ${p.price}` : ""}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const cleaned = iso.replace(/[\u2010-\u2015]/g, "-");
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return iso;
    return d
      .toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      .toUpperCase();
  } catch {
    return iso;
  }
}
