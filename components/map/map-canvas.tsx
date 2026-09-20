"use client";

import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

export type MapVehicle = {
  id: string;
  plate: string;
  label: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  ignition: boolean | null;
  deviceStatus: string | null;
  driverName: string | null;
  ts: string;
};

export type MapFence = {
  id: string;
  name: string;
  centerLat: number | null;
  centerLng: number | null;
  radiusM: number | null;
  color: string;
  active: boolean;
};

export type MapPoint = { lat: number; lng: number };

export type MapCanvasProps = {
  vehicles?: MapVehicle[];
  fences?: MapFence[];
  path?: MapPoint[];
  /** Pans to this vehicle when it changes, without re-mounting the map. */
  focusId?: string | null;
  className?: string;
};

/**
 * Leaflet ships its marker icons as image files referenced by relative URL,
 * which no bundler can rewrite correctly. A `divIcon` is plain HTML, so the
 * markers survive bundling and can carry state (moving / idle / stale) in
 * their own markup instead of needing four sprite variants.
 */
function vehicleIcon(v: MapVehicle) {
  const moving = (v.speed ?? 0) > 3;
  const offline = v.deviceStatus !== "ONLINE";

  const fill = offline ? "#94a3b8" : moving ? "#16a34a" : "#f59e0b";
  const rotation = v.heading ?? 0;

  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
    html: `
      <div style="
        width:30px;height:30px;border-radius:9999px;
        background:${fill};border:2px solid #fff;
        box-shadow:0 1px 4px rgba(0,0,0,.45);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"
             style="transform:rotate(${rotation}deg)">
          <path d="M12 2 L19 21 L12 17 L5 21 Z" />
        </svg>
      </div>`,
  });
}

function endpointIcon(kind: "start" | "end") {
  const fill = kind === "start" ? "#16a34a" : "#dc2626";
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<div style="
      width:16px;height:16px;border-radius:9999px;
      background:${fill};border:2px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>`,
  });
}

/**
 * Leaflet computes its size once, on mount. Inside a flex/grid dashboard the
 * container is often still 0px high at that moment, which leaves the map grey
 * until the window is resized - so nudge it after layout settles, and keep the
 * view in step with `focusId` and `bounds`.
 */
function ViewController({
  bounds,
  focus,
}: {
  bounds: L.LatLngBoundsExpression | null;
  focus: MapPoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(id);
  }, [map]);

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 14), {
        duration: 0.6,
      });
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, bounds, focus]);

  return null;
}

export default function MapCanvas({
  vehicles = [],
  fences = [],
  path = [],
  focusId = null,
  className,
}: MapCanvasProps) {
  const focus = useMemo(() => {
    const match = vehicles.find((v) => v.id === focusId);
    return match ? { lat: match.lat, lng: match.lng } : null;
  }, [vehicles, focusId]);

  // Everything the map should be able to see at once: vehicles, the route, and
  // the centre of each circular fence.
  const bounds = useMemo(() => {
    const points: [number, number][] = [
      ...vehicles.map((v) => [v.lat, v.lng] as [number, number]),
      ...path.map((p) => [p.lat, p.lng] as [number, number]),
      ...fences
        .filter((f) => f.centerLat != null && f.centerLng != null)
        .map((f) => [f.centerLat as number, f.centerLng as number] as [number, number]),
    ];

    if (points.length === 0) return null;
    return L.latLngBounds(points);
  }, [vehicles, path, fences]);

  // Somewhere neutral when the fleet has never reported a position.
  const center: [number, number] = bounds
    ? [bounds.getCenter().lat, bounds.getCenter().lng]
    : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={bounds ? 12 : 2}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%", background: "#e5e7eb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <ViewController bounds={bounds} focus={focus} />

      {fences
        .filter((f) => f.centerLat != null && f.centerLng != null && f.radiusM != null)
        .map((f) => (
          <Circle
            key={f.id}
            center={[f.centerLat as number, f.centerLng as number]}
            radius={f.radiusM as number}
            pathOptions={{
              color: f.color,
              fillColor: f.color,
              fillOpacity: f.active ? 0.12 : 0.04,
              weight: f.active ? 2 : 1,
              dashArray: f.active ? undefined : "4 4",
            }}
          >
            <Popup>
              <strong>{f.name}</strong>
              <br />
              {f.radiusM} m radius
              {!f.active && (
                <>
                  <br />
                  <em>Inactive</em>
                </>
              )}
            </Popup>
          </Circle>
        ))}

      {path.length > 1 && (
        <>
          <Polyline
            positions={path.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.85 }}
          />
          <Marker
            position={[path[0].lat, path[0].lng]}
            icon={endpointIcon("start")}
          >
            <Popup>Start</Popup>
          </Marker>
          <Marker
            position={[path[path.length - 1].lat, path[path.length - 1].lng]}
            icon={endpointIcon("end")}
          >
            <Popup>End</Popup>
          </Marker>
        </>
      )}

      {vehicles.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lng]} icon={vehicleIcon(v)}>
          <Popup>
            <strong>{v.plate}</strong>
            <br />
            {v.label}
            <br />
            {v.speed == null ? "—" : `${Math.round(v.speed)} km/h`}
            {v.ignition != null && ` · ignition ${v.ignition ? "on" : "off"}`}
            <br />
            {v.driverName ?? "No driver assigned"}
            <br />
            <small>{new Date(v.ts).toUTCString()}</small>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
