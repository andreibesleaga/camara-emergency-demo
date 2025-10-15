import React from 'react';
import { useStore } from '../store';

export default function RoutingPanel() {
  const { route, setRoute } = useStore();
  const [from, setFrom] = React.useState({ lat: 44.4268, lon: 26.1025 });
  const [to, setTo] = React.useState({ lat: 44.439, lon: 26.096 });

  async function plan() {
    const r = await fetch('/api/routing/plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to })
    }).then(r => r.json());
    setRoute(r);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Emergency routing assistant</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label><b>From lat:</b></label><input type="number" value={from.lat} onChange={e => setFrom({ ...from, lat: Number(e.target.value) })}/>
          <label><b>From lon:</b></label><input type="number" value={from.lon} onChange={e => setFrom({ ...from, lon: Number(e.target.value) })}/>
        </div>
        <div>
          <label><b>To lat:</b></label><input type="number" value={to.lat} onChange={e => setTo({ ...to, lat: Number(e.target.value) })}/>
          <label><b>To lon:</b></label><input type="number" value={to.lon} onChange={e => setTo({ ...to, lon: Number(e.target.value) })}/>
        </div>
      </div>
      <button onClick={plan}>Plan route</button>
      
      {route && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f7ff', border: '1px solid #2196F3', borderRadius: 4 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#1976D2' }}>Route Planned</h4>
          <div style={{ marginBottom: 8 }}>
            <b>🕐 Estimated Time:</b> <span style={{ color: '#1976D2', fontSize: '1.1em' }}>{route.etaMinutes} minutes</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <b>📍 Waypoints:</b> {route.path.length} points
          </div>
          {route.advisories && route.advisories.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <b>⚠️ Advisories:</b>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {route.advisories.map((advisory, i) => (
                  <li key={i} style={{ 
                    marginBottom: 4,
                    color: advisory.toLowerCase().includes('high density') ? '#d32f2f' : '#f57c00'
                  }}>
                    {advisory}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
