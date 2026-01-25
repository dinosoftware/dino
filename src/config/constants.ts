/**
 * Dino Music App - Constants
 * App-wide constants, feature flags, and default values
 */

import Constants from 'expo-constants';

// App Info
export const APP_NAME = 'Dino';
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
export const CLIENT_NAME = 'Dino';

// OpenSubsonic API
export const API_VERSION = '1.16.1';
export const API_FORMAT = 'json';

// Default Server Configuration (from app.config.js)
export const DEFAULT_SERVERS = Constants.expoConfig?.extra?.defaultServers || [];
export const ALLOW_ADDITIONAL_SERVERS = Constants.expoConfig?.extra?.allowAdditionalServers ?? true;
export const REQUIRE_SERVER_ON_FIRST_LAUNCH = Constants.expoConfig?.extra?.requireServerOnFirstLaunch ?? true;

// Storage Keys (MMKV)
export const STORAGE_KEYS = {
  // Authentication
  CREDENTIALS: 'auth:credentials',
  CURRENT_SERVER_ID: 'auth:current_server_id',
  HAS_COMPLETED_SETUP: 'auth:has_completed_setup',
  
  // Servers
  SERVERS: 'servers:list',
  
  // Player
  QUEUE: 'player:queue',
  CURRENT_TRACK_INDEX: 'player:current_index',
  PLAYBACK_POSITION: 'player:position',
  SHUFFLE_ENABLED: 'player:shuffle',
  REPEAT_MODE: 'player:repeat',
  
  // Settings
  SETTINGS: 'settings:all',
  
  // Cache
  LYRICS_PREFIX: 'lyrics:',
  API_CACHE_PREFIX: 'api:',
  
  // Offline
  DOWNLOADED_TRACKS: 'offline:tracks',
  DOWNLOADED_ALBUMS: 'offline:albums',
  DOWNLOADED_PLAYLISTS: 'offline:playlists',
};

// Streaming Quality Options (kbps)
export const STREAMING_QUALITY_OPTIONS = [
  { value: '0', label: 'Original (No transcoding)', bitrate: 0 },
  { value: '320', label: 'High (320 kbps)', bitrate: 320 },
  { value: '256', label: 'High (256 kbps)', bitrate: 256 },
  { value: '192', label: 'Medium (192 kbps)', bitrate: 192 },
  { value: '128', label: 'Medium (128 kbps)', bitrate: 128 },
  { value: '96', label: 'Low (96 kbps)', bitrate: 96 },
  { value: '64', label: 'Very Low (64 kbps)', bitrate: 64 },
] as const;

// Streaming Format Options
export const STREAMING_FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'opus', label: 'Opus' },
  { value: 'aac', label: 'AAC' },
  { value: 'flac', label: 'FLAC (Lossless)' },
  { value: 'original', label: 'Original' },
] as const;

// Default Settings
export const DEFAULT_SETTINGS = {
  // Streaming
  streamingQualityWiFi: '320' as const,
  streamingQualityMobile: '128' as const,
  streamingFormatWiFi: 'mp3' as const,
  streamingFormatMobile: 'mp3' as const,
  
  // Downloads
  wifiOnlyDownloads: true,
  maxConcurrentDownloads: 3,
  
  // Playback
  crossfadeDuration: 0,
  gaplessPlayback: true,
  normalizeVolume: false,
  
  // Radio
  radioQueueSize: 20,
  
  // Storage
  storageLimit: 5120, // 5GB in MB
  streamCacheSize: 100, // 100MB
  
  // Chromecast
  autoCastOnConnect: false,
  
  // Lyrics
  lyricsFontSize: 'medium' as 'small' | 'medium' | 'large',
  autoScrollLyrics: true,
  showLyricsTimestamps: false,
  
  // Queue Sync
  autoSyncQueue: true,
  queueSyncInterval: 30000, // 30 seconds
  
  // Scrobbling
  enableScrobbling: true,
  scrobbleProgressInterval: 30000, // 30 seconds
};

