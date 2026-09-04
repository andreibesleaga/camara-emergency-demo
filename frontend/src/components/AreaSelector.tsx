import React from 'react';
import { useStore } from '../store';
import { PinIcon } from '../icons';

/**
 * Area card: the area identifier used by the density endpoints, the polygon
 * itself as a `[lon, lat]` JSON array, and a shortcut to the map's draw tool.
 */
export default function AreaSelector() {
  const areaId = useStore((s) => s.areaId);
  const setAreaId = useStore((s) => s.setAreaId);
  const text = useStore((s) => s.areaText);
  const setText = useStore((s) => s.setAreaText);
  const setPolygon = useStore((s) => s.setPolygon);
  const polygon = useStore((s) => s.polygon);

  const [message, setMessage] = React.useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);

  function setArea() {
    try {
      let coords: [number, number][] = JSON.parse(text);

      if (!Array.isArray(coords) || coords.length < 3) {
        setMessage({ kind: 'error', text: 'Give at least three [longitude, latitude] pairs.' });
        return;
      }

      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords = [...coords, first]; // close the polygon
        }
      }
      setPolygon(coords);
      setMessage({ kind: 'success', text: `Area set: ${coords.length - 1} corners.` });
    } catch {
      setMessage({ kind: 'error', text: 'Invalid JSON array. Expected [[lon,lat],[lon,lat], …].' });
    }
  }

  function drawOnMap() {
    const tool =
      document.querySelector<HTMLAnchorElement>('.leaflet-draw-draw-polygon') ??
      document.querySelector<HTMLAnchorElement>('.leaflet-draw-draw-rectangle');
    if (!tool) {
      setMessage({ kind: 'error', text: 'The map draw tool is not ready yet.' });
      return;
    }
    tool.focus();
    tool.click();
    setMessage({
      kind: 'info',
      text: 'Click the map to place corners, then click the first corner to close the area.',
    });
  }

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="area-id">
          Area ID
        </label>
        <input
          id="area-id"
          className="input"
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="area-polygon">
          Area polygon — [longitude, latitude] pairs
        </label>
        <textarea
          id="area-polygon"
          className="input textarea"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="grid-2">
        <button type="button" className="btn btn--primary" onClick={setArea}>
          Set area
        </button>
        <button type="button" className="btn" onClick={drawOnMap}>
          <PinIcon size={16} />
          Draw on map
        </button>
      </div>

      {message ? (
        <p
          className={`status-message ${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      {polygon ? (
        <p className="hint">Active area: {polygon.length - 1} corners.</p>
      ) : (
        <p className="hint">No area set yet — set one above or draw it on the map.</p>
      )}
    </>
  );
}
