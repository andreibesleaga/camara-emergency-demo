import React, { useEffect } from 'react';
import { useStore } from '../store';
import type { AlertEvent } from '../store';
import { BellIcon } from '../icons';

type Message = { kind: 'error' | 'success'; text: string } | null;

/**
 * Subscribes to the server-sent alert stream. It lives outside the Alerts card
 * so alerts keep arriving (and the top bar keeps reporting the connection)
 * whichever tab is on screen.
 */
export function useAlertStream(): void {
  useEffect(() => {
    const ev = new EventSource('/api/alerts/stream');

    ev.onmessage = (m) => {
      try {
        const alert: AlertEvent = JSON.parse(m.data);
        // Read the store lazily to avoid a stale closure.
        useStore.getState().pushAlert(alert);
      } catch (error) {
        console.error('[AlertsPanel] Could not parse alert payload:', error);
      }
    };

    ev.onopen = () => {
      useStore.getState().setStreamState('open');
    };

    ev.onerror = (err) => {
      console.error('[AlertsPanel] EventSource error:', err);
      useStore.getState().setStreamState(ev.readyState === EventSource.CLOSED ? 'error' : 'connecting');
    };

    return () => {
      ev.close();
    };
  }, []);
}

/** Alerts card: the geofence rule form plus the alerts received so far. */
export default function AlertsPanel() {
  const polygon = useStore((s) => s.polygon);
  const rule = useStore((s) => s.rule);
  const setRule = useStore((s) => s.setRule);

  const [message, setMessage] = React.useState<Message>(null);
  const [busy, setBusy] = React.useState(false);

  async function createRule() {
    if (!polygon) {
      setMessage({ kind: 'error', text: 'Set an area first — use the Area tab or draw one on the map.' });
      return;
    }

    // Convert polygon to CAMARA format
    const boundary = polygon.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));

    const webhookUrl = rule.webhookUrl.trim();

    setBusy(true);
    setMessage(null);
    try {
      const created = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rule.name,
          polygon: {
            areaType: 'POLYGON',
            boundary,
          },
          thresholdDevices: rule.threshold,
          alertChannels: webhookUrl ? ['ui', 'webhook'] : ['ui'],
          // The server validates this as a URL, so an empty box means "no webhook".
          ...(webhookUrl ? { webhookUrl } : {}),
          active: true,
        }),
      }).then((r) => r.json());

      if (created.error) {
        setMessage({ kind: 'error', text: `Could not create the rule: ${created.error}` });
        return;
      }

      setMessage({
        kind: 'success',
        text: `Rule created: ${created.name} (${created.id}). Alerts arrive on the stream.`,
      });
    } catch (error) {
      console.error('Rule creation failed:', error);
      setMessage({ kind: 'error', text: 'Could not create the rule: the request did not complete.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="rule-name">
          Rule name
        </label>
        <input
          id="rule-name"
          className="input"
          value={rule.name}
          onChange={(e) => setRule({ ...rule, name: e.target.value })}
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="rule-threshold">
          Threshold devices
        </label>
        <input
          id="rule-threshold"
          className="input"
          type="number"
          min={1}
          inputMode="numeric"
          value={rule.threshold}
          onChange={(e) => setRule({ ...rule, threshold: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="rule-webhook">
          Webhook URL (optional)
        </label>
        <input
          id="rule-webhook"
          className="input"
          type="url"
          placeholder="https://example.com/hook"
          value={rule.webhookUrl}
          onChange={(e) => setRule({ ...rule, webhookUrl: e.target.value })}
          autoComplete="off"
        />
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={createRule}
        disabled={busy}
        data-testid="create-rule"
      >
        <BellIcon size={16} />
        Create geofence rule
      </button>

      {message ? (
        <p
          className={`status-message ${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
          data-testid="rule-message"
        >
          {message.text}
        </p>
      ) : null}

      <AlertsList />
    </>
  );
}

function AlertsList() {
  const alerts = useStore((s) => s.alerts);

  return (
    <div className="alerts-list">
      <h3 className="subhead">Recent alerts</h3>
      {alerts.length === 0 ? (
        <p className="empty">No alerts yet. The stream pushes them as rules trigger.</p>
      ) : (
        <ul className="plain-list" data-testid="alerts-list">
          {alerts.map((a, i) => (
            <li key={`${a.triggeredAt}-${i}`} className="alert-row">
              <span className={`level level--${a.level}`}>{a.level}</span>
              <span className="alert-row__body">
                <span className="tabular">{new Date(a.triggeredAt).toLocaleTimeString()}</span> ·{' '}
                {a.totalDevices} devices
                <span className="sub"> — {a.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
