import React from 'react';
import { useStore } from '../store';

export default function AreaSelector() {
  const { setPolygon } = useStore();
  const [text, setText] = React.useState('[[26.08,44.41],[26.12,44.41],[26.12,44.44],[26.08,44.44]]');
  return (
    <div>
      <label><b>Area polygon [lon,lat] array:</b></label>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ width: '100%' }} />
      <button
        onClick={() => {
          try {
            let coords: [number, number][] = JSON.parse(text);

            if (coords.length > 0) {
              const first = coords[0];
              const last = coords[coords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                coords = [...coords, first]; // close the polygon
              }
            }
            setPolygon(coords);
          } catch {
            alert('Invalid JSON array');
          }
        }}
      > Set area
      </button>
    </div>
  );
}
