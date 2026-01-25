/**
 * Dino Music App - Streaming API
 * Stream, download, cover art, and scrobble endpoints
 */

import { apiClient } from '../client';

/**
 * Get stream URL for a track
 */
export const getStreamUrl = async (
  trackId: string,
  maxBitRate?: string,
  format?: string
): Promise<string> => {
  return await apiClient.buildStreamUrl(trackId, maxBitRate, format);
};

/**
 * Get cover art URL
 */
export const getCoverArtUrl = async (
  coverArtId: string,
  size?: number
): Promise<string> => {
  return await apiClient.buildCoverArtUrl(coverArtId, size);
};

/**
 * Scrobble a track (update play count and last played)
 */
export const scrobble = async (
  trackId: string,
  time?: number,
  submission?: boolean
): Promise<void> => {
  await apiClient.get('scrobble', {
    id: trackId,
    ...(time && { time }),
    ...(submission !== undefined && { submission }),
  });
};
