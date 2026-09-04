import React from 'react';
import type { TabId } from '../store';
import { AreaIcon, BellIcon, HeatIcon, PhoneIcon, RouteIcon } from '../icons';

export type TabDefinition = {
  id: TabId;
  label: string;
  icon: React.ReactNode;
};

export const TABS: TabDefinition[] = [
  { id: 'area', label: 'Area', icon: <AreaIcon size={16} /> },
  { id: 'density', label: 'Density', icon: <HeatIcon size={16} /> },
  { id: 'alerts', label: 'Alerts', icon: <BellIcon size={16} /> },
  { id: 'routing', label: 'Routing', icon: <RouteIcon size={16} /> },
  { id: 'device', label: 'Device', icon: <PhoneIcon size={16} /> },
];

export const PANEL_ID = 'deck-panel';

export function tabButtonId(id: TabId): string {
  return `tab-${id}`;
}

type TabsProps = {
  value: TabId;
  onChange: (id: TabId) => void;
};

/**
 * Pill tabs following the WAI-ARIA tabs pattern: one tab stop for the whole
 * list, arrow keys / Home / End move between tabs and select as they go.
 */
export default function Tabs({ value, onChange }: TabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  function focusTab(id: TabId) {
    const node = listRef.current?.querySelector<HTMLButtonElement>(`#${tabButtonId(id)}`);
    node?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.id === value);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = TABS[next];
    onChange(target.id);
    focusTab(target.id);
  }

  return (
    <div className="pills" role="tablist" aria-label="Sections" ref={listRef} onKeyDown={onKeyDown}>
      {TABS.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            className="pill"
            id={tabButtonId(tab.id)}
            role="tab"
            aria-selected={selected}
            aria-controls={PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
