/**
 * Dino Music App - Radio Store
 * Radio/Instant Mix mode state management with Zustand
 */

import { create } from 'zustand';
import { Track } from '../api/opensubsonic/types';

interface RadioStore {
  isRadioMode: boolean;
  seedTrack: Track | null;
  playedTrackIds: Set<string>;
  
  // Actions
  startRadio: (track: Track) => void;
  stopRadio: () => void;
  addPlayedTrack: (trackId: string) => void;
  clearHistory: () => void;
}

export const useRadioStore = create<RadioStore>((set) => ({
  isRadioMode: false,
  seedTrack: null,
  playedTrackIds: new Set(),

  startRadio: (track) => {
    set({
      isRadioMode: true,
      seedTrack: track,
      playedTrackIds: new Set([track.id]),
    });
  },

  stopRadio: () => {
    set({
      isRadioMode: false,
      seedTrack: null,
      playedTrackIds: new Set(),
    });
  },

  addPlayedTrack: (trackId) => {
    set((state) => {
      const playedTrackIds = new Set(state.playedTrackIds);
      playedTrackIds.add(trackId);
      return { playedTrackIds };
    });
  },

  clearHistory: () => {
    set({ playedTrackIds: new Set() });
  },
}));
