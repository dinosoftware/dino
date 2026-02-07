/**
 * Dino Music App - Lyrics Manager
 * Lyrics fetching, caching, and sync logic
 */

import TrackPlayer from 'react-native-track-player';
import * as FileSystem from 'expo-file-system';
import { getLyricsBySongId } from '../../api/opensubsonic/lyrics';
import { usePlayerStore } from '../../stores';
import { useDownloadStore } from '../../stores/downloadStore';
import { LYRICS_SYNC_CONFIG } from '../../config/constants';
import { LyricLine } from '../../api/opensubsonic/types';

class LyricsManager {
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private lyricsCache: Map<string, any> = new Map();

  /**
   * Fetch and cache lyrics for a track
   */
  async fetchLyrics(trackId: string, forceRefresh: boolean = false, setInStore: boolean = true) {
    try {
      // Check cache first
      if (!forceRefresh && this.lyricsCache.has(trackId)) {
        // console.log('[Lyrics] Using cached lyrics for:', trackId);
        const cachedLyrics = this.lyricsCache.get(trackId);
        if (setInStore) {
          this.setLyricsInStore(cachedLyrics);
        }
        return cachedLyrics;
      }

      // Check if track has downloaded lyrics
      const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(trackId);
      if (downloadedTrack?.lyricsUri) {
        // console.log('[Lyrics] Loading from downloaded file:', downloadedTrack.lyricsUri);
        try {
          const lyricsContent = await FileSystem.readAsStringAsync(downloadedTrack.lyricsUri);
          const lyrics = JSON.parse(lyricsContent);
          
          // Cache in memory
          this.lyricsCache.set(trackId, lyrics);
          
          if (setInStore) {
            this.setLyricsInStore(lyrics);
          }
          
          return lyrics;
        } catch (error) {
          console.error('[Lyrics] Failed to load downloaded lyrics:', error);
          // Fall through to fetch from server
        }
      }

      // Set loading state only if we're setting in store
      if (setInStore) {
        usePlayerStore.getState().setLyricsLoading(true, trackId);
      }
      
      // Fetch from server (skip caching for now due to MMKV serialization issues)
      // console.log('[Lyrics] Fetching from server:', trackId);
      const response = await getLyricsBySongId(trackId);
      
      // console.log('[Lyrics] Response:', JSON.stringify(response, null, 2));
      
      // Handle OpenSubsonic lyricsList format
      // Cast to any because different servers return different formats
      const responseAny = response as any;
      let lyrics = null;
      
      if (responseAny?.lyricsList?.structuredLyrics?.[0]) {
        // OpenSubsonic format: response.lyricsList.structuredLyrics[0]
        lyrics = responseAny.lyricsList.structuredLyrics[0];
        // console.log('[Lyrics] Found structuredLyrics format');
      } else if (response?.lyrics) {
        // Standard format: response.lyrics
        lyrics = response.lyrics;
        // console.log('[Lyrics] Found standard lyrics format');
      } else {
        lyrics = responseAny;
        // console.log('[Lyrics] Using response as lyrics');
      }
      
      // console.log('[Lyrics] Parsed lyrics:', {
      //   hasLine: !!lyrics?.line,
      //   lineCount: lyrics?.line?.length || 0,
      //   hasValue: !!lyrics?.value,
      //   valueLength: lyrics?.value?.length || 0,
      //   synced: lyrics?.synced,
      // });

      // Cache in memory
      this.lyricsCache.set(trackId, lyrics);

      // Only set in store if requested
      if (setInStore) {
        this.setLyricsInStore(lyrics);
        // Clear loading state
        usePlayerStore.getState().setLyricsLoading(false);
      }

      return lyrics;
    } catch (error) {
      // Silently fail - most tracks won't have lyrics anyway
      // console.log('[Lyrics] Failed to fetch:', error);

      // Only update store if requested
      if (setInStore) {
        usePlayerStore.getState().setCurrentLyrics(null);
        // Clear loading state
        usePlayerStore.getState().setLyricsLoading(false);
      }

      return null;
    }
  }

