import React from 'react';
import { useStore } from '../store';
import DeviceInfoPanel from './DeviceInfoPanel';
import { SearchIcon } from '../icons';

type Message = { kind: 'error' | 'success'; text: string } | null;

/**
 * Device card: look a device up by its identifier. Replaces the old
 * `prompt()` with a labelled field that already carries a usable default.
 */
export default function DevicePanel() {
  const deviceId = useStore((s) => s.deviceId);
  const setDeviceId = useStore((s) => s.setDeviceId);
  const setDeviceInfo = useStore((s) => s.setDeviceInfo);

  const [message, setMessage] = React.useState<Message>(null);
  const [busy, setBusy] = React.useState(false);

  async function lookupDevice() {
    const id = deviceId.trim();
    if (!id) {
      setMessage({ kind: 'error', text: 'Enter a device identifier first.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/location/device/${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok || payload?.error) {
        setMessage({
          kind: 'error',
          text: `Device lookup failed: ${payload?.error?.message ?? payload?.error ?? 'unknown error'}`,
        });
        return;
      }
      setDeviceInfo(payload);
      setMessage({ kind: 'success', text: `Located ${payload.deviceId}.` });
    } catch (error) {
      console.error('Device lookup failed:', error);
      setMessage({ kind: 'error', text: 'Device lookup failed: the request did not complete.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="device-id">
          Device identifier
        </label>
        <input
          id="device-id"
          className="input"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void lookupDevice();
            }
          }}
          autoComplete="off"
          inputMode="tel"
        />
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={lookupDevice}
        disabled={busy}
        data-testid="device-lookup"
      >
        <SearchIcon size={16} />
        Look up device
      </button>

      {message ? (
        <p
          className={`status-message ${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      <DeviceInfoPanel />
    </>
  );
}
