import React from 'react';
import { useStore } from '../store';
import FlowChartPanel from './FlowChartPanel';
import { ChartIcon, HeatIcon } from '../icons';

type Message = { kind: 'error' | 'success'; text: string } | null;

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Density card: pulls a density snapshot (drawn as the heat layer) and the flow
 * series (drawn as the chart) for the current area, and reports both as tiles.
 */
export default function ControlsPanel({ chartHeight = 150 }: { chartHeight?: number }) {
  const areaId = useStore((s) => s.areaId);
  const polygon = useStore((s) => s.polygon);
  const setDensitySnapshot = useStore((s) => s.setDensitySnapshot);
  const setFlowSeries = useStore((s) => s.setFlowSeries);
  const densityPoints = useStore((s) => s.densityPoints);
  const densityTotal = useStore((s) => s.densityTotal);
  const densityUpdatedAt = useStore((s) => s.densityUpdatedAt);

  const [message, setMessage] = React.useState<Message>(null);
  const [busy, setBusy] = React.useState<'snapshot' | 'flow' | null>(null);

  async function fetchDensity() {
    if (!polygon) {
      setMessage({ kind: 'error', text: 'Set an area first — use the Area tab or draw one on the map.' });
      return;
    }

    // Convert polygon to CAMARA format
    const boundary = polygon.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));

    setBusy('snapshot');
    setMessage(null);
    try {
      const r = await fetch('/api/density/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId,
          polygon: {
            areaType: 'POLYGON',
            boundary,
          },
        }),
      }).then((r) => r.json());

      if (r.error) {
        setMessage({ kind: 'error', text: `Density snapshot failed: ${r.error}` });
        return;
      }

      setDensitySnapshot(r);
      setMessage({
        kind: 'success',
        text: `Snapshot ready: ${formatNumber(r.totalDevices ?? 0)} devices across ${formatNumber(
          (r.points ?? []).length,
        )} cells.`,
      });
    } catch (error) {
      console.error('Density snapshot failed:', error);
      setMessage({ kind: 'error', text: 'Density snapshot failed: the request did not complete.' });
    } finally {
      setBusy(null);
    }
  }

  async function fetchFlows() {
    setBusy('flow');
    setMessage(null);
    try {
      const r = await fetch(`/api/density/flow/${areaId}`).then((r) => r.json());
      if (r.error) {
        setMessage({ kind: 'error', text: `Flow series failed: ${r.error}` });
        return;
      }
      setFlowSeries(r.series);
      setMessage({
        kind: 'success',
        text: `Flow series ready: ${formatNumber((r.series ?? []).length)} points.`,
      });
    } catch (error) {
      console.error('Flow series failed:', error);
      setMessage({ kind: 'error', text: 'Flow series failed: the request did not complete.' });
    } finally {
      setBusy(null);
    }
  }

  const updated = densityUpdatedAt
    ? new Date(densityUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <>
      <div className="grid-2">
        <button
          type="button"
          className="btn btn--primary"
          onClick={fetchDensity}
          disabled={busy !== null}
          data-testid="density-snapshot"
        >
          <HeatIcon size={16} />
          Density snapshot
        </button>
        <button type="button" className="btn" onClick={fetchFlows} disabled={busy !== null}>
          <ChartIcon size={16} />
          Flow series
        </button>
      </div>

      <dl className="kpi">
        <div className="kpi__tile">
          <dt>devices</dt>
          <dd data-testid="kpi-devices">{densityTotal === null ? '—' : formatNumber(densityTotal)}</dd>
        </div>
        <div className="kpi__tile">
          <dt>cells</dt>
          <dd>{densityPoints.length ? formatNumber(densityPoints.length) : '—'}</dd>
        </div>
        <div className="kpi__tile kpi__tile--text">
          <dt>updated</dt>
          <dd>{updated}</dd>
        </div>
      </dl>

      {message ? (
        <p
          className={`status-message ${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      <FlowChartPanel height={chartHeight} />
    </>
  );
}