  /**
   * Set lyrics in the player store
   */
  private setLyricsInStore(lyrics: any) {
    const { setCurrentLyrics } = usePlayerStore.getState();

    if (!lyrics) {
      // console.log('[Lyrics] No lyrics object');
      setCurrentLyrics(null);
      return;
    }

    // Try different response structures (OpenSubsonic variations)
    const lines = lyrics.line || lyrics.structuredLyrics?.line || lyrics.lines;
    const plainText = lyrics.value || lyrics.text || lyrics.unsyncedLyrics;
    const isSynced = lyrics.synced !== false; // If synced field exists and is false, not synced

    // console.log('[Lyrics] Checking lyrics structure:', {
    //   hasLines: !!lines,
    //   linesLength: Array.isArray(lines) ? lines.length : 0,
    //   hasPlainText: !!plainText,
    //   plainTextLength: typeof plainText === 'string' ? plainText.length : 0,
    //   isSynced: isSynced,
    //   lyricsKeys: Object.keys(lyrics),
    // });

    // Check if lyrics are synchronized (have timestamps)
    if (lines && Array.isArray(lines) && lines.length > 0) {
      // Check if lines actually have timestamps (start field)
      const hasTimestamps = lines.some((line: any) => line.start !== undefined);
      
      if (hasTimestamps && isSynced) {
        // Synced lyrics with timestamps
        // console.log('[Lyrics] Setting synced lyrics with', lines.length, 'lines');
        setCurrentLyrics({
          type: 'synced',
          lines: lines,
          plainText: null,
          currentLineIndex: 0,
          isScrollLocked: true,
        });
      } else {
        // Lines without timestamps - convert to plain text
        // console.log('[Lyrics] Converting unsynced lines to plain text');
        const text = lines.map((line: any) => line.value || line).join('\n');
        setCurrentLyrics({
          type: 'unsynced',
          lines: null,
          plainText: text,
          currentLineIndex: 0,
          isScrollLocked: false,
        });
      }
    } else if (plainText && typeof plainText === 'string') {
      // Unsynchronized plain text lyrics
      // console.log('[Lyrics] Setting unsynced lyrics,', plainText.length, 'characters');
      setCurrentLyrics({
        type: 'unsynced',
        lines: null,
        plainText: plainText,
        currentLineIndex: 0,
        isScrollLocked: false,
      });
    } else {
      // No lyrics available
      // console.log('[Lyrics] No valid lyrics found in response');
      setCurrentLyrics(null);
    }
  }

  /**
   * Start syncing lyrics with playback position
   */
  startSync() {
    if (this.syncIntervalId) return;

    this.syncIntervalId = setInterval(() => {
      this.updateCurrentLine();
    }, LYRICS_SYNC_CONFIG.UPDATE_INTERVAL);

    // console.log('[Lyrics] Started sync');
  }

  /**
   * Stop syncing lyrics
   */
  stopSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      // console.log('[Lyrics] Stopped sync');
    }
  }

  /**
   * Update the current line based on playback position
   */
  private updateCurrentLine() {
    const { currentLyrics, progress } = usePlayerStore.getState();

    if (!currentLyrics || currentLyrics.type !== 'synced' || !currentLyrics.lines) {
      return;
    }

    const positionMs = progress.position * 1000; // Convert to milliseconds
    const lines = currentLyrics.lines;

    // Find the current line
    let currentIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];

      if (nextLine) {
        // Check if position is between current and next line
        if (positionMs >= currentLine.start && positionMs < nextLine.start) {
          currentIndex = i;
          break;
        }
      } else {
        // Last line
        if (positionMs >= currentLine.start) {
          currentIndex = i;
        }
      }
    }

    // Update store if line changed
    if (currentIndex !== currentLyrics.currentLineIndex) {
      usePlayerStore.getState().setCurrentLineIndex(currentIndex);
    }
  }

  /**
   * Seek to a lyric line's timestamp
   */
  async seekToLine(line: LyricLine) {
    const positionSeconds = line.start / 1000;
    
    // console.log('[Lyrics] Seeking to line:', line.value, 'at', positionSeconds, 'seconds');
    
    try {
      await TrackPlayer.seekTo(positionSeconds);
      usePlayerStore.getState().setProgress(positionSeconds, usePlayerStore.getState().progress.duration);
    } catch (error) {
      console.error('[Lyrics] Failed to seek:', error);
    }
  }

}

// Export singleton instance
export const lyricsManager = new LyricsManager();
