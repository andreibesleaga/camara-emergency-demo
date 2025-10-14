import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { useStore } from '../store';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

export default function DrawControl() {
  const map = useMap();
  const { setPolygon } = useStore();

  useEffect(() => {
    if (!map) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        rectangle: true,
        circle: false,
        marker: false,
        circlemarker: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: 'orange' }
        }
      },
      edit: {
        featureGroup: drawnItems
      }
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: any) => {
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
      console.log("Polygon set:", coords);
    });
  }, [map, setPolygon]);

  return null;
}