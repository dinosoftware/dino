# AGENTS.md

Coding guidelines for AI agents working in the Dino music app codebase.

## Project Overview

React Native/Expo mobile music streaming app for iOS/Android connecting to OpenSubsonic servers.

**Tech Stack:** Expo SDK 53, TypeScript (strict), Expo Router, Zustand, TanStack Query, Axios, react-native-track-player

## Commands

```bash
npm install              # Install dependencies
npm run lint             # Run linter (optional)
```

**IMPORTANT:** 
- Do NOT run build commands (`npm start`, `npm run android/ios`, `eas build`) after making changes
- The user builds and tests the app themselves using EAS
- No unit tests configured

## File Structure

```
src/
  api/              # Axios client and OpenSubsonic endpoints
  components/       # UI components (common/, Cards/, Menus/, Modals/, Player/, Skeletons/)
  config/           # Theme (theme.ts) and constants
  hooks/            # Custom hooks (api/ for React Query)
  navigation/       # React Navigation navigators
  screens/          # Screen components by feature
  services/         # Business logic (player, downloads, etc.)
  stores/           # Zustand stores
  utils/            # Utility functions
app/_layout.tsx     # Expo Router root layout
```

## Code Style

### File Headers
```typescript
/**
 * Dino Music App - [Component Name]
 * [Brief description]
 */
```

### Imports (order: React/RN → Third-party → Internal)
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/common';
import { theme } from '../../config';
```

Use relative paths (`../../`) instead of `@/` alias.

### Component Pattern
```typescript
interface ComponentProps {
  title: string;
  onPress?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onPress }) => {
  const [state, setState] = useState(false);
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: { color: theme.colors.text.primary },
});
```

### TypeScript
- Use `interface` for objects, `type` for unions
- Avoid `any` - use `unknown` when needed
- Props interfaces: `[Name]Props`
- Store hooks: `use[Name]Store`
- API hooks: `use[Entity]` (e.g., `useAlbum`, `useAlbums`)

### Theme (never hardcode colors/spacing)
```typescript
import { theme } from '../../config';

// Available: colors.*, spacing.*, borderRadius.*, typography.fontSize.*, typography.fontFamily.*
styles: {
  backgroundColor: theme.colors.background.primary,
  padding: theme.spacing.lg,
  fontSize: theme.typography.fontSize.base,
  fontFamily: theme.typography.fontFamily.bold,
}
```

### Error Handling
```typescript
// API calls
try {
  const response = await getAlbum(albumId);
  return response.album;
} catch (error) {
  console.error('[useAlbum] Failed:', error);
  throw new Error('Failed to load album.');
}

// React Query - conditional fetching
useQuery({
  queryKey: ['album', albumId],
  queryFn: () => getAlbum(albumId),
  enabled: !!albumId,
});
```

### Zustand Stores
```typescript
interface Store {
  items: Item[];
  setItems: (items: Item[]) => void;
}

export const useStore = create<Store>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
```

### Barrel Exports
```typescript
// src/components/common/index.ts
export * from './Button';
export * from './Avatar';

// Usage
import { Button, Avatar } from '../../components/common';
```

### Logging
```typescript
console.log('[API Client] Request:', endpoint);
console.error('[PlayerService] Error:', error);
```

## Key Notes

- **Expo Go not supported** - must build dev client via EAS
- **Strict TypeScript** - all types must be correct
- **Haptic feedback** - use `expo-haptics` on interactive elements
- **Dark theme only** - Zinc-based palette, no light theme
