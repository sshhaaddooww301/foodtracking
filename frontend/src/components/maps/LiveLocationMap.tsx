"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Radio,
  Clock,
  Thermometer,
  Droplets,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

// Dynamically import Leaflet components to avoid Next.js SSR window errors
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

interface LiveLocationMapProps {
  currentLocation?: {
    latitude?: number;
    longitude?: number;
    location_name?: string;
    last_updated?: string;
    status?: string;
  } | null;
  manufacturer?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  journey?: Array<{
    event_type: string;
    from_org?: string;
    to_org?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
    blockchain_tx?: string;
  }>;
  temperature?: number | null;
  humidity?: number | null;
  productName?: string;
}

export default function LiveLocationMap({
  currentLocation,
  manufacturer,
  journey = [],
  temperature,
  humidity,
  productName,
}: LiveLocationMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    // Dynamically load Leaflet library and CSS
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });

    // Ensure Leaflet CSS is present
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // Compute live coordinates or defaults (e.g. New Delhi / Mumbai)
  const currentLat = currentLocation?.latitude || 28.6139;
  const currentLng = currentLocation?.longitude || 77.2090;

  // Build route waypoints
  const routePoints: [number, number][] = [];
  if (manufacturer?.latitude && manufacturer?.longitude) {
    routePoints.push([manufacturer.latitude, manufacturer.longitude]);
  }
  journey.forEach((ev) => {
    if (ev.latitude && ev.longitude) {
      // Avoid immediate duplicates
      const last = routePoints[routePoints.length - 1];
      if (!last || last[0] !== ev.latitude || last[1] !== ev.longitude) {
        routePoints.push([ev.latitude, ev.longitude]);
      }
    }
  });
  if (currentLat && currentLng) {
    const last = routePoints[routePoints.length - 1];
    if (!last || last[0] !== currentLat || last[1] !== currentLng) {
      routePoints.push([currentLat, currentLng]);
    }
  }

  // Create custom icons if Leaflet is loaded
  const createCustomIcon = (color: string, label: string) => {
    if (!L) return undefined;
    return L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          ">
            ${label}
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  const mfgIcon = createCustomIcon("#1e3a8a", "🏭");
  const liveIcon = createCustomIcon("#059669", "📍");
  const transitIcon = createCustomIcon("#334155", "🚚");

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;

  return (
    <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative flex flex-col">
      {/* Map Control Bar / Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#0A192F] text-white flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                Live GPS &amp; Cold-Chain Telemetry
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                GPS SYNC
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{currentLocation?.location_name || "Transit Corridor (Live Ingestion)"}</span>
            </p>
          </div>
        </div>

        {/* GPS Action Button */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition shadow-sm"
        >
          <Navigation className="w-3.5 h-3.5 text-slate-600" />
          <span>Google Maps</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {/* Interactive Map View */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-950">
        {isMounted && L ? (
          <MapContainer
            center={[currentLat, currentLng]}
            zoom={routePoints.length > 1 ? 6 : 10}
            scrollWheelZoom={false}
            className="w-full h-full z-0"
            style={{ height: "100%", width: "100%", background: "#0b132b" }}
          >
            {/* Dark & High-Contrast CartoDB Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Connecting Route Path */}
            {routePoints.length > 1 && (
              <Polyline
                positions={routePoints}
                pathOptions={{
                  color: "#38bdf8",
                  weight: 3,
                  dashArray: "6, 8",
                  opacity: 0.8,
                }}
              />
            )}

            {/* Manufacturer Pin */}
            {manufacturer?.latitude && manufacturer?.longitude && mfgIcon && (
              <Marker
                position={[manufacturer.latitude, manufacturer.longitude]}
                icon={mfgIcon}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 text-slate-900 font-sans">
                    <p className="font-bold text-xs">🏭 Manufacturing Facility</p>
                    <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                      {manufacturer.name}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {manufacturer.city}, {manufacturer.state}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Handover / Transit Waypoints */}
            {journey.map((step, idx) => {
              if (step.latitude && step.longitude && transitIcon) {
                return (
                  <Marker
                    key={idx}
                    position={[step.latitude, step.longitude]}
                    icon={transitIcon}
                  >
                    <Popup>
                      <div className="p-1 text-slate-900 font-sans">
                        <p className="font-bold text-xs">🚚 {step.event_type}</p>
                        <p className="text-[11px] text-purple-700 font-medium">
                          {step.location || step.to_org}
                        </p>
                        {step.timestamp && (
                          <p className="text-[9px] text-slate-500">
                            {new Date(step.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}

            {/* Live GPS Pin */}
            {liveIcon && (
              <Marker position={[currentLat, currentLng]} icon={liveIcon}>
                <Popup>
                  <div className="p-1 text-slate-900 font-sans">
                    <p className="font-bold text-xs text-emerald-700 flex items-center gap-1">
                      <span>📍 Current Live Position</span>
                    </p>
                    <p className="text-[11px] font-semibold mt-0.5">
                      {currentLocation?.location_name || "In Transit"}
                    </p>
                    <p className="font-mono text-[10px] text-slate-600 mt-0.5">
                      {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
            <Radio className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs">Initializing Satellite GPS Link...</span>
          </div>
        )}

        {/* Live Telemetry Floating Widget */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-md p-2.5 shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
            <div className="w-7 h-7 rounded bg-[#0A192F] text-white flex items-center justify-center">
              <Navigation className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                Coordinates
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
              </span>
            </div>
          </div>

          {temperature !== undefined && temperature !== null && (
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
              <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Thermometer className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Sensor Temp
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {temperature}°C
                </span>
              </div>
            </div>
          )}

          {humidity !== undefined && humidity !== null && (
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
              <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Humidity
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {humidity}%
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Telemetry Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
