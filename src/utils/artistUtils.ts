/**
 * Dino Music App - Artist Utilities
 * Helper functions for formatting artist information
 */

import { Track, Artist } from '../api/opensubsonic/types';

/**
 * Get formatted artist string for a track
 * Handles displayArtist, artists array, and single artist fallback
 */
export const getTrackArtistString = (track: Track): string => {
  // First priority: displayArtist (pre-formatted by server)
  if (track.displayArtist) {
    return track.displayArtist;
  }
  
  // Second priority: artists array (format as comma-separated)
  if (track.artists && track.artists.length > 0) {
    return track.artists.map(artist => artist.name).join(', ');
  }
  
  // Third priority: single artist field
  if (track.artist) {
    return track.artist;
  }
  
  // Fallback
  return 'Unknown Artist';
};

/**
 * Get artist name from Artist object or string
 */
export const getArtistName = (artist: Artist | string | undefined): string => {
  if (!artist) return 'Unknown Artist';
  if (typeof artist === 'string') return artist;
  return artist.name || 'Unknown Artist';
};
