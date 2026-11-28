import React from "react";

import { useThemePreference } from "../ThemeContext";
import "./theme-preference.css";

const themeOptions = [
  { value: "system", label: "System", description: "Match your device" },
  { value: "light", label: "Light", description: "Use the light theme" },
  { value: "dark", label: "Dark", description: "Use the dark theme" },
];

export default function ThemePreference() {
  const { themePreference, setThemePreference } = useThemePreference();

  return (
    <section className="theme-preference-card" aria-labelledby="theme-preference-title">
      <div className="theme-preference-heading">
        <h2 id="theme-preference-title">Appearance</h2>
        <p>Choose how DC Open BK looks on this device.</p>
      </div>

      <div className="theme-preference-options" role="group" aria-label="Theme">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              themePreference === option.value
                ? "theme-preference-option selected"
                : "theme-preference-option"
            }
            aria-pressed={themePreference === option.value}
            onClick={() => setThemePreference(option.value)}
          >
            <span className="theme-preference-option-label">{option.label}</span>
            <span className="theme-preference-option-description">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
