import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useStore } from '../store';
import { cssVar, useThemeVersion } from '../theme';

// Register Chart.js components once
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function FlowChartPanel({ height = 150 }: { height?: number }) {
  const { flowSeries } = useStore();
  // Canvas drawings cannot read CSS variables: re-read the literals on a theme change.
  const themeVersion = useThemeVersion();

  const palette = React.useMemo(
    () => ({
      line: cssVar('--accent', '#ea580c'),
      fill: cssVar('--chart-fill', 'rgba(234,88,12,0.15)'),
      text: cssVar('--fg-2', '#6b6661'),
      grid: cssVar('--chart-grid', 'rgba(27,26,25,0.10)'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );

  // Guard: ensure it's an array
  if (!Array.isArray(flowSeries) || flowSeries.length === 0) {
    return <p className="empty">No flow data yet — press “Flow series”.</p>;
  }

  try {
    // Ensure we only map over valid objects
    const labels = flowSeries.map((p) =>
      p?.timestamp
        ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'N/A',
    );

    const values = flowSeries.map((p) => (typeof p?.totalDevices === 'number' ? p.totalDevices : 0));

    const data = {
      labels,
      datasets: [
        {
          label: 'Total devices',
          data: values,
          borderColor: palette.line,
          backgroundColor: palette.fill,
          pointBackgroundColor: palette.line,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false as const },
        title: { display: false as const },
        tooltip: { intersect: false, mode: 'index' as const },
      },
      scales: {
        x: {
          ticks: { color: palette.text, maxTicksLimit: 5, font: { size: 10 } },
          grid: { display: false },
          border: { color: palette.grid },
        },
        y: {
          ticks: { color: palette.text, maxTicksLimit: 4, font: { size: 10 } },
          grid: { color: palette.grid },
          border: { display: false },
        },
      },
    };

    return (
      <figure className="chart" style={{ height }}>
        <figcaption className="sr-only">Device flow over time</figcaption>
        <Line
          key={themeVersion}
          data={data}
          options={options}
          role="img"
          aria-label="Device flow over time"
        />
      </figure>
    );
  } catch (err) {
    console.error('Chart rendering failed, falling back to list:', err);
    return (
      <div>
        <p className="hint">Flow series (fallback)</p>
        <ul className="plain-list">
          {flowSeries.map((p, i) => (
            <li key={p?.timestamp || i}>
              {p?.timestamp ? new Date(p.timestamp).toLocaleTimeString() : 'Unknown time'} —{' '}
              {typeof p?.totalDevices === 'number' ? p.totalDevices : 'N/A'}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
