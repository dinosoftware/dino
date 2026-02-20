/**
 * Dino Music App - Theme Configuration
 * TIDAL and shadcn/ui-inspired design system with multiple theme variants
 */

export type ThemeMode = 'dark' | 'light' | 'amoled';

interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    card: string;
    elevated: string;
    muted: string;
  };
  accent: string;
  accentHover: string;
  accentPressed: string;
  accentForeground: string;
  secondary: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    disabled: string;
    inverse: string;
  };
  success: string;
  successMuted: string;
  error: string;
  errorMuted: string;
  warning: string;
  warningMuted: string;
  info: string;
  infoMuted: string;
  border: string;
  borderMuted: string;
  divider: string;
  overlay: string;
  overlayLight: string;
  ring: string;
  player: {
    background: string;
    card: string;
    progressBackground: string;
    progressFilled: string;
    progressBuffered: string;
  };
  lyrics: {
    current: string;
    inactive: string;
    background: string;
  };
}

interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  round: number;
}

interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    black: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    huge: number;
    display: number;
  };
  fontWeight: {
    regular: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
    black: '900';
  };
  lineHeight: {
    none: number;
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    tighter: number;
    tight: number;
    normal: number;
    wide: number;
    wider: number;
    widest: number;
  };
}

interface ThemeShadows {
  none: object;
  sm: object;
  md: object;
  lg: object;
  xl: object;
  small: object;
  medium: object;
  large: object;
}

interface ThemeAnimations {
  duration: {
    instant: number;
    fast: number;
    normal: number;
    slow: number;
    slower: number;
  };
  easing: {
    easeIn: 'ease-in';
    easeOut: 'ease-out';
    easeInOut: 'ease-in-out';
    spring: 'spring';
  };
}

interface ThemeDimensions {
  miniPlayer: {
    height: number;
    thumbnailSize: number;
  };
  fullPlayer: {
    artworkSize: number;
  };
  card: {
    albumSize: number;
    artistSize: number;
  };
  thumbnail: {
    small: number;
    medium: number;
    large: number;
  };
}

interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  typography: ThemeTypography;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  dimensions: ThemeDimensions;
}

const darkColors: ThemeColors = {
  background: {
    primary: '#09090B',
    secondary: '#18181B',
    card: '#27272A',
    elevated: '#3F3F46',
    muted: '#52525B',
  },
  accent: '#FAFAFA',
  accentHover: '#FFFFFF',
  accentPressed: '#E4E4E7',
  accentForeground: '#09090B',
  secondary: '#FAFAFA',
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#52525B',
    disabled: '#3F3F46',
    inverse: '#09090B',
  },
  success: '#22C55E',
  successMuted: '#16A34A',
  error: '#EF4444',
  errorMuted: '#DC2626',
  warning: '#F59E0B',
  warningMuted: '#D97706',
  info: '#3B82F6',
  infoMuted: '#2563EB',
  border: '#27272A',
  borderMuted: '#3F3F46',
  divider: '#27272A',
  overlay: 'rgba(9, 9, 11, 0.8)',
  overlayLight: 'rgba(9, 9, 11, 0.6)',
  ring: '#60A5FA',
  player: {
    background: '#18181B',
    card: '#27272A',
    progressBackground: '#3F3F46',
    progressFilled: '#60A5FA',
    progressBuffered: '#52525B',
  },
  lyrics: {
    current: '#FAFAFA',
    inactive: '#71717A',
    background: 'rgba(9, 9, 11, 0.95)',
  },
};

