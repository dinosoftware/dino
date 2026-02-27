/**
 * Dino Music App - Queue Sync Manager
 * Handles server queue synchronization with playback position tracking
 */

import { getPlayQueue, savePlayQueue } from '../../api/opensubsonic/playqueue';
import { useQueueStore, usePlayerStore, useSettingsStore } from '../../stores';
import { setQueueSyncCallback } from '../../stores/queueStore';
import { Track } from '../../api/opensubsonic/types';
import { QUEUE_SYNC_CONFIG } from '../../config/constants';

class QueueSyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Start automatic queue synchronization
   */
  start() {
    const { autoSyncQueue, queueSyncInterval } = useSettingsStore.getState();

    if (!autoSyncQueue) {
      console.log('[QueueSync] Auto-sync disabled in settings');
      return;
    }

    console.log('[QueueSync] Starting automatic sync with interval:', queueSyncInterval);

    // Register callback for queue store to trigger sync
    setQueueSyncCallback((debounced = true) => {
      if (debounced) {
        this.syncToServerDebounced();
      } else {
        this.syncToServer();
      }
    });

    // Clear existing interval
    this.stop();

    // Don't sync immediately - wait for loadFromServer to complete first
    // The caller (TrackPlayerService) will call loadFromServer() and then
    // periodic sync will handle subsequent syncs
    
    // Setup periodic sync
    this.syncInterval = setInterval(() => {
      this.syncToServer();
    }, queueSyncInterval);
  }

  /**
   * Stop automatic queue synchronization
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }

    console.log('[QueueSync] Stopped');
  }

  /**
   * Sync queue to server with current position
   * This is called by ScrobblingManager when updating playback progress
   * @param currentPosition - Optional current playback position
   * @param force - If true, bypass autoSyncQueue setting check
   */
  async syncToServer(currentPosition?: number, force: boolean = false): Promise<void> {
    const { autoSyncQueue } = useSettingsStore.getState();
    
    if (!force && !autoSyncQueue) {
      return;
    }

    // Debounce: Don't sync more frequently than SYNC_DEBOUNCE
    const now = Date.now();
    if (now - this.lastSyncTime < QUEUE_SYNC_CONFIG.SYNC_DEBOUNCE && !currentPosition) {
      console.log('[QueueSync] Sync debounced (too frequent)');
      return;
    }

    if (this.isSyncing) {
      console.log('[QueueSync] Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const { queue, currentIndex, setServerSyncStatus, markServerSynced } = useQueueStore.getState();

    // Don't sync empty queue
    if (queue.length === 0) {
      console.log('[QueueSync] Queue is empty, skipping sync');
      this.isSyncing = false;
      return;
    }

    try {
      setServerSyncStatus('syncing');
      
      const trackIds = queue.map(track => track.id);
      const currentTrackId = currentIndex >= 0 && currentIndex < queue.length 
        ? queue[currentIndex]?.id 
        : undefined;
      
      // Use provided position or get current playback position
      let position: number | undefined = currentPosition;
      if (position === undefined) {
        const { progress } = usePlayerStore.getState();
        position = Math.floor(progress.position * 1000); // Convert to milliseconds
      } else {
        position = Math.floor(position * 1000); // Convert to milliseconds
      }

      console.log('[QueueSync] Syncing to server:', {
        trackCount: trackIds.length,
        currentTrackId,
        position: position / 1000, // Log in seconds for readability
      });

      await savePlayQueue(trackIds, currentTrackId, position);
      
      markServerSynced();
      this.lastSyncTime = now;
      
      console.log('[QueueSync] Successfully synced to server');
    } catch (error) {
      console.error('[QueueSync] Failed to sync to server:', error);
      setServerSyncStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync queue to server with debouncing
   * Useful for queue modifications (add, remove, reorder)
   */
  syncToServerDebounced(delay: number = 2000): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.syncToServer();
    }, delay);
  }

  /**
   * Load queue from server
   * Returns true if server queue was loaded, false if using local queue
   * @param force - If true, bypass autoSyncQueue setting check
   * @param forceUseServer - If true, always use server queue regardless of timestamps
   */
  async loadFromServer(force: boolean = false, forceUseServer: boolean = false): Promise<boolean> {
    const { autoSyncQueue } = useSettingsStore.getState();
    
    if (!force && !autoSyncQueue) {
      console.log('[QueueSync] Auto-sync disabled, skipping server load');
      return false;
    }

    try {
      console.log('[QueueSync] Loading queue from server...');
      
      const response = await getPlayQueue();
      const serverQueue = response.playQueue;
      
      console.log('[QueueSync] Server queue:', {
        hasPlayQueue: !!serverQueue,
        entryLength: serverQueue?.entry?.length,
        changed: serverQueue?.changed,
        current: serverQueue?.current,
      });

      if (!serverQueue || !serverQueue.entry || serverQueue.entry.length === 0) {
        console.log('[QueueSync] No queue on server');
        return false;
      }

      const { queue: localQueue, setQueue, markServerSynced } = useQueueStore.getState();

      // If forceUseServer is true, always use server queue
      // Otherwise, check if we should use server queue based on timestamps
      const shouldUseServerQueue = forceUseServer || this.shouldUseServerQueue(
        serverQueue,
        localQueue
      );

      if (shouldUseServerQueue) {
        const positionSeconds = serverQueue.position ? serverQueue.position / 1000 : 0;
        
        // Server returns current as track ID, not index - need to find the index
        const currentTrackId = serverQueue.current;
        const currentIndex = currentTrackId 
          ? serverQueue.entry.findIndex(track => track.id === currentTrackId)
          : 0;
        
        console.log('[QueueSync] Using server queue:', {
          trackCount: serverQueue.entry.length,
          currentIndex,
          currentTrackId,
          position: positionSeconds,
        });

        // Load server queue using setQueueFromServer to preserve restoredPosition
        useQueueStore.getState().setQueueFromServer(serverQueue.entry, currentIndex);

        // Store the position to restore after track is loaded
        if (serverQueue.position && positionSeconds > 0) {
          // Store in player store so TrackPlayerService can use it
          usePlayerStore.setState({ 
            restoredPosition: positionSeconds 
          });
          console.log('[QueueSync] Will restore position:', positionSeconds);
        }

        markServerSynced();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[QueueSync] Failed to load from server:', error);
      useQueueStore.getState().setServerSyncStatus('error');
      return false;
    }
  }

  /**
   * Determine if we should use server queue over local queue
   * Returns true if server queue is newer or local queue is empty
   */
  private shouldUseServerQueue(
    serverQueue: { changed?: string; entry?: Track[] },
    localQueue: Track[]
  ): boolean {
    // If local queue is empty, always use server queue
    if (localQueue.length === 0 && serverQueue.entry && serverQueue.entry.length > 0) {
      return true;
    }

    // If server queue is empty, keep local queue
    if (!serverQueue.entry || serverQueue.entry.length === 0) {
      return false;
    }

    // Check timestamp to see which queue is newer
    if (serverQueue.changed) {
      const serverTimestamp = new Date(serverQueue.changed).getTime();
      const localTimestamp = useQueueStore.getState().lastServerSync;

      // If server queue is significantly newer, prefer it
      if (serverTimestamp - localTimestamp > QUEUE_SYNC_CONFIG.CONFLICT_THRESHOLD) {
        console.log('[QueueSync] Server queue is newer, using it');
        return true;
      }
    }

    // Default: keep local queue
    return false;
  }

  /**
   * Trigger manual sync (for user-initiated sync)
   */
  async manualSync(): Promise<void> {
    console.log('[QueueSync] Manual sync triggered');
    // Bypass debouncing for manual sync
    this.lastSyncTime = 0;
    await this.syncToServer();
  }
}

export const queueSyncManager = new QueueSyncManager();
