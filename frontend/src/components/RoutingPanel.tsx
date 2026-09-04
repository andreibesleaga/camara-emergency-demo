import React from 'react';
import { useStore } from '../store';
import { RouteIcon } from '../icons';

type Message = { kind: 'error' | 'success'; text: string } | null;

/** Advisories are ranked so the colour is never the only signal — the level is written out. */
function advisoryLevel(advisory: string): 'critical' | 'warning' {
  return advisory.toLowerCase().includes('high density') ? 'critical' : 'warning';
}

/** Emergency routing: plan a route between two points and report ETA and advisories. */
export default function RoutingPanel() {
  const route = useStore((s) => s.route);
  const setRoute = useStore((s) => s.setRoute);
  const from = useStore((s) => s.routeFrom);
  const to = useStore((s) => s.routeTo);
  const setFrom = useStore((s) => s.setRouteFrom);
  const setTo = useStore((s) => s.setRouteTo);

  const [message, setMessage] = React.useState<Message>(null);
  const [busy, setBusy] = React.useState(false);

  async function plan() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await fetch('/api/routing/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      }).then((r) => r.json());

      if (r.error) {
        setMessage({ kind: 'error', text: `Route planning failed: ${r.error}` });
        return;
      }

      setRoute(r);
      setMessage({ kind: 'success', text: `Route planned: ${r.etaMinutes} minutes.` });
    } catch (error) {
      console.error('Route planning failed:', error);
      setMessage({ kind: 'error', text: 'Route planning failed: the request did not complete.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid-2">
        <div className="field">
          <label className="field__label" htmlFor="route-from-lat">
            From latitude
          </label>
          <input
            id="route-from-lat"
            className="input"
            type="number"
            step="any"
            inputMode="decimal"
            value={from.lat}
            onChange={(e) => setFrom({ ...from, lat: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="route-from-lon">
            From longitude
          </label>
          <input
            id="route-from-lon"
            className="input"
            type="number"
            step="any"
            inputMode="decimal"
            value={from.lon}
            onChange={(e) => setFrom({ ...from, lon: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="route-to-lat">
            To latitude
          </label>
          <input
            id="route-to-lat"
            className="input"
            type="number"
            step="any"
            inputMode="decimal"
            value={to.lat}
            onChange={(e) => setTo({ ...to, lat: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="route-to-lon">
            To longitude
          </label>
          <input
            id="route-to-lon"
            className="input"
            type="number"
            step="any"
            inputMode="decimal"
            value={to.lon}
            onChange={(e) => setTo({ ...to, lon: Number(e.target.value) })}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={plan}
        disabled={busy}
        data-testid="plan-route"
      >
        <RouteIcon size={16} />
        Plan route
      </button>

      {message ? (
        <p
          className={`status-message ${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      {route ? (
        <>
          <dl className="kpi">
            <div className="kpi__tile">
              <dt>minutes ETA</dt>
              <dd data-testid="route-eta">{route.etaMinutes}</dd>
            </div>
            <div className="kpi__tile">
              <dt>waypoints</dt>
              <dd>{route.path.length}</dd>
            </div>
            <div className="kpi__tile">
              <dt>advisories</dt>
              <dd>{route.advisories?.length ?? 0}</dd>
            </div>
          </dl>

          {route.advisories && route.advisories.length > 0 ? (
            <ul className="advisories">
              {route.advisories.map((advisory, i) => {
                const level = advisoryLevel(advisory);
                return (
                  <li key={i} className={`advisory advisory--${level}`}>
                    <span className="advisory__level">{level === 'critical' ? 'Critical' : 'Caution'}</span>
                    <span>{advisory}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="empty">No route planned yet.</p>
      )}
    </>
  );
}
