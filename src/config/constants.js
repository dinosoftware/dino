"use strict";
/**
 * Dino Music App - Constants
 * App-wide constants, feature flags, and default values
 */
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.UI_CONFIG = exports.FEATURE_FLAGS = exports.LYRICS_SYNC_CONFIG = exports.NETWORK_CONFIG = exports.RADIO_CONFIG = exports.DOWNLOAD_CONFIG = exports.SCROBBLING_CONFIG = exports.QUEUE_SYNC_CONFIG = exports.CACHE_CONFIG = exports.LYRICS_FONT_SIZES = exports.DEFAULT_SETTINGS = exports.STREAMING_FORMAT_OPTIONS = exports.STREAMING_QUALITY_OPTIONS = exports.STORAGE_KEYS = exports.REQUIRE_SERVER_ON_FIRST_LAUNCH = exports.ALLOW_ADDITIONAL_SERVERS = exports.DEFAULT_SERVERS = exports.API_FORMAT = exports.API_VERSION = exports.CLIENT_NAME = exports.APP_VERSION = exports.APP_NAME = void 0;
var expo_constants_1 = require("expo-constants");
// App Info
exports.APP_NAME = 'Dino';
exports.APP_VERSION = ((_a = expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.version) || '1.0.0';
exports.CLIENT_NAME = 'Dino';
// OpenSubsonic API
exports.API_VERSION = '1.16.1';
exports.API_FORMAT = 'json';
// Default Server Configuration (from app.config.js)
exports.DEFAULT_SERVERS = ((_c = (_b = expo_constants_1.default.expoConfig) === null || _b === void 0 ? void 0 : _b.extra) === null || _c === void 0 ? void 0 : _c.defaultServers) || [];
exports.ALLOW_ADDITIONAL_SERVERS = (_f = (_e = (_d = expo_constants_1.default.expoConfig) === null || _d === void 0 ? void 0 : _d.extra) === null || _e === void 0 ? void 0 : _e.allowAdditionalServers) !== null && _f !== void 0 ? _f : true;
exports.REQUIRE_SERVER_ON_FIRST_LAUNCH = (_j = (_h = (_g = expo_constants_1.default.expoConfig) === null || _g === void 0 ? void 0 : _g.extra) === null || _h === void 0 ? void 0 : _h.requireServerOnFirstLaunch) !== null && _j !== void 0 ? _j : true;
// Storage Keys (MMKV)
exports.STORAGE_KEYS = {
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
exports.STREAMING_QUALITY_OPTIONS = [
    { value: '0', label: 'Original (No transcoding)', bitrate: 0 },
    { value: '320', label: 'High (320 kbps)', bitrate: 320 },
    { value: '256', label: 'High (256 kbps)', bitrate: 256 },
    { value: '192', label: 'Medium (192 kbps)', bitrate: 192 },
    { value: '128', label: 'Medium (128 kbps)', bitrate: 128 },
    { value: '96', label: 'Low (96 kbps)', bitrate: 96 },
    { value: '64', label: 'Very Low (64 kbps)', bitrate: 64 },
];
// Streaming Format Options
exports.STREAMING_FORMAT_OPTIONS = [
    { value: 'mp3', label: 'MP3' },
    { value: 'opus', label: 'Opus' },
    { value: 'aac', label: 'AAC' },
    { value: 'flac', label: 'FLAC (Lossless)' },
    { value: 'original', label: 'Original' },
];
// Default Settings
exports.DEFAULT_SETTINGS = {
    // Streaming
    streamingQualityWiFi: '0',
    streamingQualityMobile: '128',
    streamingFormatWiFi: 'original',
    streamingFormatMobile: 'mp3',
    // Downloads
    wifiOnlyDownloads: true,
    maxConcurrentDownloads: 3,
    // Playback
    crossfadeDuration: 0,
    gaplessPlayback: true,
    normalizeVolume: false,
    // Instant Mix
    instantMixSize: 20,
    // Storage
    storageLimit: 5120, // 5GB in MB
    streamCacheSize: 100, // 100MB
    // Chromecast
    autoCastOnConnect: false,
    castQuality: '0',
    castFormat: 'original',
    // UPNP/DLNA
    upnpQuality: '0',
    upnpFormat: 'original',
    // Lyrics
    lyricsFontSize: 'medium',
    autoScrollLyrics: true,
    showLyricsTimestamps: false,
    // Queue Sync
    autoSyncQueue: true,
    queueSyncInterval: 30000, // 30 seconds
    autoExtendQueue: false, // Auto-extend queue with similar songs when near end
    // Scrobbling
    enableScrobbling: true,
    scrobbleProgressInterval: 30000, // 30 seconds
    // Sharing
    includeShareMessage: true, // Include "Check out X" in share messages
    // UI
    qualityBadgeDetailed: false, // Show simple quality badges by default (e.g., "MAX", "HIGH")
    autoFocusSearch: true, // Auto-focus search bar when entering search screen
    // Network
    usePostRequests: true, // Use POST for API requests by default (if server supports it)
    // Appearance
    themeMode: 'dark',
    backgroundStyle: 'blur',
};
// Lyrics Font Sizes (all text stays bold, only opacity changes)
exports.LYRICS_FONT_SIZES = {
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
};
// Cache Configuration
exports.CACHE_CONFIG = {
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
exports.QUEUE_SYNC_CONFIG = {
    SYNC_INTERVAL: 30000, // 30 seconds
    SYNC_DEBOUNCE: 5000, // Max once per 5 seconds
    CONFLICT_THRESHOLD: 5 * 60 * 1000, // 5 minutes - consider it a conflict
};
// Scrobbling Configuration
exports.SCROBBLING_CONFIG = {
    PROGRESS_UPDATE_INTERVAL: 30000, // 30 seconds - sync progress to server
    SCROBBLE_THRESHOLD_PERCENTAGE: 0.8, // 80% of track duration
    SCROBBLE_THRESHOLD_MINUTES: 4, // OR 4 minutes played
    NOW_PLAYING_ENABLED: true, // Send "now playing" scrobble
    SUBMISSION_ENABLED: true, // Submit scrobble when track played enough
};
// Download Configuration
exports.DOWNLOAD_CONFIG = {
    MAX_CONCURRENT_DOWNLOADS: 3,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // 1 second, exponential backoff
};
// Radio Configuration
exports.RADIO_CONFIG = {
    DEFAULT_QUEUE_SIZE: 20,
    REFILL_THRESHOLD: 5, // Refill when < 5 tracks remaining
    FETCH_BATCH_SIZE: 20, // Fetch 20 similar songs at a time
    ADD_TO_QUEUE_SIZE: 10, // Add 10 to queue per refill
    SEED_ROTATION_INTERVAL: 5, // Change seed every 5 tracks
};
// Network Configuration
exports.NETWORK_CONFIG = {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
};
// Lyrics Sync Configuration
exports.LYRICS_SYNC_CONFIG = {
    UPDATE_INTERVAL: 100, // Update current line every 100ms for tight sync
    TRANSITION_DURATION: 200, // 200ms fade transition
    AUTO_SCROLL_DURATION: 300, // 300ms scroll animation
};
// Feature Flags
exports.FEATURE_FLAGS = {
    ENABLE_CHROMECAST: true,
    ENABLE_UPNP: true,
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
exports.UI_CONFIG = {
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
exports.ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    AUTH_ERROR: 'Authentication failed. Please check your credentials.',
    NOT_FOUND: 'Content not found.',
    TIMEOUT: 'Request timed out. Please try again.',
    UNKNOWN: 'An unexpected error occurred.',
    NO_LYRICS: 'No lyrics found for this song.',
    OFFLINE_NO_CACHE: 'This content is not available offline.',
};
