import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon as LFPolygon,
  Polyline,
  useMapEvents,
  useMap,
  Marker,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useStore } from '../store';
import DrawControl from './DrawControl';

const defaultCenter: [number, number] = [44.4268, 26.1025];
const defaultZoom = 12;

function ClickHandler() {
  const setClickedCoords = useStore((s) => s.setClickedCoords);

  useMapEvents({
    click(e) {
      setClickedCoords([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}


function HeatmapLayerComp({ points }: { points: { lat: number; lon: number; count: number }[] }) {
  const map = useMapEvents({});
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!map) return;
    const latlngs = points.map(p => [p.lat, p.lon, Math.min(p.count / 50, 1)]);
    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(latlngs);
    } else {
      heatLayerRef.current = (L as any)
        .heatLayer(latlngs, { radius: 25, blur: 15 })
        .addTo(map);
    }
  }, [map, points]);

  return null;
}

function AutoFitBounds() {
  const map = useMap();
  const { polygon, densityPoints, route, deviceInfo } = useStore();

  useEffect(() => {
    if (!map) return;

    if (deviceInfo?.location) {
      map.setView([deviceInfo.location.lat, deviceInfo.location.lon], 15);
      return;
    }

    if (Array.isArray(polygon) && polygon.length > 0) {
      const latlngs = polygon.map(([lon, lat]) => [lat, lon]);
      map.fitBounds(latlngs as any);
      return;
    }

    if (Array.isArray(densityPoints) && densityPoints.length > 0) {
      const latlngs = densityPoints.map(p => [p.lat, p.lon]);
      map.fitBounds(latlngs as any);
      return;
    }

    if (route?.path && route.path.length > 0) {
      const latlngs = route.path.map(p => [p.lat, p.lon]);
      map.fitBounds(latlngs as any);
      return;
    }
  }, [map, polygon, densityPoints, route, deviceInfo]);

  return null;
}

export default function MapDashboard() {
  const { deviceInfo, polygon, densityPoints, route } = useStore();

  const polygonLatLngs = useMemo(
    () => (Array.isArray(polygon) ? polygon.map(([lon, lat]) => [lat, lon]) : []),
    [polygon]
  );

  const routeLatLngs = useMemo(
    () => (route?.path ? route.path.map(p => [p.lat, p.lon]) : []),
    [route]
  );

  return (
    <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {polygonLatLngs.length > 0 && (
        <LFPolygon positions={polygonLatLngs} pathOptions={{ color: 'orange' }} />
      )}

      {Array.isArray(densityPoints) && densityPoints.length > 0 && (
        <HeatmapLayerComp points={densityPoints} />
      )}

      {routeLatLngs.length > 0 && (
        <Polyline positions={routeLatLngs} pathOptions={{ color: 'dodgerblue' }} />
      )}

      {deviceInfo?.location && (
        <>
          <Marker position={[deviceInfo.location.lat, deviceInfo.location.lon]} />
          <Circle
            center={[deviceInfo.location.lat, deviceInfo.location.lon]}
            radius={deviceInfo.accuracyMeters}
            pathOptions={{ color: 'red', weight: 1, fillOpacity: 0.1 }}
          />
        </>
      )}

      <AutoFitBounds />
      <DrawControl />
      <ClickHandler />
    </MapContainer>
  );
}