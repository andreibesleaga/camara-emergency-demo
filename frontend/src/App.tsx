import React from 'react';
import MapDashboard from './components/MapDashboard';
import ControlsPanel from './components/ControlsPanel';
import AlertsPanel, { useAlertStream } from './components/AlertsPanel';
import RoutingPanel from './components/RoutingPanel';
import DevicePanel from './components/DevicePanel';
import AreaSelector from './components/AreaSelector';
import Card from './components/Card';
import Sheet from './components/Sheet';
import Tabs from './components/Tabs';
import ThemeToggle from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BellIcon } from './icons';
import { useStore } from './store';
import type { TabId } from './store';
import '../styles.css';

const TAB_STORAGE_KEY = 'camara.tab';
const VALID_TABS: TabId[] = ['area', 'density', 'alerts', 'routing', 'device'];

function readStoredTab(): TabId {
  try {
    const value = localStorage.getItem(TAB_STORAGE_KEY) as TabId | null;
    if (value && VALID_TABS.includes(value)) return value;
  } catch {
    /* Storage unavailable: fall back to the default tab. */
  }
  return 'area';
}

/** Ask the server whether it is serving mock data, so the bar can say so honestly. */
function useMode(): string | null {
  const [mode, setMode] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data || typeof data.useMock !== 'boolean') return;
        setMode(data.useMock ? 'Mock data' : 'Live APIs');
      })
      .catch(() => {
        /* No label rather than a wrong one. */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return mode;
}

const STREAM_LABEL = {
  connecting: 'Stream connecting',
  open: 'Stream live',
  error: 'Stream offline',
} as const;

export default function App() {
  const [tab, setTab] = React.useState<TabId>(readStoredTab);
  const [collapsed, setCollapsed] = React.useState(false);
  const barRef = React.useRef<HTMLElement>(null);

  const streamState = useStore((s) => s.streamState);
  const alerts = useStore((s) => s.alerts);
  const clickedCoords = useStore((s) => s.clickedCoords);
  const mode = useMode();

  useAlertStream();

  React.useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* The choice simply does not survive a reload. */
    }
  }, [tab]);

  /* Publish the bar height: the deck and the alert stack sit under it. */
  React.useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () =>
      document.documentElement.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
    measure();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(bar);
    }
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  function selectTab(next: TabId) {
    setTab(next);
    setCollapsed(false);
  }

  const latest = alerts.slice(0, 3);

  return (
    <div className={`app${collapsed ? ' is-collapsed' : ''}`}>
      <a className="skip-link" href="#deck-panel">
        Skip to the controls
      </a>

      <header className="bar" ref={barRef}>
        <span className="mark" aria-hidden="true">
          <BellIcon size={18} />
        </span>
        <h1 className="bar__title">CAMARA Emergency Demo</h1>

        <div className="bar__tabs">
          <Tabs value={tab} onChange={selectTab} />
        </div>

        <p className="bar__status">
          <span className={`stream stream--${streamState}`}>
            <span className="stream__text">{STREAM_LABEL[streamState]}</span>
          </span>
          {mode ? <span className="bar__mode">{mode}</span> : null}
        </p>

        <a
          className="link-btn"
          href="https://github.com/andreibesleaga/camara-emergency-demo"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>

        <ThemeToggle />
      </header>

      <main className="stage" aria-label="Emergency map">
        <div className="mapwrap">
          <ErrorBoundary>
            <MapDashboard />
          </ErrorBoundary>
        </div>

        <div className="alert-stack">
          <h2 className="sr-only">Latest alerts</h2>
          <div className="alert-stack__live" role="status" aria-live="polite">
            <ul className="alert-stack__list">
              {latest.map((alert, i) => (
                <li key={`${alert.triggeredAt}-${i}`} className="alert-card">
                  <span className={`level level--${alert.level}`}>{alert.level}</span>
                  <span className="alert-card__body">
                    <span className="tabular">
                      {new Date(alert.triggeredAt).toLocaleTimeString()}
                    </span>{' '}
                    · {alert.totalDevices} devices
                    <span className="sub"> — {alert.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {alerts.length > 0 ? (
            <button type="button" className="btn btn--small" onClick={() => selectTab('alerts')}>
              View all alerts ({alerts.length})
            </button>
          ) : null}
        </div>

        <p className="coords" aria-live="polite">
          {clickedCoords ? (
            <>
              <span className="coords__label">Last click</span>
              <span className="tabular">
                {clickedCoords[0].toFixed(5)}, {clickedCoords[1].toFixed(5)}
              </span>
            </>
          ) : (
            <span className="coords__label">Click the map to pick a point</span>
          )}
        </p>
      </main>

      <Sheet activeTab={tab} collapsed={collapsed} onCollapsedChange={setCollapsed}>
        {tab === 'area' ? (
          <>
            <Card id="area" title="Area" meta={<AreaMeta />}>
              <ErrorBoundary>
                <AreaSelector />
              </ErrorBoundary>
            </Card>
            <Card id="density-brief" title="Density">
              <ErrorBoundary>
                <ControlsPanel chartHeight={120} />
              </ErrorBoundary>
            </Card>
            <Card id="routing-brief" title="Routing">
              <ErrorBoundary>
                <RoutingPanel />
              </ErrorBoundary>
            </Card>
            <p className="about">
              Toggle test data with <code>USE_MOCK</code>; the <code>CAMARA_*</code> settings connect
              the demo to real telecom network APIs. Source on{' '}
              <a
                href="https://github.com/andreibesleaga/camara-emergency-demo"
                target="_blank"
                rel="noopener"
              >
                GitHub
              </a>
              .
            </p>
          </>
        ) : null}

        {tab === 'density' ? (
          <Card id="density" title="Density">
            <ErrorBoundary>
              <ControlsPanel chartHeight={220} />
            </ErrorBoundary>
          </Card>
        ) : null}

        {tab === 'alerts' ? (
          <Card id="alerts" title="Emergency geofence alerts">
            <ErrorBoundary>
              <AlertsPanel />
            </ErrorBoundary>
          </Card>
        ) : null}

        {tab === 'routing' ? (
          <Card id="routing" title="Emergency routing">
            <ErrorBoundary>
              <RoutingPanel />
            </ErrorBoundary>
          </Card>
        ) : null}

        {tab === 'device' ? (
          <Card id="device" title="Device location">
            <ErrorBoundary>
              <DevicePanel />
            </ErrorBoundary>
          </Card>
        ) : null}
      </Sheet>
    </div>
  );
}

function AreaMeta() {
  const areaId = useStore((s) => s.areaId);
  return <>Area ID · {areaId}</>;
}