// Lyrics Font Sizes (all text stays bold, only opacity changes)
export const LYRICS_FONT_SIZES = {
  small: {
    current: 24,
    inactive: 24,
  },
  medium: {
    current: 28,
    inactive: 28,
  },
  large: {
    current: 32,
    inactive: 32,
  },
  extraLarge: {
    current: 36,
    inactive: 36,
  },
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  // Stream Cache
  STREAM_MEMORY_CACHE_SIZE: 3 * 1024 * 1024, // 3MB
  STREAM_DISK_CACHE_TRACKS: 5,
  STREAM_BUFFER_AHEAD_SECONDS: 60,
  STREAM_BUFFER_BEHIND_SECONDS: 30,
  
  // Pre-caching
  PRECACHE_THRESHOLD: 0.8, // Start pre-caching next track at 80% of current
  PRECACHE_DURATION: 30, // Pre-cache first 30 seconds
  
  // Lyrics Cache
  LYRICS_MAX_CACHE_SIZE: 100, // 100 tracks
  LYRICS_CACHE_EXPIRATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // API Cache
  API_CACHE_EXPIRATION: 5 * 60 * 1000, // 5 minutes
};

// Queue Sync Configuration
export const QUEUE_SYNC_CONFIG = {
  SYNC_INTERVAL: 30000, // 30 seconds
  SYNC_DEBOUNCE: 5000, // Max once per 5 seconds
  CONFLICT_THRESHOLD: 5 * 60 * 1000, // 5 minutes - consider it a conflict
};

// Scrobbling Configuration
export const SCROBBLING_CONFIG = {
  PROGRESS_UPDATE_INTERVAL: 30000, // 30 seconds - sync progress to server
  SCROBBLE_THRESHOLD_PERCENTAGE: 0.8, // 80% of track duration
  SCROBBLE_THRESHOLD_MINUTES: 4, // OR 4 minutes played
  NOW_PLAYING_ENABLED: true, // Send "now playing" scrobble
  SUBMISSION_ENABLED: true, // Submit scrobble when track played enough
};

// Download Configuration
export const DOWNLOAD_CONFIG = {
  MAX_CONCURRENT_DOWNLOADS: 3,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // 1 second, exponential backoff
};

// Radio Configuration
export const RADIO_CONFIG = {
  DEFAULT_QUEUE_SIZE: 20,
  REFILL_THRESHOLD: 5, // Refill when < 5 tracks remaining
  FETCH_BATCH_SIZE: 20, // Fetch 20 similar songs at a time
  ADD_TO_QUEUE_SIZE: 10, // Add 10 to queue per refill
  SEED_ROTATION_INTERVAL: 5, // Change seed every 5 tracks
};

// Network Configuration
export const NETWORK_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Lyrics Sync Configuration
export const LYRICS_SYNC_CONFIG = {
  UPDATE_INTERVAL: 500, // Update current line every 500ms
  TRANSITION_DURATION: 200, // 200ms fade transition
  AUTO_SCROLL_DURATION: 300, // 300ms scroll animation
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CHROMECAST: false, // Disable for MVP
  ENABLE_ANDROID_AUTO: false, // Disable for MVP
  ENABLE_VOICE_COMMANDS: false, // Disable for MVP
  ENABLE_DEEP_LINKING: false, // Disable for MVP
  ENABLE_DOWNLOADS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_RADIO: true,
  ENABLE_LYRICS: true, // MVP FEATURE
  ENABLE_QUEUE_SYNC: true, // Server queue synchronization
  ENABLE_SCROBBLING: true, // Track play counting and progress updates
  ENABLE_SMART_CACHE: true,
};

// UI Configuration
export const UI_CONFIG = {
  // Lists
  FLASH_LIST_ESTIMATED_ITEM_SIZE: 80,
  
  // Animations
  BACKGROUND_TRANSITION_DURATION: 300,
  CARD_SCALE_AMOUNT: 1.05,
  
  // Debounce/Throttle
  SEARCH_DEBOUNCE: 300,
  SCROLL_THROTTLE: 16, // ~60fps
  POSITION_UPDATE_THROTTLE: 1000, // Update position every 1 second
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  AUTH_ERROR: 'Authentication failed. Please check your credentials.',
  NOT_FOUND: 'Content not found.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN: 'An unexpected error occurred.',
  NO_LYRICS: 'No lyrics found for this song.',
  OFFLINE_NO_CACHE: 'This content is not available offline.',
};
