import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  Polygon as LFPolygon,
  Polyline,
  useMapEvents,
  useMap,
  Marker,
  Circle,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useStore } from '../store';
import type { DensityPoint } from '../store';
import { cssVar, useThemeVersion } from '../theme';
import DrawControl from './DrawControl';
import BasemapLayer from './BasemapLayer';

const defaultCenter: [number, number] = [44.4268, 26.1025];
const defaultZoom = 12;

/** A CSS pin, so the marker themes with the rest of the page and loads no image. */
function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: '<span class="pin pin--device"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function ClickHandler() {
  const setClickedCoords = useStore((s) => s.setClickedCoords);

  useMapEvents({
    click(e) {
      setClickedCoords([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function HeatmapLayerComp({ points }: { points: DensityPoint[] }) {
  const map = useMapEvents({});
  const heatLayerRef = useRef<L.Layer | null>(null);
  // The heat layer paints on a canvas, so it needs literal colours.
  const themeVersion = useThemeVersion();

  useEffect(() => {
    if (!map) return;
    const latlngs = points.map((p) => [p.lat, p.lon, Math.min(p.count / 50, 1)]);
    const gradient = {
      0.2: cssVar('--heat-1', 'rgba(251,191,36,0.35)'),
      0.6: cssVar('--heat-2', 'rgba(234,88,12,0.75)'),
      1.0: cssVar('--heat-3', 'rgba(220,38,38,0.9)'),
    };

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    heatLayerRef.current = (L as any)
      .heatLayer(latlngs, { radius: 25, blur: 15, gradient })
      .addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, themeVersion]);

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
      const latlngs = densityPoints.map((p) => [p.lat, p.lon]);
      map.fitBounds(latlngs as any);
      return;
    }

    if (route?.path && route.path.length > 0) {
      const latlngs = route.path.map((p) => [p.lat, p.lon]);
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
    [polygon],
  );

  const routeLatLngs = useMemo(
    () => (route?.path ? route.path.map((p) => [p.lat, p.lon]) : []),
    [route],
  );

  const deviceIcon = useMemo(() => pinIcon(), []);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <BasemapLayer />

      {polygonLatLngs.length > 0 && (
        <LFPolygon
          positions={polygonLatLngs as any}
          className="map-area"
        />
      )}

      {Array.isArray(densityPoints) && densityPoints.length > 0 && (
        <HeatmapLayerComp points={densityPoints} />
      )}

      {routeLatLngs.length > 0 && (
        <Polyline
          positions={routeLatLngs as any}
          className="map-route"
          pathOptions={{ weight: 5 }}
        />
      )}

      {deviceInfo?.location && (
        <>
          <Marker
            position={[deviceInfo.location.lat, deviceInfo.location.lon]}
            icon={deviceIcon}
            title={`Device ${deviceInfo.deviceId}`}
          />
          <Circle
            center={[deviceInfo.location.lat, deviceInfo.location.lon]}
            radius={deviceInfo.accuracyMeters}
            className="map-accuracy"
            pathOptions={{ weight: 1 }}
          />
        </>
      )}

      <ZoomControl position="bottomright" />
      <AutoFitBounds />
      <DrawControl />
      <ClickHandler />
    </MapContainer>
  );
}
