import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

type SiteTheme = "glass" | "minimal";

type SiteThemeContextValue = {
  theme: SiteTheme;
  isMinimal: boolean;
  toggleTheme: () => void;
};

const STORAGE_KEY = "gdx-site-theme";
const SiteThemeContext = createContext<SiteThemeContextValue | null>(null);

const getInitialTheme = (): SiteTheme => {
  if (typeof window === "undefined") return "glass";
  return window.localStorage.getItem(STORAGE_KEY) === "minimal" ? "minimal" : "glass";
};

export const SiteThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<SiteTheme>(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "minimal" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "glass" ? "minimal" : "glass"));
  }, []);

  const value = useMemo(
    () => ({ theme, isMinimal: theme === "minimal", toggleTheme }),
    [theme, toggleTheme],
  );

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
};

export const useSiteTheme = () => {
  const context = useContext(SiteThemeContext);
  if (!context) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return context;
};
