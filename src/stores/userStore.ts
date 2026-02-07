/**
 * Dino Music App - User Store
 * Current user information
 */

import { create } from 'zustand';
import { User, getCurrentUser } from '../api/opensubsonic/user';

interface UserStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchUser: () => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      console.log('[UserStore] Fetched user:', user.username);
      set({ user, isLoading: false });
    } catch (error) {
      console.error('[UserStore] Failed to fetch user:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user',
        isLoading: false 
      });
    }
  },

  clearUser: () => {
    set({ user: null, error: null });
  },
}));
