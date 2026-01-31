/**
 * Dino Music App - Navigation Store
 * Simple navigation state management
 */

import { create } from 'zustand';

export type Screen =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'library' }
  | { name: 'downloads' }
  | { name: 'settings' }
  | { name: 'shares' }
  | { name: 'album-detail'; params: { albumId: string } }
  | { name: 'artist-detail'; params: { artistId: string } }
  | { name: 'playlist-detail'; params: { playlistId: string } };

interface NavigationStore {
  currentScreen: Screen;
  screenStack: Screen[];
  showFullPlayer: boolean;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  setShowFullPlayer: (show: boolean) => void;
  closeFullPlayer: () => void;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  currentScreen: { name: 'home' },
  screenStack: [],
  showFullPlayer: false,

  navigate: (screen: Screen) =>
    set((state) => ({
      screenStack: [...state.screenStack, state.currentScreen],
      currentScreen: screen,
    })),

  goBack: () =>
    set((state) => {
      if (state.screenStack.length === 0) return state;
      const newStack = [...state.screenStack];
      const previousScreen = newStack.pop()!;
      return {
        screenStack: newStack,
        currentScreen: previousScreen,
      };
    }),

  canGoBack: () => get().screenStack.length > 0,

  setShowFullPlayer: (show: boolean) => set({ showFullPlayer: show }),

  closeFullPlayer: () => set({ showFullPlayer: false }),
}));
