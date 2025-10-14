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
import React from 'react';

// Register Chart.js components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function FlowChartPanel() {
  const { flowSeries } = useStore();

  // Guard: ensure it's an array
  if (!Array.isArray(flowSeries) || flowSeries.length === 0) {
    return <div>No flow data yet</div>;
  }

  try {
    // Ensure we only map over valid objects
    const labels = flowSeries.map(p =>
      p?.timestamp
        ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'N/A'
    );

    const values = flowSeries.map(p =>
      typeof p?.totalDevices === 'number' ? p.totalDevices : 0
    );

    const data = {
      labels,
      datasets: [
        {
          label: 'Total devices',
          data: values,
          borderColor: 'dodgerblue',
          backgroundColor: 'rgba(30,144,255,0.2)',
          fill: true,
          tension: 0.3,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' as const },
        title: { display: true, text: 'Device Flow Over Time' },
      },
    };

    return (
      <div style={{ height: 250, marginTop: 10 }}>
        <Line data={data} options={options} />
      </div>
    );
  } catch (err) {
    console.error('Chart rendering failed, falling back to list:', err);
    return (
      <div>
        <h4>Flow series (fallback)</h4>
        <ul>
          {flowSeries.map((p, i) => (
            <li key={p?.timestamp || i}>
              {p?.timestamp
                ? new Date(p.timestamp).toLocaleTimeString()
                : 'Unknown time'}{' '}
              — {typeof p?.totalDevices === 'number' ? p.totalDevices : 'N/A'}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}