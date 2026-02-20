/**
 * Dino Music App - Theme Context
 * Provides theme to all components via React Context
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, Theme, ThemeMode } from '../config/theme';
import { useSettingsStore } from '../stores/settingsStore';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  backgroundStyle: 'blur' | 'solid' | 'gradient';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: createTheme('dark'),
  themeMode: 'dark',
  backgroundStyle: 'blur',
});

export const useTheme = (): Theme => {
  const { theme } = useContext(ThemeContext);
  return theme;
};

export const useThemeMode = (): ThemeMode => {
  const { themeMode } = useContext(ThemeContext);
  return themeMode;
};

export const useBackgroundStyle = (): 'blur' | 'solid' | 'gradient' => {
  const { backgroundStyle } = useContext(ThemeContext);
  return backgroundStyle;
};

export const useThemeContext = (): ThemeContextValue => {
  return useContext(ThemeContext);
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const backgroundStyle = useSettingsStore((state) => state.backgroundStyle);

  const theme = useMemo(() => createTheme(themeMode), [themeMode]);

  const value = useMemo(() => ({
    theme,
    themeMode,
    backgroundStyle,
  }), [theme, themeMode, backgroundStyle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
