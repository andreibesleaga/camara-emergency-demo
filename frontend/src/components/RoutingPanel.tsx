import React from 'react';
import { useStore } from '../store';

export default function RoutingPanel() {
  const { setRoute } = useStore();
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
    </div>
  );
}