const lightColors: ThemeColors = {
  background: {
    primary: '#FAFAFA',
    secondary: '#F4F4F5',
    card: '#FFFFFF',
    elevated: '#E4E4E7',
    muted: '#D4D4D8',
  },
  accent: '#18181B',
  accentHover: '#09090B',
  accentPressed: '#27272A',
  accentForeground: '#FAFAFA',
  secondary: '#18181B',
  text: {
    primary: '#18181B',
    secondary: '#52525B',
    tertiary: '#71717A',
    muted: '#A1A1AA',
    disabled: '#D4D4D8',
    inverse: '#FAFAFA',
  },
  success: '#16A34A',
  successMuted: '#22C55E',
  error: '#DC2626',
  errorMuted: '#EF4444',
  warning: '#D97706',
  warningMuted: '#F59E0B',
  info: '#2563EB',
  infoMuted: '#3B82F6',
  border: '#E4E4E7',
  borderMuted: '#D4D4D8',
  divider: '#E4E4E7',
  overlay: 'rgba(250, 250, 250, 0.8)',
  overlayLight: 'rgba(250, 250, 250, 0.6)',
  ring: '#3B82F6',
  player: {
    background: '#F4F4F5',
    card: '#FFFFFF',
    progressBackground: '#D4D4D8',
    progressFilled: '#3B82F6',
    progressBuffered: '#E4E4E7',
  },
  lyrics: {
    current: '#18181B',
    inactive: '#71717A',
    background: 'rgba(250, 250, 250, 0.95)',
  },
};

const amoledColors: ThemeColors = {
  background: {
    primary: '#000000',
    secondary: '#0A0A0A',
    card: '#18181B',
    elevated: '#27272A',
    muted: '#3F3F46',
  },
  accent: '#FAFAFA',
  accentHover: '#FFFFFF',
  accentPressed: '#E4E4E7',
  accentForeground: '#000000',
  secondary: '#FAFAFA',
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#52525B',
    disabled: '#3F3F46',
    inverse: '#000000',
  },
  success: '#22C55E',
  successMuted: '#16A34A',
  error: '#EF4444',
  errorMuted: '#DC2626',
  warning: '#F59E0B',
  warningMuted: '#D97706',
  info: '#3B82F6',
  infoMuted: '#2563EB',
  border: '#18181B',
  borderMuted: '#27272A',
  divider: '#18181B',
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.65)',
  ring: '#60A5FA',
  player: {
    background: '#0A0A0A',
    card: '#18181B',
    progressBackground: '#27272A',
    progressFilled: '#60A5FA',
    progressBuffered: '#3F3F46',
  },
  lyrics: {
    current: '#FAFAFA',
    inactive: '#71717A',
    background: 'rgba(0, 0, 0, 0.95)',
  },
};

const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

const borderRadius: ThemeBorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

const typography: ThemeTypography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    black: 'Inter_900Black',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    huge: 36,
    display: 48,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
};

const createShadows = (isDark: boolean): ThemeShadows => {
  const shadowColor = isDark ? '#000' : '#000';
  const shadowOpacity = isDark ? 0.3 : 0.1;
  
  return {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: shadowOpacity * 0.5,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 8,
      elevation: 3,
    },
    xl: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: shadowOpacity * 1.2,
      shadowRadius: 16,
      elevation: 5,
    },
    small: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: shadowOpacity * 0.5,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 4,
      elevation: 2,
    },
    large: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 8,
      elevation: 3,
    },
  };
};

const animations: ThemeAnimations = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 350,
    slow: 500,
    slower: 700,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'spring',
  },
};

const dimensions: ThemeDimensions = {
  miniPlayer: {
    height: 72,
    thumbnailSize: 56,
  },
  fullPlayer: {
    artworkSize: 320,
  },
  card: {
    albumSize: 180,
    artistSize: 160,
  },
  thumbnail: {
    small: 40,
    medium: 56,
    large: 80,
  },
};

const getColorsForMode = (mode: ThemeMode): ThemeColors => {
  switch (mode) {
    case 'light':
      return lightColors;
    case 'amoled':
      return amoledColors;
    case 'dark':
    default:
      return darkColors;
  }
};

export const createTheme = (mode: ThemeMode): Theme => {
  const colors = getColorsForMode(mode);
  const isDark = mode !== 'light';
  
  return {
    mode,
    colors,
    spacing,
    borderRadius,
    typography,
    shadows: createShadows(isDark),
    animations,
    dimensions,
  };
};

export const themes = {
  dark: createTheme('dark'),
  light: createTheme('light'),
  amoled: createTheme('amoled'),
} as const;

export const theme = themes.dark;

export type { Theme, ThemeColors, ThemeSpacing, ThemeBorderRadius, ThemeTypography, ThemeShadows, ThemeAnimations, ThemeDimensions };
