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
            border: 3px solid #0f172a;
            box-shadow: 0 0 15px ${color}99;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: bold;
          ">
            ${label}
          </div>
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            opacity: 0.6;
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const mfgIcon = createCustomIcon("#3b82f6", "🏭");
  const liveIcon = createCustomIcon("#10b981", "📍");
  const transitIcon = createCustomIcon("#8b5cf6", "🚚");

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/90 shadow-2xl relative flex flex-col">
      {/* Map Control Bar / Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                Live GPS & Cold-Chain Telemetry
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ACTIVE RADAR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentLocation?.location_name || "Transit Route (Active Transmission)"}</span>
            </p>
          </div>
        </div>

        {/* GPS Action Button */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold transition shadow-sm"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
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
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium uppercase block">
                Coordinates
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
              </span>
            </div>
          </div>

          {temperature !== undefined && temperature !== null && (
            <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase block">
                  Sensor Temp
                </span>
                <span className="text-xs font-bold text-blue-300">
                  {temperature}°C
                </span>
              </div>
            </div>
          )}

          {humidity !== undefined && humidity !== null && (
            <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase block">
                  Humidity
                </span>
                <span className="text-xs font-bold text-cyan-300">
                  {humidity}%
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Telemetry verified real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
