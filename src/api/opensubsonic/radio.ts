/**
 * Dino Music App - Radio API
 * Get similar songs for instant mix / radio feature
 */

import { apiClient } from '../client';
import { useSettingsStore } from '../../stores/settingsStore';
import { useServerStore } from '../../stores/serverStore';
import { GetSimilarSongs2Response, GetSonicSimilarTracksResponse, Track } from './types';

export const getSimilarSongs2 = async (
  trackId: string,
  count?: number
): Promise<GetSimilarSongs2Response> => {
  const resolvedCount = count ?? useSettingsStore.getState().instantMixSize;
  
  return await apiClient.request<GetSimilarSongs2Response>('getSimilarSongs2', {
    id: trackId,
    count: resolvedCount,
  });
};

export const getSonicSimilarTracks = async (
  trackId: string,
  count?: number
): Promise<GetSonicSimilarTracksResponse> => {
  const resolvedCount = count ?? useSettingsStore.getState().instantMixSize;

  return await apiClient.request<GetSonicSimilarTracksResponse>('getSonicSimilarTracks', {
    id: trackId,
    count: resolvedCount,
  });
};

export const getSmartSimilarTracks = async (
  trackId: string,
  count?: number
): Promise<Track[]> => {
  const settings = useSettingsStore.getState();

  if (settings.useSonicSimilarity) {
    try {
      const response = await getSonicSimilarTracks(trackId, count);
      console.log('[Radio] getSonicSimilarTracks response keys:', Object.keys(response));
      console.log('[Radio] getSonicSimilarTracks response:', JSON.stringify(response).substring(0, 500));

      const matches = (response as any).sonicMatch || (response as any).sonicSimilarTracks
        || (response as any).match;
      if (Array.isArray(matches) && matches.length > 0) {
        return matches.map((match: any) => match.entry || match);
      }

      console.log('[Radio] getSonicSimilarTracks returned empty, falling back');
    } catch (error) {
      console.warn('[Radio] getSonicSimilarTracks failed, falling back to getSimilarSongs2:', error);
    }
  }

  const response = await getSimilarSongs2(trackId, count);
  return response.similarSongs2?.song || [];
};
