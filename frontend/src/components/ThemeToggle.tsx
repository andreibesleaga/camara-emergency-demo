import React from 'react';
import { useTheme } from '../theme';
import { MoonIcon, SunIcon } from '../icons';

/** Switch between the light and dark themes; the choice is remembered. */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
    >
      <SunIcon size={16} />
      <span className="theme-toggle__track" aria-hidden="true" />
      <MoonIcon size={16} />
      <span className="sr-only">Dark theme</span>
    </button>
  );
}
