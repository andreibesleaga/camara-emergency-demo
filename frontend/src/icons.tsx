/**
 * Inline stroke icons. No icon library: every glyph is a small SVG so the demo
 * ships without an extra dependency and every icon inherits `currentColor`.
 */
import React from 'react';

export type IconProps = {
  /** Square size in CSS pixels. */
  size?: number;
};

function Svg({ size = 18, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function BellIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

export function AreaIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 5 14 3l6 5-3 12-11 1z" />
    </Svg>
  );
}

export function HeatIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 17c3-6 6-6 9 0s6 6 9 0" />
      <path d="M3 11c3-6 6-6 9 0s6 6 9 0" />
    </Svg>
  );
}

export function RouteIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path d="M9 19h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6" />
    </Svg>
  );
}

export function PhoneIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </Svg>
  );
}

export function SunIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  );
}

export function PinIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function SearchIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function ChartIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-5 4 3 5-7" />
    </Svg>
  );
}

export function CheckIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="m20 6-11 11-5-5" />
    </Svg>
  );
}
