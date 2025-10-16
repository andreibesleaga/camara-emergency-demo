import React, { useEffect } from 'react';
import { useStore } from '../store';

export default function AlertsPanel() {
  console.log('[AlertsPanel] Component rendering/re-rendering');
  
  const { polygon, pushAlert } = useStore();
  const [threshold, setThreshold] = React.useState(3000);
  const [name, setName] = React.useState('Bucharest Center Alert');
  const [webhookUrl, setWebhookUrl] = React.useState('');

  async function createRule() {
    if (!polygon) return alert('Set polygon first');
    
    // Convert polygon to CAMARA format
    const boundary = polygon.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon
    }));
    
    const rule = await fetch('/api/alerts/rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, 
        polygon: { 
          areaType: 'POLYGON', 
          boundary 
        }, 
        thresholdDevices: threshold,
        alertChannels: webhookUrl ? ['ui','webhook'] : ['ui'], 
        webhookUrl,
        active: true
      })
    }).then(r => r.json());
    
    if (rule.error) {
      alert(`Error creating rule: ${rule.error}`);
      return;
    }
    
    alert(`Rule created: ${rule.id} (${rule.name})`);
  }

  useEffect(() => {
    console.log('[AlertsPanel] Setting up EventSource for /api/alerts/stream');
    
    const ev = new EventSource('/api/alerts/stream');
    
    ev.onmessage = (m) => {
      console.log('[AlertsPanel] Received alert:', m.data);
      const alert = JSON.parse(m.data);
      console.log('[AlertsPanel] Parsed alert:', alert);
      
      // Get the latest pushAlert from store to avoid stale closure
      const { pushAlert: currentPushAlert } = useStore.getState();
      console.log('[AlertsPanel] Calling pushAlert...');
      currentPushAlert(alert);
      console.log('[AlertsPanel] pushAlert called successfully');
    };
    
    ev.onerror = (err) => {
      console.error('[AlertsPanel] EventSource error:', err);
      console.error('[AlertsPanel] EventSource readyState:', ev.readyState);
    };
    
    ev.onopen = () => {
      console.log('[AlertsPanel] EventSource connection opened');
      console.log('[AlertsPanel] EventSource readyState:', ev.readyState);
    };
    
    return () => {
      console.log('[AlertsPanel] Cleaning up EventSource');
      ev.close();
    };
  }, []); // Empty dependency array - only run once on mount

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
