import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { useStore } from '../store';
import 'leaflet-draw/dist/leaflet.draw.css';

/** Round for a readable textarea without moving the point on the map. */
function round(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

export default function DrawControl() {
  const map = useMap();
  const { setPolygon } = useStore();

  useEffect(() => {
    if (!map) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'bottomright',
      draw: {
        polyline: false,
        rectangle: {
          // leaflet-draw 1.0.4's area read-out throws under strict mode, so it stays off.
          showArea: false,
          shapeOptions: { className: 'map-area' }
        },
        circle: false,
        marker: false,
        circlemarker: false,
        polygon: {
          allowIntersection: false,
          showArea: false,
          shapeOptions: { className: 'map-area' }
        }
      },
      edit: {
        featureGroup: drawnItems
      }
    });

    map.addControl(drawControl);

    const onCreated = (e: any) => {
      drawnItems.clearLayers(); // only one polygon at a time
      drawnItems.addLayer(e.layer);

      const latlngs = (e.layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
      // Convert to [lon, lat] pairs
      const coords: [number, number][] = latlngs.map(p => [p.lng, p.lat]);

      // Ensure closed polygon
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push(first);
        }
      }

      setPolygon(coords);
      // Mirror the drawn shape into the Area card so both views agree.
      useStore
        .getState()
        .setAreaText(JSON.stringify(coords.map(([lon, lat]) => [round(lon), round(lat)])));
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, setPolygon]);

  return null;
}
