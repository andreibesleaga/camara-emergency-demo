import React from 'react';
import { useStore } from '../store';

/** Read-only view of the last device location returned by the location API. */
export default function DeviceInfoPanel() {
  const { deviceInfo } = useStore();

  if (!deviceInfo) {
    return <p className="empty">No device selected.</p>;
  }

  const { deviceId, source, timestamp, accuracyMeters, location } = deviceInfo;

  return (
    <dl className="datalist" data-testid="device-info">
      <div className="datalist__row">
        <dt>Device</dt>
        <dd>{deviceId ?? 'Unknown'}</dd>
      </div>
      <div className="datalist__row">
        <dt>Source</dt>
        <dd>{source ?? 'N/A'}</dd>
      </div>
      <div className="datalist__row">
        <dt>Last seen</dt>
        <dd>{timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}</dd>
      </div>
      <div className="datalist__row">
        <dt>Accuracy</dt>
        <dd>{typeof accuracyMeters === 'number' ? `±${accuracyMeters} m` : 'N/A'}</dd>
      </div>
      <div className="datalist__row">
        <dt>Location</dt>
        <dd className="tabular">
          {location?.lat != null && location?.lon != null
            ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`
            : 'Unknown'}
        </dd>
      </div>
    </dl>
  );
}
