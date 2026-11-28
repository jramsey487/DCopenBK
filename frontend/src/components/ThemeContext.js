import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const THEME_STORAGE_KEY = "dcopenbk-theme";
const ThemeContext = createContext(null);

function readStoredPreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  } catch {
    return "system";
  }
}

function getResolvedTheme(preference, systemPrefersDark) {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreferenceState] = useState(readStoredPreference);

  const setThemePreference = useCallback((preference) => {
    if (!["light", "dark", "system"].includes(preference)) {
      return;
    }

    setThemePreferenceState(preference);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : { matches: false, addListener: null, removeListener: null };

    const applyTheme = () => {
      const resolvedTheme = getResolvedTheme(
        themePreference,
        mediaQuery.matches
      );
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
    };

    applyTheme();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }

    // Safari versions that support matchMedia but not addEventListener.
    mediaQuery.addListener(applyTheme);
    return () => mediaQuery.removeListener(applyTheme);
  }, [themePreference]);

  const value = useMemo(
    () => ({ themePreference, setThemePreference }),
    [themePreference, setThemePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return context;
}
