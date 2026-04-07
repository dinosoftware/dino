"use strict";
/**
 * Dino Music App - Artist Utilities
 * Helper functions for formatting artist information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtistName = exports.getTrackArtistString = void 0;
/**
 * Get formatted artist string for a track
 * Handles displayArtist, artists array, and single artist fallback
 */
var getTrackArtistString = function (track) {
    // First priority: displayArtist (pre-formatted by server)
    if (track.displayArtist) {
        return track.displayArtist;
    }
    // Second priority: artists array (format as comma-separated)
    if (track.artists && track.artists.length > 0) {
        return track.artists.map(function (artist) { return artist.name; }).join(', ');
    }
    // Third priority: single artist field
    if (track.artist) {
        return track.artist;
    }
    // Fallback
    return 'Unknown Artist';
};
exports.getTrackArtistString = getTrackArtistString;
/**
 * Get artist name from Artist object or string
 */
var getArtistName = function (artist) {
    if (!artist)
        return 'Unknown Artist';
    if (typeof artist === 'string')
        return artist;
    return artist.name || 'Unknown Artist';
};
exports.getArtistName = getArtistName;
