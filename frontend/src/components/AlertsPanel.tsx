import React, { useEffect } from 'react';
import { useStore } from '../store';

export default function AlertsPanel() {
  const { polygon, pushAlert } = useStore();
  const [threshold, setThreshold] = React.useState(3000);
  const [name, setName] = React.useState('Bucharest Center Alert');
  const [webhookUrl, setWebhookUrl] = React.useState('');

  async function createRule() {
    if (!polygon) return alert('Set polygon first');
    const rule = await fetch('/api/alerts/rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, polygon: { coordinates: polygon }, thresholdDevices: threshold,
        alertChannels: webhookUrl ? ['ui','webhook'] : ['ui'], webhookUrl
      })
    }).then(r => r.json());
    alert(`Rule created: ${rule.id}`);
  }

  useEffect(() => {
    const ev = new EventSource('/api/alerts/stream');
    ev.onmessage = (m) => pushAlert(JSON.parse(m.data));
    return () => ev.close();
  }, [pushAlert]);

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Emergency geofence alerts</h3>
      <div>
        <label><b>Name:</b></label>
        <input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label><b>Threshold devices:</b></label>
        <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
      </div>
      <div>
        <label><b>Webhook URL (optional):</b></label>
        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
      </div>
      <button onClick={createRule}>Create geofence rule</button>
      <div style={{ marginTop: 8 }}>
        <AlertsList />
      </div>
    </div>
  );
}

function AlertsList() {
  const { alerts } = useStore();
  return (
    <div>
      <b>Recent alerts:</b>
      <ul>
        {alerts.map((a, i) => (
          <li key={i}>
            [{a.level}] {a.triggeredAt} — total: {a.totalDevices} — {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
