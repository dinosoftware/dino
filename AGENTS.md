# AGENTS.md

Coding guidelines for AI agents working in the Dino music app codebase.

## Project Overview

React Native/Expo mobile music streaming app for iOS/Android connecting to OpenSubsonic servers.

**Tech Stack:** Expo SDK 53, TypeScript (strict), Expo Router, Zustand, TanStack Query, Axios, react-native-track-player

## Commands

```bash
npm install              # Install dependencies
npm run lint             # Run ESLint
```

**IMPORTANT:** 
- Do NOT run build commands (`npm start`, `npm run android/ios`, `eas build`) after making changes
- The user builds and tests the app themselves using EAS
- No unit tests configured - verify changes via lint only

## File Structure

```
src/
  api/              # Axios client (client.ts) and OpenSubsonic endpoints (opensubsonic/)
  components/       # UI components: common/, Cards/, Menus/, Modals/, Player/, Skeletons/
  config/           # Theme (theme.ts), constants, environment
  hooks/            # Custom hooks; api/ subfolder for React Query hooks
  navigation/       # React Navigation navigators
  screens/          # Screen components organized by feature
  services/         # Business logic: player/, DownloadService, deeplink/
  stores/           # Zustand stores (auth, player, queue, download, etc.)
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
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Download } from 'lucide-react-native';
import { Button } from '../../components/common';
import { theme } from '../../config';
import { useDownloadStore } from '../../stores/downloadStore';
```

- Use relative paths (`../../`) instead of `@/` alias

### Component Pattern
```typescript
interface ComponentProps {
  title: string;
  onPress?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onPress }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: { color: theme.colors.text.primary },
});
```

### TypeScript
- Use `interface` for object types, `type` for unions
- Avoid `any` - use `unknown` when type is uncertain
- Props interfaces: `[Name]Props`
- Store hooks: `use[Name]Store` (e.g., `usePlayerStore`, `useDownloadStore`)
- API hooks: `use[Entity]` or `use[Entities]` (e.g., `useAlbum`, `useAlbums`)

### Theme (never hardcode colors/spacing)
```typescript
import { theme } from '../../config';

// Available: colors, spacing, borderRadius, typography, shadows, animations, dimensions
styles: {
  backgroundColor: theme.colors.background.primary,
  padding: theme.spacing.md,
  fontSize: theme.typography.fontSize.base,
  fontFamily: theme.typography.fontFamily.semibold,
  borderRadius: theme.borderRadius.md,
  ...theme.shadows.sm,
}
```

### React Query Pattern
```typescript
export const useAlbum = (albumId: string) => {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const response = await getAlbum(albumId);
      return response.album;
    },
    enabled: !!albumId,
    staleTime: 5 * 60 * 1000, // Optional: prevent refetch on mount
  });
};
```

### Zustand Stores
```typescript
interface PlayerStore {
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  setCurrentTrack: (track) => set({ currentTrack: track }),
}));
```

### Error Handling & Logging
```typescript
// API calls with descriptive errors
try {
  const response = await getAlbum(albumId);
  return response.album;
} catch (error) {
  console.error('[useAlbum] Failed:', error);
  throw new Error('Failed to load album.');
}

// Use tagged logging for debugging
console.log('[API Client] Request:', endpoint);
console.log('[PlayerService] State changed:', state);
```

### Barrel Exports
```typescript
// src/components/common/index.ts
export * from './Button';
export * from './Avatar';

// Usage
import { Button, Avatar } from '../../components/common';
```

### API Types
- All OpenSubsonic response types in `src/api/opensubsonic/types.ts`
- Response wrapper: `SubsonicResponse<T>` with `'subsonic-response'` key
- Entity types: `Artist`, `Album`, `Track`, `Playlist`, `Lyrics`, etc.

## Key Notes

- **Expo Go not supported** - must build dev client via EAS
- **Strict TypeScript** - all types must be correct, no `any`
- **Haptic feedback** - use `expo-haptics` on interactive elements
- **Dark theme only** - Zinc-based palette, no light theme
- **Lucide icons** - use `lucide-react-native` for icons
- **Offline support** - DownloadStore tracks downloaded content
- **Player architecture** - TrackPlayerService, QueueSyncManager, ScrobblingManager
