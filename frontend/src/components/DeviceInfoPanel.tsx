import { useStore } from '../store';
import React from 'react';

export default function DeviceInfoPanel() {
  const { deviceInfo } = useStore();

  if (!deviceInfo) {
    return <div>No device selected</div>;
  }

  const {
    deviceId,
    source,
    timestamp,
    accuracyMeters,
    location,
  } = deviceInfo || {};

  return (
    <div>
      <h3>Device {deviceId ?? 'Unknown'}</h3>
      <p>Status source: {source ?? 'N/A'}</p>
      <p>
        Last seen:{' '}
        {timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}
      </p>
      <p>Accuracy: {typeof accuracyMeters === 'number' ? `±${accuracyMeters}m` : 'N/A'}</p>
      <p>
        Location:{' '}
        {location?.lat != null && location?.lon != null
          ? `${location.lat}, ${location.lon}`
          : 'Unknown'}
      </p>
    </div>
  );
}