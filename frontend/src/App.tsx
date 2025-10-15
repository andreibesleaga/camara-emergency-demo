import React from 'react';
import MapDashboard from './components/MapDashboard';
import ControlsPanel from './components/ControlsPanel';
import FlowChartPanel from './components/FlowChartPanel';
import AlertsPanel from './components/AlertsPanel';
import RoutingPanel from './components/RoutingPanel';
import DeviceInfoPanel from './components/DeviceInfoPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import '../styles.css';

export default function App() {
  return (
    <div className="layout">
      <div className="sidebar">
        <h2>CAMARA Emergency Demo</h2>

        <ErrorBoundary>
          <ControlsPanel />
        </ErrorBoundary>

        <ErrorBoundary>
          <DeviceInfoPanel />
        </ErrorBoundary>

        <ErrorBoundary>
          <FlowChartPanel />
        </ErrorBoundary>

        <ErrorBoundary>
          <AlertsPanel />
        </ErrorBoundary>

        <ErrorBoundary>
          <RoutingPanel />
        </ErrorBoundary>

        <div className="footer">
          <small>Mock mode toggled by USE_MOCK env. Change CAMARA_ .env settings for real connectivity to Telecom Network APIs.</small>
        </div>
      </div>

      <div className="map">
        <ErrorBoundary>
          <MapDashboard />
        </ErrorBoundary>
      </div>
    </div>
  );
}