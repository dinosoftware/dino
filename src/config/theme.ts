/**
 * Dino Music App - Modern Theme Configuration
 * shadcn/ui-inspired design with clean, consistent aesthetics
 */

export const colors = {
  // Modern Backgrounds - Zinc/Slate palette (shadcn-inspired)
  background: {
    primary: '#09090B',      // zinc-950 - softer than pure black
    secondary: '#18181B',    // zinc-900 - elevated surfaces
    card: '#27272A',         // zinc-800 - card backgrounds
    elevated: '#3F3F46',     // zinc-700 - hover/elevated states
    muted: '#52525B',        // zinc-600 - muted backgrounds
  },

  // Modern Accent - White for static UI elements
  accent: '#FAFAFA',         // zinc-50 - white
  accentHover: '#FFFFFF',    // pure white - hover state
  accentPressed: '#E4E4E7',  // zinc-200 - pressed state
  accentForeground: '#09090B', // Dark for text on accent
  
  // Keep secondary for compatibility
  secondary: '#FAFAFA',
  
  // Text - Refined hierarchy with better contrast
  text: {
    primary: '#FAFAFA',      // zinc-50 - softer white
    secondary: '#A1A1AA',    // zinc-400 - medium gray
    tertiary: '#71717A',     // zinc-500 - subtle gray
    muted: '#52525B',        // zinc-600 - very subtle
    disabled: '#3F3F46',     // zinc-700 - disabled state
    inverse: '#09090B',      // For text on light backgrounds
  },

  // Status colors - More muted, modern palette
  success: '#22C55E',        // green-500
  successMuted: '#16A34A',   // green-600
  error: '#EF4444',          // red-500
  errorMuted: '#DC2626',     // red-600
  warning: '#F59E0B',        // amber-500
  warningMuted: '#D97706',   // amber-600
  info: '#3B82F6',           // blue-500
  infoMuted: '#2563EB',      // blue-600

  // UI Elements - Subtle, modern borders
  border: '#27272A',         // zinc-800 - primary borders
  borderMuted: '#3F3F46',    // zinc-700 - hover borders
  divider: '#27272A',        // zinc-800 - subtle dividers
  overlay: 'rgba(9, 9, 11, 0.8)',     // Dark overlay
  overlayLight: 'rgba(9, 9, 11, 0.6)', // Light overlay
  ring: '#60A5FA',           // Focus ring color

  // Player - Clean, modern design
  player: {
    background: '#18181B',   // zinc-900
    card: '#27272A',         // zinc-800
    progressBackground: '#3F3F46', // zinc-700
    progressFilled: '#60A5FA',     // blue-400
    progressBuffered: '#52525B',   // zinc-600
  },

  // Lyrics
  lyrics: {
    current: '#FAFAFA',      // zinc-50
    inactive: '#71717A',     // zinc-500
    background: 'rgba(9, 9, 11, 0.95)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,      // shadcn uses more generous spacing
  lg: 24,      // Better breathing room
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 6,       // shadcn standard small radius
  md: 8,       // Medium radius
  lg: 12,      // Large radius
  xl: 16,      // Extra large
  xxl: 24,
  round: 9999, // Fully rounded
};

export const typography = {
  // Modern Font Family - Inter
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    black: 'Inter_900Black',
  },

  // Font Sizes - shadcn-inspired scale (more generous)
  fontSize: {
    xs: 12,      // More readable small text
    sm: 14,      // Body small
    base: 16,    // Base body text (shadcn standard)
    md: 16,      // Alias for base
    lg: 18,      // Large body
    xl: 20,      // Heading 4
    xxl: 24,     // Heading 3
    xxxl: 30,    // Heading 2
    huge: 36,    // Heading 1
    display: 48, // Display text
  },

  // Font Weights - Refined
  fontWeight: {
    regular: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
    black: '900' as '900',
  },

  // Line Heights - shadcn standards
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing - More subtle
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
};

export const shadows = {
  // Minimal shadows - shadcn prefers borders over heavy shadows
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  // Keep aliases for backward compatibility
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const animations = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 350,   // Slightly slower for premium feel
    slow: 500,
    slower: 700,
  },
  easing: {
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
    spring: 'spring' as const,
  },
};

// Dimensions - More generous for modern feel
export const dimensions = {
  miniPlayer: {
    height: 72,        // Slightly taller for better touch targets
    thumbnailSize: 56,
  },
  fullPlayer: {
    artworkSize: 320,
  },
  card: {
    albumSize: 180,    // Slightly larger cards
    artistSize: 160,
  },
  thumbnail: {
    small: 40,
    medium: 56,
    large: 80,
  },
};

// Export complete theme object
export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  animations,
  dimensions,
};

export type Theme = typeof theme;
