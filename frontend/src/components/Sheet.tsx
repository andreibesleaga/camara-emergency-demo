import React from 'react';
import type { TabId } from '../store';
import { PANEL_ID, tabButtonId } from './Tabs';

const SMALL_SCREEN = '(max-width: 768px)';

type SheetProps = {
  activeTab: TabId;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: React.ReactNode;
};

/**
 * The deck of cards. On wide screens it is a floating column on the left; on
 * phones the same element becomes a bottom sheet that starts collapsed so the
 * map stays visible. Its height is published as `--sheet-h` so the Leaflet
 * controls can stay clear of it.
 */
export default function Sheet({ activeTab, collapsed, onCollapsedChange, children }: SheetProps) {
  const deckRef = React.useRef<HTMLElement>(null);
  const handleRef = React.useRef<HTMLButtonElement>(null);

  /* Phones open with the map in view. */
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const small = window.matchMedia(SMALL_SCREEN);
    if (small.matches) onCollapsedChange(true);
    // Run once on mount: later changes are the visitor's own doing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Publish the sheet height so `.leaflet-bottom` can sit above it. */
  React.useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const small = window.matchMedia ? window.matchMedia(SMALL_SCREEN) : null;
    const measure = () => {
      const height = small && small.matches ? deck.offsetHeight : 0;
      document.documentElement.style.setProperty('--sheet-h', `${height}px`);
    };
    measure();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(deck);
    }
    window.addEventListener('resize', measure);
    small?.addEventListener('change', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      small?.removeEventListener('change', measure);
    };
  }, [collapsed, activeTab]);

  /* Escape collapses the sheet on phones. */
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!window.matchMedia || !window.matchMedia(SMALL_SCREEN).matches) return;
      if (collapsed) return;
      onCollapsedChange(true);
      handleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [collapsed, onCollapsedChange]);

  return (
    <aside
      className="deck"
      ref={deckRef}
      aria-label="Controls"
    >
      <button
        type="button"
        className="sheet-handle"
        id="sheet-handle"
        ref={handleRef}
        aria-expanded={!collapsed}
        aria-controls={PANEL_ID}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        <span className="sheet-handle__label">{collapsed ? 'Show controls' : 'Hide controls'}</span>
      </button>

      <div
        className="deck__panel"
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={tabButtonId(activeTab)}
        tabIndex={0}
      >
        {children}
      </div>
    </aside>
  );
}
