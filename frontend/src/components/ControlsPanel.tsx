import React from 'react';
import { useStore } from '../store';
import AreaSelector from './AreaSelector';

export default function ControlsPanel() {
  const { setFlowSeries, setDeviceInfo } = useStore();
  const { polygon, setDensity, setFlows } = useStore();
  const [areaId, setAreaId] = React.useState('demo-area');
  const clickedCoords = useStore((s) => s.clickedCoords);

  async function fetchDensity() {
    if (!polygon) return alert('Set polygon first');
    const r = await fetch('/api/density/snapshot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId, polygon: { coordinates: polygon } })
    }).then(r => r.json());
    setDensity(r.points);
  }

  async function fetchFlows() {
    const r = await fetch(`/api/density/flow/${areaId}`).then(r => r.json());
    setFlowSeries(r.series);
  }

  async function lookupDevice() {
    const deviceId = prompt('Enter deviceId (e.g., +40700000000)');
    if (!deviceId) return;
    const response = await fetch(`/api/location/device/${encodeURIComponent(deviceId)}`);
    const payload = await response.json();
    if (!response.ok || payload?.error) {
      alert(payload?.error || 'Device lookup failed');
      return;
    }
    setDeviceInfo(payload);
    // alert(`Device: \${payload.deviceId}\nLat: \${payload.location.lat}\nLon: \${payload.location.lon}\nAcc: \${payload.accuracyMeters}m\n\${payload.source}`);
  }

  return (
    <div>
      <AreaSelector />
      <div style={{ marginTop: 8 }}>
        <label><b>Area ID:</b></label>
        <input value={areaId} onChange={e => setAreaId(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={fetchDensity}>Get density snapshot</button>
        <button onClick={fetchFlows}>Get flow series</button>
        <button onClick={lookupDevice}>Lookup device location</button>
      </div>
      <h3>Controls</h3>
      <label>
        Last clicked coordinates:
        <input
          type="text"
          readOnly
          value={clickedCoords ? `${clickedCoords[0].toFixed(5)}, ${clickedCoords[1].toFixed(5)}` : ''}
          style={{ width: '100%', marginTop: '0.5rem' }}
        />
      </label>
    </div>
  );
}
