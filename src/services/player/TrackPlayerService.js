"use strict";
/**
 * Dino Music App - TrackPlayer Service
 * Audio playback engine with react-native-track-player
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackPlayerService = void 0;
var Network = require("expo-network");
var react_native_track_player_1 = require("react-native-track-player");
var streaming_1 = require("../../api/opensubsonic/streaming");
var radio_1 = require("../../api/opensubsonic/radio");
var stores_1 = require("../../stores");
var downloadStore_1 = require("../../stores/downloadStore");
var queueStore_1 = require("../../stores/queueStore");
var QueueSyncManager_1 = require("./QueueSyncManager");
var ScrobblingManager_1 = require("./ScrobblingManager");
var remotePlaybackStore_1 = require("../../stores/remotePlaybackStore");
var artistUtils_1 = require("../../utils/artistUtils");
// Playback service function (replaces PlaybackService.ts to avoid circular dependency)
function PlaybackService() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // Remote control event handlers
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemotePlay, function () {
                console.log('[PlaybackService] Remote play');
                exports.trackPlayerService.togglePlayPause();
            });
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemotePause, function () {
                console.log('[PlaybackService] Remote pause');
                exports.trackPlayerService.togglePlayPause();
            });
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemoteNext, function () {
                console.log('[PlaybackService] Remote next');
                exports.trackPlayerService.skipToNext();
            });
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemotePrevious, function () {
                console.log('[PlaybackService] Remote previous');
                exports.trackPlayerService.skipToPrevious();
            });
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemoteSeek, function (event) {
                console.log('[PlaybackService] Remote seek:', event.position);
                exports.trackPlayerService.seekTo(event.position);
            });
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemoteSkip, function (event) {
                console.log('[PlaybackService] Remote skip to index:', event.index);
                exports.trackPlayerService.playTrack(event.index);
            });
            react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.RemoteStop, function () {
                console.log('[PlaybackService] Remote stop');
                react_native_track_player_1.default.stop();
            });
            return [2 /*return*/];
        });
    });
}
// Register the playback service
react_native_track_player_1.default.registerPlaybackService(function () { return PlaybackService; });
var TrackPlayerService = /** @class */ (function () {
    function TrackPlayerService() {
        this.isInitialized = false;
        this.networkCheckInterval = null;
        this.lastNetworkType = 'unknown';
        this.isSyncingQueue = false;
        // Precache: pre-resolve the next track object so PlaybackQueueEnded can start it instantly
        this.precachedTrackObj = null; // the fully-built RNTP track object
        this.precachedTrackIndex = null; // which queue index is cached (not ID - handles duplicates)
        this.precacheTriggerred = false; // did we already trigger precache for the current song
    }
    TrackPlayerService.prototype.isLocalPlayerActive = function () {
        return remotePlaybackStore_1.useRemotePlaybackStore.getState().activePlayerType === 'local';
    };
    /**
     * Format audio codec name with proper capitalization
     * FLAC, Opus, AAC, etc. - not all uppercase
     */
    TrackPlayerService.prototype.formatCodecName = function (format) {
        var formatLower = format.toLowerCase();
        switch (formatLower) {
            case 'flac': return 'FLAC';
            case 'opus': return 'Opus';
            case 'aac': return 'AAC';
            case 'mp3': return 'MP3';
            case 'ogg': return 'OGG';
            case 'wav': return 'WAV';
            case 'm4a': return 'M4A';
            case 'alac': return 'ALAC';
            case 'ape': return 'APE';
            case 'wma': return 'WMA';
            default: return format.toUpperCase(); // Fallback to uppercase
        }
    };
    /**
     * Initialize the player service
     */
    TrackPlayerService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var streamCacheSize, maxCacheSizeKB, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isInitialized)
                            return [2 /*return*/];
                        console.log('[TrackPlayer] Initializing...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        streamCacheSize = stores_1.useSettingsStore.getState().streamCacheSize;
                        maxCacheSizeKB = streamCacheSize * 1024;
                        return [4 /*yield*/, react_native_track_player_1.default.setupPlayer({
                                waitForBuffer: true,
                                autoHandleInterruptions: true,
                                maxCacheSize: maxCacheSizeKB, // Android only - in KB
                            })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, react_native_track_player_1.default.updateOptions({
                                progressUpdateEventInterval: 1, // Fire PlaybackProgressUpdated every 1 second
                                android: {
                                    appKilledPlaybackBehavior: react_native_track_player_1.AppKilledPlaybackBehavior.ContinuePlayback,
                                    alwaysPauseOnInterruption: true,
                                },
                                capabilities: [
                                    react_native_track_player_1.Capability.Play,
                                    react_native_track_player_1.Capability.Pause,
                                    react_native_track_player_1.Capability.SkipToNext,
                                    react_native_track_player_1.Capability.SkipToPrevious,
                                    react_native_track_player_1.Capability.SeekTo,
                                ],
                                compactCapabilities: [
                                    react_native_track_player_1.Capability.Play,
                                    react_native_track_player_1.Capability.Pause,
                                    react_native_track_player_1.Capability.SkipToNext,
                                ],
                                notificationCapabilities: [
                                    react_native_track_player_1.Capability.Play,
                                    react_native_track_player_1.Capability.Pause,
                                    react_native_track_player_1.Capability.SkipToNext,
                                    react_native_track_player_1.Capability.SkipToPrevious,
                                    react_native_track_player_1.Capability.SeekTo,
                                ],
                                icon: require('../../../assets/images/icon-transparent.png'),
                            })];
                    case 3:
                        _a.sent();
                        // Setup event listeners
                        this.setupEventListeners();
                        // Start monitoring network changes
                        this.startNetworkMonitoring();
                        // Register callback to clear restored position when user starts new queue
                        (0, queueStore_1.setClearRestoredPositionCallback)(function () {
                            stores_1.usePlayerStore.setState({ restoredPosition: null });
                        });
                        // Register callback to sync queue with TrackPlayer when queue is modified
                        (0, queueStore_1.setSyncQueueCallback)(function () { return _this.syncQueueWithTrackPlayer(); });
                        (0, queueStore_1.setClearPreloadedTracksCallback)(function () { _this.clearPreloadedTracks().catch(function () { }); });
                        // Load settings from storage first
                        return [4 /*yield*/, stores_1.useSettingsStore.getState().loadFromStorage()];
                    case 4:
                        // Load settings from storage first
                        _a.sent();
                        console.log('[TrackPlayer] Settings loaded');
                        // Load queue from local storage first
                        return [4 /*yield*/, stores_1.useQueueStore.getState().loadFromStorage()];
                    case 5:
                        // Load queue from local storage first
                        _a.sent();
                        console.log('[TrackPlayer] Local queue loaded');
                        // Mark as initialized early - don't wait for server
                        this.isInitialized = true;
                        console.log('[TrackPlayer] Initialized successfully (local queue)');
                        // Start queue sync and scrobbling managers
                        QueueSyncManager_1.queueSyncManager.start();
                        ScrobblingManager_1.scrobblingManager.start();
                        // Load queue from server in background (non-blocking)
                        // This allows app to start immediately even if server is unreachable
                        QueueSyncManager_1.queueSyncManager.loadFromServer().then(function (usedServerQueue) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, queue, currentIndex, currentTrack, _b, queue, currentIndex, currentTrack;
                            return __generator(this, function (_c) {
                                if (usedServerQueue) {
                                    console.log('[TrackPlayer] Loaded queue from server (background)');
                                    _a = stores_1.useQueueStore.getState(), queue = _a.queue, currentIndex = _a.currentIndex;
                                    if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
                                        currentTrack = queue[currentIndex];
                                        stores_1.usePlayerStore.getState().setCurrentTrack(currentTrack);
                                        console.log('[TrackPlayer] Server queue ready:', queue.length, 'tracks, current track set');
                                    }
                                }
                                else {
                                    console.log('[TrackPlayer] Using local queue');
                                    _b = stores_1.useQueueStore.getState(), queue = _b.queue, currentIndex = _b.currentIndex;
                                    if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
                                        currentTrack = queue[currentIndex];
                                        stores_1.usePlayerStore.getState().setCurrentTrack(currentTrack);
                                        console.log('[TrackPlayer] Local queue ready:', queue.length, 'tracks, current track set');
                                    }
                                }
                                return [2 /*return*/];
                            });
                        }); }).catch(function (error) {
                            console.log('[TrackPlayer] Failed to load server queue (background), using local:', error);
                        });
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('[TrackPlayer] Initialization failed:', error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Setup event listeners
     */
    TrackPlayerService.prototype.setupEventListeners = function () {
        var _this = this;
        react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.PlaybackState, function (event) { return __awaiter(_this, void 0, void 0, function () {
            var setPlaybackState;
            return __generator(this, function (_a) {
                if (!this.isLocalPlayerActive())
                    return [2 /*return*/];
                setPlaybackState = stores_1.usePlayerStore.getState().setPlaybackState;
                switch (event.state) {
                    case react_native_track_player_1.State.Playing:
                        setPlaybackState('playing');
                        this.startProgressTracking();
                        ScrobblingManager_1.scrobblingManager.onPlaybackStateChange('playing');
                        break;
                    case react_native_track_player_1.State.Paused:
                        setPlaybackState('paused');
                        this.stopProgressTracking();
                        ScrobblingManager_1.scrobblingManager.onPlaybackStateChange('paused');
                        break;
                    case react_native_track_player_1.State.Stopped:
                        setPlaybackState('stopped');
                        this.stopProgressTracking();
                        ScrobblingManager_1.scrobblingManager.onPlaybackStateChange('stopped');
                        break;
                    case react_native_track_player_1.State.Buffering:
                        setPlaybackState('buffering');
                        break;
                }
                return [2 /*return*/];
            });
        }); });
        react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.PlaybackProgressUpdated, function (event) { return __awaiter(_this, void 0, void 0, function () {
            var _a, setProgress, setBufferedProgress;
            return __generator(this, function (_b) {
                if (!this.isLocalPlayerActive())
                    return [2 /*return*/];
                _a = stores_1.usePlayerStore.getState(), setProgress = _a.setProgress, setBufferedProgress = _a.setBufferedProgress;
                setProgress(event.position, event.duration);
                setBufferedProgress(event.buffered);
                // Trigger precache at 50% through the track - gives RNTP time to buffer audio
                if (!this.precacheTriggerred &&
                    event.duration > 0 &&
                    event.position / event.duration >= 0.5) {
                    this.precacheTriggerred = true;
                    this.precacheNextTrack().catch(function (err) {
                        console.error('[TrackPlayer] Precache failed:', err);
                    });
                }
                return [2 /*return*/];
            });
        }); });
        react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.PlaybackTrackChanged, function (event) { return __awaiter(_this, void 0, void 0, function () {
            var _a, previousTrack, previousProgress, repeatMode, track_1, _b, queue, currentIndex, skipToTrack, storeCurrentTrack, expectedNextIndex, expectedNextTrack, trackData_1, newIndex, localIndex, downloadedTrack, track_2, detailedText, format;
            var _this = this;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.isLocalPlayerActive())
                            return [2 /*return*/];
                        // When TrackPlayer.add() buffers the next track, ExoPlayer fires a media transition
                        // which RNTP surfaces as PlaybackTrackChanged with track=null, nextTrack=1.
                        // This is NOT a real playback change - ignore it to prevent invalidatePrecache()
                        // from resetting precacheTriggerred and causing an infinite add() loop.
                        if (event.track === null && event.nextTrack !== null && event.nextTrack > 0) {
                            return [2 /*return*/];
                        }
                        _a = stores_1.usePlayerStore.getState(), previousTrack = _a.currentTrack, previousProgress = _a.progress, repeatMode = _a.repeatMode;
                        if (!(repeatMode === 'track' && previousTrack && event.nextTrack !== undefined)) return [3 /*break*/, 2];
                        console.log('[TrackPlayer] Repeat track mode - going back to:', previousTrack.title);
                        // Go back to the previous track (which is the one we want to repeat)
                        return [4 /*yield*/, react_native_track_player_1.default.skipToPrevious()];
                    case 1:
                        // Go back to the previous track (which is the one we want to repeat)
                        _d.sent();
                        return [2 /*return*/];
                    case 2:
                        if (!(event.nextTrack !== undefined)) return [3 /*break*/, 4];
                        return [4 /*yield*/, react_native_track_player_1.default.getTrack(event.nextTrack)];
                    case 3:
                        track_1 = _d.sent();
                        if (track_1) {
                            _b = stores_1.useQueueStore.getState(), queue = _b.queue, currentIndex = _b.currentIndex, skipToTrack = _b.skipToTrack;
                            storeCurrentTrack = stores_1.usePlayerStore.getState().currentTrack;
                            // Check if this is the track we already set (manual selection via playTrack)
                            // In that case, trust the currentIndex in the store - don't search
                            if (storeCurrentTrack && storeCurrentTrack.id === track_1.id && ((_c = queue[currentIndex]) === null || _c === void 0 ? void 0 : _c.id) === track_1.id) {
                                // The store is already correct - this was a manual track change
                                console.log('[TrackPlayer] PlaybackTrackChanged: manual selection, index already correct:', currentIndex);
                                return [2 /*return*/];
                            }
                            expectedNextIndex = currentIndex + 1;
                            expectedNextTrack = queue[expectedNextIndex];
                            newIndex = void 0;
                            // Check if it's the expected next track
                            if (expectedNextTrack && expectedNextTrack.id === track_1.id) {
                                // Natural progression - just increment index
                                trackData_1 = expectedNextTrack;
                                newIndex = expectedNextIndex;
                            }
                            else {
                                // Track doesn't match expected - find it in queue AFTER current position
                                // This handles duplicate tracks correctly by searching forward from currentIndex
                                trackData_1 = queue.slice(currentIndex + 1).find(function (t) { return t.id === track_1.id; });
                                localIndex = queue.slice(currentIndex + 1).findIndex(function (t) { return t.id === track_1.id; });
                                newIndex = localIndex !== -1 ? currentIndex + 1 + localIndex : -1;
                            }
                            if (trackData_1 && newIndex !== -1) {
                                // Update queue index if it changed
                                if (newIndex !== currentIndex) {
                                    skipToTrack(newIndex);
                                }
                                stores_1.usePlayerStore.getState().setCurrentTrack(trackData_1);
                                downloadedTrack = downloadStore_1.useDownloadStore.getState().getDownloadedTrack(trackData_1.id);
                                if (downloadedTrack) {
                                    track_2 = downloadedTrack.track;
                                    detailedText = 'Downloaded';
                                    if (track_2.bitRate && track_2.suffix) {
                                        format = this.formatCodecName(track_2.suffix);
                                        detailedText = "".concat(track_2.bitRate, " kbps ").concat(format);
                                    }
                                    stores_1.usePlayerStore.getState().setStreamingInfo({
                                        quality: '0',
                                        format: track_2.suffix || 'Downloaded',
                                        displayText: detailedText,
                                        displayTextSimple: 'DOWNLOADED',
                                        networkType: 'unknown',
                                    });
                                }
                                else {
                                    // Update with current network settings
                                    this.getActiveStreamingSettings().then(function (streamingSettings) {
                                        // For MAX quality, show actual track bitrate/format in detailed view
                                        var detailedText = streamingSettings.displayText;
                                        if (streamingSettings.quality === '0' && trackData_1.bitRate && trackData_1.suffix) {
                                            var format = _this.formatCodecName(trackData_1.suffix);
                                            detailedText = "".concat(trackData_1.bitRate, " kbps ").concat(format);
                                        }
                                        stores_1.usePlayerStore.getState().setStreamingInfo({
                                            quality: streamingSettings.quality,
                                            format: streamingSettings.formatName,
                                            displayText: detailedText,
                                            displayTextSimple: streamingSettings.displayTextSimple,
                                            networkType: streamingSettings.networkType,
                                        });
                                    }).catch(function (err) { return console.error('[TrackPlayer] Failed to update streaming info:', err); });
                                }
                                // Notify scrobbling manager about track change with previous track info
                                ScrobblingManager_1.scrobblingManager.onTrackChange(trackData_1, previousTrack, previousProgress.position, previousProgress.duration);
                                // Reset precache so it gets refreshed for the new current track
                                this.invalidatePrecache();
                            }
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        // Track cleared - scrobble the previous track if needed
                        ScrobblingManager_1.scrobblingManager.onTrackChange(null, previousTrack, previousProgress.position, previousProgress.duration);
                        _d.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        react_native_track_player_1.default.addEventListener(react_native_track_player_1.Event.PlaybackQueueEnded, function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, repeatMode, currentTrack, progress, _b, queue, currentIndex, skipToNext, hasNext, _c, updatedQueue, newIndex, nextTrack;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.isLocalPlayerActive())
                            return [2 /*return*/];
                        _a = stores_1.usePlayerStore.getState(), repeatMode = _a.repeatMode, currentTrack = _a.currentTrack, progress = _a.progress;
                        _b = stores_1.useQueueStore.getState(), queue = _b.queue, currentIndex = _b.currentIndex, skipToNext = _b.skipToNext;
                        console.log('[TrackPlayer] Track finished (queue ended), advancing to next');
                        if (!currentTrack) return [3 /*break*/, 2];
                        return [4 /*yield*/, ScrobblingManager_1.scrobblingManager.onTrackEnded(currentTrack, progress.position, progress.duration)];
                    case 1:
                        _d.sent();
                        _d.label = 2;
                    case 2:
                        if (!(repeatMode === 'track')) return [3 /*break*/, 4];
                        // Repeat current track
                        console.log('[TrackPlayer] Repeating current track:', currentTrack === null || currentTrack === void 0 ? void 0 : currentTrack.title);
                        return [4 /*yield*/, this.play()];
                    case 3:
                        _d.sent();
                        return [2 /*return*/];
                    case 4:
                        hasNext = currentIndex < queue.length - 1;
                        if (!(hasNext || repeatMode === 'queue')) return [3 /*break*/, 9];
                        // Advance index
                        if (hasNext) {
                            skipToNext();
                        }
                        else {
                            // repeatMode === 'queue' - wrap around to start
                            stores_1.useQueueStore.getState().skipToTrack(0);
                        }
                        _c = stores_1.useQueueStore.getState(), updatedQueue = _c.queue, newIndex = _c.currentIndex;
                        nextTrack = updatedQueue[newIndex];
                        if (!nextTrack) {
                            console.error('[TrackPlayer] Next track not found at index', newIndex);
                            return [2 /*return*/];
                        }
                        stores_1.usePlayerStore.getState().setCurrentTrack(nextTrack);
                        if (!(this.precachedTrackIndex === newIndex)) return [3 /*break*/, 6];
                        console.log('[TrackPlayer] PlaybackQueueEnded: native skip to buffered track:', nextTrack.title);
                        this.invalidatePrecache();
                        return [4 /*yield*/, react_native_track_player_1.default.skipToNext()];
                    case 5:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        console.log('[TrackPlayer] PlaybackQueueEnded: no buffer, playing normally:', nextTrack.title);
                        this.invalidatePrecache();
                        return [4 /*yield*/, this.play()];
                    case 7:
                        _d.sent();
                        _d.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        console.log('[TrackPlayer] Playback ended');
                        stores_1.usePlayerStore.getState().setPlaybackState('stopped');
                        _d.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        }); });
    };
    /**
     * Get active streaming settings based on network type
     */
    TrackPlayerService.prototype.getActiveStreamingSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, streamingQualityWiFi, streamingQualityMobile, streamingFormatWiFi, streamingFormatMobile, networkState, isWiFi, quality, streamingFormat, formatForApi, maxBitRateForApi, displayText, displayTextSimple, format, qualityNum, networkType, error_2, fallbackMaxBitRate, fallbackFormat, fallbackQualityNum, fallbackSimple;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = stores_1.useSettingsStore.getState(), streamingQualityWiFi = _a.streamingQualityWiFi, streamingQualityMobile = _a.streamingQualityMobile, streamingFormatWiFi = _a.streamingFormatWiFi, streamingFormatMobile = _a.streamingFormatMobile;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Network.getNetworkStateAsync()];
                    case 2:
                        networkState = _b.sent();
                        isWiFi = networkState.type === Network.NetworkStateType.WIFI;
                        quality = isWiFi ? streamingQualityWiFi : streamingQualityMobile;
                        streamingFormat = isWiFi ? streamingFormatWiFi : streamingFormatMobile;
                        formatForApi = streamingFormat;
                        if (formatForApi === 'original') {
                            formatForApi = undefined; // Don't send format param to use original
                        }
                        maxBitRateForApi = quality;
                        if (quality === '0') {
                            maxBitRateForApi = undefined; // Don't send bitrate param to use original
                        }
                        displayText = void 0;
                        displayTextSimple = void 0;
                        if (quality === '0' || streamingFormat === 'original') {
                            displayText = 'MAX';
                            displayTextSimple = 'MAX';
                        }
                        else {
                            format = this.formatCodecName(formatForApi || streamingFormat);
                            displayText = "".concat(quality, " kbps ").concat(format);
                            qualityNum = parseInt(quality);
                            if (qualityNum >= 256) {
                                displayTextSimple = 'HIGH';
                            }
                            else if (qualityNum >= 128) {
                                displayTextSimple = 'MEDIUM';
                            }
                            else {
                                displayTextSimple = 'LOW';
                            }
                        }
                        networkType = isWiFi ? 'wifi' : networkState.type === Network.NetworkStateType.CELLULAR ? 'mobile' : 'unknown';
                        return [2 /*return*/, {
                                maxBitRate: maxBitRateForApi,
                                format: formatForApi,
                                displayText: displayText,
                                displayTextSimple: displayTextSimple,
                                quality: quality,
                                formatName: streamingFormat,
                                networkType: networkType,
                            }];
                    case 3:
                        error_2 = _b.sent();
                        console.error('[TrackPlayer] Failed to get network state:', error_2);
                        fallbackMaxBitRate = streamingQualityMobile === '0' ? undefined : streamingQualityMobile;
                        fallbackFormat = streamingFormatMobile === 'original' ? undefined : streamingFormatMobile;
                        fallbackQualityNum = parseInt(streamingQualityMobile);
                        fallbackSimple = streamingQualityMobile === '0' ? 'MAX' :
                            fallbackQualityNum >= 256 ? 'HIGH' :
                                fallbackQualityNum >= 128 ? 'MEDIUM' : 'LOW';
                        return [2 /*return*/, {
                                maxBitRate: fallbackMaxBitRate,
                                format: fallbackFormat,
                                displayText: streamingQualityMobile === '0' ? 'MAX' : "".concat(streamingQualityMobile, " kbps ").concat(this.formatCodecName(streamingFormatMobile)),
                                displayTextSimple: fallbackSimple,
                                quality: streamingQualityMobile,
                                formatName: streamingFormatMobile,
                                networkType: 'unknown',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Build track object for TrackPlayer
     */
    TrackPlayerService.prototype.buildTrackObject = function (track, streamingSettings) {
        return __awaiter(this, void 0, void 0, function () {
            var downloadedTrack, url, coverArtUrl, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        downloadedTrack = downloadStore_1.useDownloadStore.getState().getDownloadedTrack(track.id);
                        if (!downloadedTrack) return [3 /*break*/, 5];
                        // Use local file
                        url = downloadedTrack.localUri;
                        _a = downloadedTrack.coverArtUri;
                        if (_a) return [3 /*break*/, 4];
                        if (!track.coverArt) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, streaming_1.getCoverArtUrl)(track.coverArt, 500)];
                    case 1:
                        _b = _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _b = undefined;
                        _c.label = 3;
                    case 3:
                        _a = (_b);
                        _c.label = 4;
                    case 4:
                        // Use cached cover art if available
                        coverArtUrl = _a;
                        console.log("[TrackPlayer] Using downloaded file for track ".concat(track.id));
                        return [3 /*break*/, 8];
                    case 5: return [4 /*yield*/, (0, streaming_1.getStreamUrl)(track.id, streamingSettings.maxBitRate, streamingSettings.format)];
                    case 6:
                        // Stream from server
                        url = _c.sent();
                        if (!track.coverArt) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, streaming_1.getCoverArtUrl)(track.coverArt, 500)];
                    case 7:
                        coverArtUrl = _c.sent();
                        _c.label = 8;
                    case 8: return [2 /*return*/, {
                            id: track.id,
                            url: url,
                            title: track.title,
                            artist: (0, artistUtils_1.getTrackArtistString)(track),
                            album: track.album || 'Unknown Album',
                            artwork: coverArtUrl,
                            duration: track.duration,
                        }];
                }
            });
        });
    };
    /**
     * Enqueue the next track into RNTP so it starts buffering audio data immediately.
     * RNTP will gaplessly advance to it when the current track ends.
     * Called at ~50% through the current track via PlaybackProgressUpdated / setInterval.
     */
    TrackPlayerService.prototype.precacheNextTrack = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, queue, currentIndex, repeatMode, settings, nextIndex, nextTrack, streamingSettings, trackObj, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = stores_1.useQueueStore.getState(), queue = _a.queue, currentIndex = _a.currentIndex;
                        repeatMode = stores_1.usePlayerStore.getState().repeatMode;
                        settings = stores_1.useSettingsStore.getState();
                        if (!settings || !settings.gaplessPlayback)
                            return [2 /*return*/];
                        if (repeatMode === 'track')
                            return [2 /*return*/];
                        // Check if we need to extend the queue with similar songs
                        this.extendQueueIfNeeded().catch(function (err) {
                            console.error('[TrackPlayer] Queue extension failed:', err);
                        });
                        nextIndex = currentIndex + 1;
                        nextTrack = repeatMode === 'queue' && nextIndex >= queue.length
                            ? queue[0]
                            : queue[nextIndex];
                        if (!nextTrack)
                            return [2 /*return*/];
                        // Already enqueued for this track index
                        if (this.precachedTrackIndex === nextIndex)
                            return [2 /*return*/];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        console.log('[TrackPlayer] Enqueueing next track for gapless buffering:', nextTrack.title);
                        return [4 /*yield*/, this.getActiveStreamingSettings()];
                    case 2:
                        streamingSettings = _b.sent();
                        return [4 /*yield*/, this.buildTrackObject(nextTrack, streamingSettings)];
                    case 3:
                        trackObj = _b.sent();
                        // Remove any stale upcoming tracks first (safe - never touches currently playing track)
                        return [4 /*yield*/, react_native_track_player_1.default.removeUpcomingTracks()];
                    case 4:
                        // Remove any stale upcoming tracks first (safe - never touches currently playing track)
                        _b.sent();
                        // Add next track - RNTP starts buffering it immediately for gapless playback
                        return [4 /*yield*/, react_native_track_player_1.default.add(trackObj)];
                    case 5:
                        // Add next track - RNTP starts buffering it immediately for gapless playback
                        _b.sent();
                        this.precachedTrackObj = trackObj;
                        this.precachedTrackIndex = nextIndex;
                        console.log('[TrackPlayer] Next track enqueued and buffering:', nextTrack.title);
                        return [3 /*break*/, 7];
                    case 6:
                        error_3 = _b.sent();
                        console.error('[TrackPlayer] Failed to enqueue next track:', error_3);
                        this.precachedTrackObj = null;
                        this.precachedTrackIndex = null;
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Invalidate precache in memory only. No RNTP queue changes.
     * Called when queue changes so the cached next track gets refreshed.
     */
    TrackPlayerService.prototype.invalidatePrecache = function () {
        this.precachedTrackObj = null;
        this.precachedTrackIndex = null;
        this.precacheTriggerred = false;
    };
    /**
     * Extend queue with similar songs when near the end.
     * Called when there are 3 or fewer tracks remaining (or only 1 track).
     */
    TrackPlayerService.prototype.extendQueueIfNeeded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings, repeatMode, _a, queue, currentIndex, remainingTracks, currentTrack, response, similarSongs, queueIds_1, newTracks, error_4;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        settings = stores_1.useSettingsStore.getState();
                        if (!(settings === null || settings === void 0 ? void 0 : settings.autoExtendQueue))
                            return [2 /*return*/];
                        repeatMode = stores_1.usePlayerStore.getState().repeatMode;
                        if (repeatMode === 'queue' || repeatMode === 'track')
                            return [2 /*return*/];
                        _a = stores_1.useQueueStore.getState(), queue = _a.queue, currentIndex = _a.currentIndex;
                        remainingTracks = queue.length - currentIndex - 1;
                        // Extend when 3 or fewer tracks remain, or when playing the only/last track
                        if (remainingTracks > 3 && queue.length > 1)
                            return [2 /*return*/];
                        currentTrack = queue[currentIndex];
                        if (!currentTrack)
                            return [2 /*return*/];
                        console.log('[TrackPlayer] Auto-extending queue, remaining tracks:', remainingTracks);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, radio_1.getSimilarSongs2)(currentTrack.id, 20)];
                    case 2:
                        response = _c.sent();
                        similarSongs = ((_b = response.similarSongs2) === null || _b === void 0 ? void 0 : _b.song) || [];
                        if (similarSongs.length === 0) {
                            console.log('[TrackPlayer] No similar songs found for queue extension');
                            return [2 /*return*/];
                        }
                        queueIds_1 = new Set(queue.map(function (t) { return t.id; }));
                        newTracks = similarSongs.filter(function (t) { return !queueIds_1.has(t.id); });
                        if (newTracks.length === 0) {
                            console.log('[TrackPlayer] All similar songs already in queue');
                            return [2 /*return*/];
                        }
                        // Add new tracks to queue
                        stores_1.useQueueStore.getState().addToQueue(newTracks);
                        console.log('[TrackPlayer] Extended queue with', newTracks.length, 'similar tracks');
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _c.sent();
                        console.error('[TrackPlayer] Failed to extend queue:', error_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Play a track
     */
    TrackPlayerService.prototype.play = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentTrack, downloadedTrack, streamingSettings, detailedText, format, currentTrackObj, restoredPosition, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Don't play if we're not the active player (e.g., casting)
                        if (!this.isLocalPlayerActive()) {
                            console.log('[TrackPlayer] Skipping play - not active player');
                            return [2 /*return*/];
                        }
                        currentTrack = stores_1.usePlayerStore.getState().currentTrack;
                        if (!currentTrack) {
                            console.warn('[TrackPlayer] No track to play');
                            return [2 /*return*/];
                        }
                        console.log('[TrackPlayer] Playing:', currentTrack.title);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        downloadedTrack = downloadStore_1.useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
                        return [4 /*yield*/, this.getActiveStreamingSettings()];
                    case 2:
                        streamingSettings = _a.sent();
                        console.log('[TrackPlayer] Streaming settings:', {
                            quality: streamingSettings.quality,
                            format: streamingSettings.formatName,
                            network: streamingSettings.networkType,
                            display: streamingSettings.displayText,
                            maxBitRateForApi: streamingSettings.maxBitRate,
                            formatForApi: streamingSettings.format,
                            isDownloaded: !!downloadedTrack,
                        });
                        // Update streaming info in store
                        if (downloadedTrack) {
                            // Show "Downloaded" badge for local files
                            stores_1.usePlayerStore.getState().setStreamingInfo({
                                quality: '0',
                                format: 'Downloaded',
                                displayText: 'Downloaded',
                                displayTextSimple: 'DOWNLOADED',
                                networkType: 'unknown',
                            });
                        }
                        else {
                            detailedText = streamingSettings.displayText;
                            if (streamingSettings.quality === '0' && currentTrack.bitRate && currentTrack.suffix) {
                                format = this.formatCodecName(currentTrack.suffix);
                                detailedText = "".concat(currentTrack.bitRate, " kbps ").concat(format);
                            }
                            stores_1.usePlayerStore.getState().setStreamingInfo({
                                quality: streamingSettings.quality,
                                format: streamingSettings.formatName,
                                displayText: detailedText,
                                displayTextSimple: streamingSettings.displayTextSimple,
                                networkType: streamingSettings.networkType,
                            });
                        }
                        return [4 /*yield*/, this.buildTrackObject(currentTrack, streamingSettings)];
                    case 3:
                        currentTrackObj = _a.sent();
                        return [4 /*yield*/, react_native_track_player_1.default.reset()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, react_native_track_player_1.default.add(currentTrackObj)];
                    case 5:
                        _a.sent();
                        // Reset precache - will be triggered fresh at 80% via PlaybackProgressUpdated
                        this.invalidatePrecache();
                        restoredPosition = stores_1.usePlayerStore.getState().restoredPosition;
                        if (!(restoredPosition !== null && restoredPosition > 0)) return [3 /*break*/, 7];
                        console.log('[TrackPlayer] Restoring position:', restoredPosition);
                        return [4 /*yield*/, react_native_track_player_1.default.seekTo(restoredPosition)];
                    case 6:
                        _a.sent();
                        // Clear the restored position
                        stores_1.usePlayerStore.setState({ restoredPosition: null });
                        _a.label = 7;
                    case 7: return [4 /*yield*/, react_native_track_player_1.default.play()];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_5 = _a.sent();
                        console.error('[TrackPlayer] Play failed:', error_5);
                        throw error_5;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.pause = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.pause()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.togglePlayPause = function () {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.getState()];
                    case 1:
                        state = _a.sent();
                        if (!(state === react_native_track_player_1.State.Playing)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.pause()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 3:
                        if (!(state === react_native_track_player_1.State.Paused)) return [3 /*break*/, 5];
                        return [4 /*yield*/, react_native_track_player_1.default.play()];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, this.play()];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.skipToNext = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, queue, currentIndex, incrementIndex, expectedNextIndex, hasNext, _b, updatedQueue, newIndex, nextTrack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = stores_1.useQueueStore.getState(), queue = _a.queue, currentIndex = _a.currentIndex, incrementIndex = _a.skipToNext;
                        // Check if there's a next track
                        if (currentIndex >= queue.length - 1 || queue.length === 0) {
                            console.log('[TrackPlayer] No next track available');
                            return [2 /*return*/];
                        }
                        expectedNextIndex = currentIndex + 1;
                        hasNext = incrementIndex();
                        if (!hasNext) {
                            console.log('[TrackPlayer] Could not increment index');
                            return [2 /*return*/];
                        }
                        _b = stores_1.useQueueStore.getState(), updatedQueue = _b.queue, newIndex = _b.currentIndex;
                        nextTrack = updatedQueue[newIndex];
                        if (!nextTrack) {
                            console.error('[TrackPlayer] Next track not found at index', newIndex);
                            return [2 /*return*/];
                        }
                        // Update current track in player store
                        stores_1.usePlayerStore.getState().setCurrentTrack(nextTrack);
                        if (!(this.precachedTrackIndex === expectedNextIndex)) return [3 /*break*/, 2];
                        console.log('[TrackPlayer] skipToNext: native skip to buffered track:', nextTrack.title);
                        this.invalidatePrecache();
                        return [4 /*yield*/, react_native_track_player_1.default.skipToNext()];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                    case 2:
                        // Not buffered yet - play normally
                        this.invalidatePrecache();
                        return [4 /*yield*/, this.play()];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.skipToPrevious = function () {
        return __awaiter(this, void 0, void 0, function () {
            var position, _a, queue, currentIndex, decrementIndex, hasPrevious, _b, updatedQueue, newIndex, previousTrack;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.getPosition()];
                    case 1:
                        position = _c.sent();
                        _a = stores_1.useQueueStore.getState(), queue = _a.queue, currentIndex = _a.currentIndex;
                        if (!(position > 10)) return [3 /*break*/, 3];
                        return [4 /*yield*/, react_native_track_player_1.default.seekTo(0)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                    case 3:
                        if (!(currentIndex <= 0 || queue.length === 0)) return [3 /*break*/, 5];
                        console.log('[TrackPlayer] No previous track available');
                        return [4 /*yield*/, react_native_track_player_1.default.seekTo(0)];
                    case 4:
                        _c.sent(); // Just restart current track
                        return [2 /*return*/];
                    case 5:
                        decrementIndex = stores_1.useQueueStore.getState().skipToPrevious;
                        hasPrevious = decrementIndex();
                        if (!!hasPrevious) return [3 /*break*/, 7];
                        console.log('[TrackPlayer] Could not decrement index');
                        return [4 /*yield*/, react_native_track_player_1.default.seekTo(0)];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                    case 7:
                        _b = stores_1.useQueueStore.getState(), updatedQueue = _b.queue, newIndex = _b.currentIndex;
                        previousTrack = updatedQueue[newIndex];
                        if (!!previousTrack) return [3 /*break*/, 9];
                        console.error('[TrackPlayer] Previous track not found at index', newIndex);
                        return [4 /*yield*/, react_native_track_player_1.default.seekTo(0)];
                    case 8:
                        _c.sent();
                        return [2 /*return*/];
                    case 9:
                        // Update current track and play
                        stores_1.usePlayerStore.getState().setCurrentTrack(previousTrack);
                        return [4 /*yield*/, this.play()];
                    case 10:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.seekTo = function (positionSeconds) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.seekTo(positionSeconds)];
                    case 1:
                        _a.sent();
                        // Notify scrobbling manager about seek (triggers queue sync with new position)
                        ScrobblingManager_1.scrobblingManager.onSeek(positionSeconds);
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.jumpForward = function (intervalSeconds) {
        return __awaiter(this, void 0, void 0, function () {
            var currentPosition, newPosition;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.getPosition()];
                    case 1:
                        currentPosition = _a.sent();
                        newPosition = currentPosition + intervalSeconds;
                        return [4 /*yield*/, this.seekTo(newPosition)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.jumpBackward = function (intervalSeconds) {
        return __awaiter(this, void 0, void 0, function () {
            var currentPosition, newPosition;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.getPosition()];
                    case 1:
                        currentPosition = _a.sent();
                        newPosition = Math.max(0, currentPosition - intervalSeconds);
                        return [4 /*yield*/, this.seekTo(newPosition)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.setVolume = function (volume) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.setVolume(volume)];
                    case 1:
                        _a.sent();
                        stores_1.usePlayerStore.getState().setVolume(volume);
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.startProgressTracking = function () {
        // Progress is delivered via PlaybackProgressUpdated event (progressUpdateEventInterval: 1).
        // No polling needed - eliminates 3 native bridge calls/sec.
    };
    TrackPlayerService.prototype.stopProgressTracking = function () {
        // No-op - event-based tracking stops automatically when playback stops.
    };
    TrackPlayerService.prototype.playTrack = function (index) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, queue, skipToTrack, track;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = stores_1.useQueueStore.getState(), queue = _a.queue, skipToTrack = _a.skipToTrack;
                        track = queue[index];
                        if (!track)
                            return [2 /*return*/];
                        skipToTrack(index);
                        stores_1.usePlayerStore.getState().setCurrentTrack(track);
                        // If not local player, the play() call will be a no-op
                        // The remote player services listen to currentTrack changes
                        return [4 /*yield*/, this.play()];
                    case 1:
                        // If not local player, the play() call will be a no-op
                        // The remote player services listen to currentTrack changes
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Called when queue is modified - remove the stale buffered track from RNTP
     * and reset precache state. Uses removeUpcomingTracks() which is safe and
     * never touches the currently-playing track at index 0.
     */
    TrackPlayerService.prototype.clearPreloadedTracks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.invalidatePrecache();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, react_native_track_player_1.default.removeUpcomingTracks()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sync TrackPlayer's internal queue with Zustand queue.
     * Since RNTP queue is always exactly 1 track, there's nothing to remove.
     * We only need to verify the current track index is correct and invalidate
     * the in-memory precache so the right next track gets resolved.
     */
    TrackPlayerService.prototype.syncQueueWithTrackPlayer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, queue_1, currentIndex, currentTrack_1, trackAtCurrentIndex, actualIndex, searchOrder, _i, searchOrder_1, idx, localIndex, newCurrentTrack, wasPlaying, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Prevent concurrent syncs - they can cause race conditions
                        if (this.isSyncingQueue) {
                            console.log('[TrackPlayer] Queue sync already in progress, skipping');
                            return [2 /*return*/];
                        }
                        this.isSyncingQueue = true;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 8]);
                        _a = stores_1.useQueueStore.getState(), queue_1 = _a.queue, currentIndex = _a.currentIndex;
                        currentTrack_1 = stores_1.usePlayerStore.getState().currentTrack;
                        if (!currentTrack_1 || queue_1.length === 0) {
                            console.log('[TrackPlayer] No track playing, skipping queue sync');
                            return [2 /*return*/];
                        }
                        trackAtCurrentIndex = queue_1[currentIndex];
                        if (!(!trackAtCurrentIndex || trackAtCurrentIndex.id !== currentTrack_1.id)) return [3 /*break*/, 5];
                        console.warn('[TrackPlayer] Current track mismatch after queue modification');
                        actualIndex = -1;
                        searchOrder = [
                            currentIndex,
                            currentIndex + 1,
                            currentIndex - 1,
                            currentIndex + 2,
                            currentIndex - 2,
                        ].filter(function (i) { return i >= 0 && i < queue_1.length; });
                        for (_i = 0, searchOrder_1 = searchOrder; _i < searchOrder_1.length; _i++) {
                            idx = searchOrder_1[_i];
                            if (queue_1[idx].id === currentTrack_1.id) {
                                actualIndex = idx;
                                break;
                            }
                        }
                        // If not found nearby, search forward from currentIndex (handles larger shifts)
                        if (actualIndex === -1) {
                            localIndex = queue_1.slice(currentIndex).findIndex(function (t) { return t.id === currentTrack_1.id; });
                            if (localIndex !== -1) {
                                actualIndex = currentIndex + localIndex;
                            }
                        }
                        // Last resort: search from beginning
                        if (actualIndex === -1) {
                            actualIndex = queue_1.findIndex(function (t) { return t.id === currentTrack_1.id; });
                        }
                        if (!(actualIndex !== -1)) return [3 /*break*/, 2];
                        // Found it! Just update the index, don't restart playback
                        console.log('[TrackPlayer] Found current track at index:', actualIndex);
                        stores_1.useQueueStore.setState({ currentIndex: actualIndex });
                        return [3 /*break*/, 5];
                    case 2:
                        // Current track was removed from queue entirely
                        console.warn('[TrackPlayer] Current track no longer in queue');
                        newCurrentTrack = queue_1[currentIndex];
                        if (!newCurrentTrack) return [3 /*break*/, 5];
                        wasPlaying = stores_1.usePlayerStore.getState().playbackState === 'playing';
                        console.log('[TrackPlayer] Switching to track at current index, was playing:', wasPlaying);
                        stores_1.usePlayerStore.getState().setCurrentTrack(newCurrentTrack);
                        if (!wasPlaying) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.play()];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/];
                    case 5:
                        // Invalidate precache so it gets refreshed for the updated queue
                        // RNTP queue stays at 1 track - nothing to remove
                        this.invalidatePrecache();
                        console.log('[TrackPlayer] Queue sync completed - precache invalidated');
                        return [3 /*break*/, 8];
                    case 6:
                        error_6 = _b.sent();
                        console.error('[TrackPlayer] Failed to sync queue:', error_6);
                        return [3 /*break*/, 8];
                    case 7:
                        this.isSyncingQueue = false;
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start monitoring network changes
     */
    TrackPlayerService.prototype.startNetworkMonitoring = function () {
        var _this = this;
        // Initial network detection
        this.detectInitialNetwork();
        // Use event-based monitoring with polling fallback
        this.setupNetworkEventListener();
        // Also poll every 3 seconds as fallback (some devices don't fire events reliably)
        this.networkCheckInterval = setInterval(function () {
            _this.checkNetworkChange();
        }, 3000);
    };
    /**
     * Detect initial network type on startup
     */
    TrackPlayerService.prototype.detectInitialNetwork = function () {
        return __awaiter(this, void 0, void 0, function () {
            var networkState, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Network.getNetworkStateAsync()];
                    case 1:
                        networkState = _a.sent();
                        if (networkState.type === Network.NetworkStateType.WIFI) {
                            this.lastNetworkType = 'wifi';
                        }
                        else if (networkState.type === Network.NetworkStateType.CELLULAR) {
                            this.lastNetworkType = 'mobile';
                        }
                        else {
                            this.lastNetworkType = 'unknown';
                        }
                        console.log("[TrackPlayer] Initial network type: ".concat(this.lastNetworkType));
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _a.sent();
                        console.error('[TrackPlayer] Initial network detection error:', error_7);
                        this.lastNetworkType = 'unknown';
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Setup network event listener (if available)
     */
    TrackPlayerService.prototype.setupNetworkEventListener = function () {
        var _this = this;
        try {
            // Try to use network state change event if available
            Network.addNetworkStateListener(function (networkState) {
                var newNetworkType;
                if (networkState.type === Network.NetworkStateType.WIFI) {
                    newNetworkType = 'wifi';
                }
                else if (networkState.type === Network.NetworkStateType.CELLULAR) {
                    newNetworkType = 'mobile';
                }
                else {
                    newNetworkType = 'unknown';
                }
                if (newNetworkType !== _this.lastNetworkType && _this.lastNetworkType !== 'unknown') {
                    // Only handle meaningful changes (wifi <-> mobile)
                    // Don't trigger on mobile -> mobile (SIM switch) or unknown states
                    var isMeaningfulChange = (_this.lastNetworkType === 'wifi' && newNetworkType === 'mobile') ||
                        (_this.lastNetworkType === 'mobile' && newNetworkType === 'wifi');
                    if (isMeaningfulChange) {
                        console.log("[TrackPlayer] Network event detected: ".concat(_this.lastNetworkType, " \u2192 ").concat(newNetworkType));
                        _this.lastNetworkType = newNetworkType;
                        _this.handleNetworkChange(newNetworkType);
                    }
                    else {
                        console.log("[TrackPlayer] Ignoring network event: ".concat(_this.lastNetworkType, " \u2192 ").concat(newNetworkType, " (not WiFi/Mobile switch)"));
                        _this.lastNetworkType = newNetworkType;
                    }
                }
                else if (_this.lastNetworkType === 'unknown') {
                    _this.lastNetworkType = newNetworkType;
                }
            });
            console.log('[TrackPlayer] Network event listener registered');
        }
        catch (error) {
            console.log('[TrackPlayer] Network event listener not available, using polling only');
        }
    };
    /**
     * Check for network changes (polling fallback)
     */
    TrackPlayerService.prototype.checkNetworkChange = function () {
        return __awaiter(this, void 0, void 0, function () {
            var networkState, currentNetworkType, isMeaningfulChange, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, Network.getNetworkStateAsync()];
                    case 1:
                        networkState = _a.sent();
                        currentNetworkType = void 0;
                        if (networkState.type === Network.NetworkStateType.WIFI) {
                            currentNetworkType = 'wifi';
                        }
                        else if (networkState.type === Network.NetworkStateType.CELLULAR) {
                            currentNetworkType = 'mobile';
                        }
                        else {
                            currentNetworkType = 'unknown';
                        }
                        if (!(currentNetworkType !== this.lastNetworkType && this.lastNetworkType !== 'unknown')) return [3 /*break*/, 5];
                        isMeaningfulChange = (this.lastNetworkType === 'wifi' && currentNetworkType === 'mobile') ||
                            (this.lastNetworkType === 'mobile' && currentNetworkType === 'wifi');
                        if (!isMeaningfulChange) return [3 /*break*/, 3];
                        console.log("[TrackPlayer] Network poll detected change: ".concat(this.lastNetworkType, " \u2192 ").concat(currentNetworkType));
                        this.lastNetworkType = currentNetworkType;
                        return [4 /*yield*/, this.handleNetworkChange(currentNetworkType)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        console.log("[TrackPlayer] Ignoring network change: ".concat(this.lastNetworkType, " \u2192 ").concat(currentNetworkType, " (not WiFi/Mobile switch)"));
                        this.lastNetworkType = currentNetworkType;
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        if (this.lastNetworkType === 'unknown') {
                            this.lastNetworkType = currentNetworkType;
                        }
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_8 = _a.sent();
                        console.error('[TrackPlayer] Network polling error:', error_8);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop monitoring network changes
     */
    TrackPlayerService.prototype.stopNetworkMonitoring = function () {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
            this.networkCheckInterval = null;
        }
    };
    /**
     * Handle network change - ALWAYS switch immediately for consistency
     */
    TrackPlayerService.prototype.handleNetworkChange = function (newNetworkType) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, currentTrack, playbackState, downloadedTrack, _b, streamingQualityWiFi, streamingQualityMobile, streamingFormatWiFi, streamingFormatMobile, downloadedTrack_1, streamingSettings, detailedText, format, startTime, wasPlaying, currentPosition, streamingSettings, detailedText, format, streamUrl, coverArtUrl, seekPosition, elapsedTime, error_9;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = stores_1.usePlayerStore.getState(), currentTrack = _a.currentTrack, playbackState = _a.playbackState;
                        // Only handle network change if something is currently playing or paused
                        if (!currentTrack || playbackState === 'stopped') {
                            console.log('[TrackPlayer] No active track, skipping network change handling');
                            return [2 /*return*/];
                        }
                        downloadedTrack = downloadStore_1.useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
                        if (downloadedTrack) {
                            console.log('[TrackPlayer] Track is downloaded, ignoring network change');
                            return [2 /*return*/];
                        }
                        _b = stores_1.useSettingsStore.getState(), streamingQualityWiFi = _b.streamingQualityWiFi, streamingQualityMobile = _b.streamingQualityMobile, streamingFormatWiFi = _b.streamingFormatWiFi, streamingFormatMobile = _b.streamingFormatMobile;
                        if (!(streamingQualityWiFi === streamingQualityMobile &&
                            streamingFormatWiFi === streamingFormatMobile)) return [3 /*break*/, 4];
                        console.log('[TrackPlayer] WiFi and Mobile settings are identical - no need to switch');
                        console.log("[TrackPlayer] Both use: ".concat(streamingQualityWiFi, " kbps ").concat(streamingFormatWiFi));
                        downloadedTrack_1 = downloadStore_1.useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
                        if (!downloadedTrack_1) return [3 /*break*/, 1];
                        stores_1.usePlayerStore.getState().setStreamingInfo({
                            quality: '0',
                            format: 'Downloaded',
                            displayText: 'Downloaded',
                            displayTextSimple: 'DOWNLOADED',
                            networkType: 'unknown',
                        });
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getActiveStreamingSettings()];
                    case 2:
                        streamingSettings = _c.sent();
                        detailedText = streamingSettings.displayText;
                        if (streamingSettings.quality === '0' && currentTrack.bitRate && currentTrack.suffix) {
                            format = this.formatCodecName(currentTrack.suffix);
                            detailedText = "".concat(currentTrack.bitRate, " kbps ").concat(format);
                        }
                        stores_1.usePlayerStore.getState().setStreamingInfo({
                            quality: streamingSettings.quality,
                            format: streamingSettings.formatName,
                            displayText: detailedText,
                            displayTextSimple: streamingSettings.displayTextSimple,
                            networkType: streamingSettings.networkType,
                        });
                        _c.label = 3;
                    case 3: return [2 /*return*/]; // Skip the stream switch
                    case 4:
                        startTime = Date.now();
                        wasPlaying = playbackState === 'playing';
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 16, , 17]);
                        return [4 /*yield*/, react_native_track_player_1.default.getPosition()];
                    case 6:
                        currentPosition = _c.sent();
                        console.log("[TrackPlayer] Network changed: ".concat(this.lastNetworkType, " \u2192 ").concat(newNetworkType));
                        console.log("[TrackPlayer] Switching quality immediately at position ".concat(currentPosition.toFixed(1), "s"));
                        // Show buffering state
                        stores_1.usePlayerStore.getState().setPlaybackState('buffering');
                        return [4 /*yield*/, this.getActiveStreamingSettings()];
                    case 7:
                        streamingSettings = _c.sent();
                        console.log('[TrackPlayer] New streaming settings:', {
                            quality: streamingSettings.quality,
                            format: streamingSettings.formatName,
                            network: streamingSettings.networkType,
                            display: streamingSettings.displayText,
                            maxBitRateForApi: streamingSettings.maxBitRate,
                            formatForApi: streamingSettings.format,
                        });
                        detailedText = streamingSettings.displayText;
                        if (streamingSettings.quality === '0' && currentTrack.bitRate && currentTrack.suffix) {
                            format = this.formatCodecName(currentTrack.suffix);
                            detailedText = "".concat(currentTrack.bitRate, " kbps ").concat(format);
                        }
                        stores_1.usePlayerStore.getState().setStreamingInfo({
                            quality: streamingSettings.quality,
                            format: streamingSettings.formatName,
                            displayText: detailedText,
                            displayTextSimple: streamingSettings.displayTextSimple,
                            networkType: streamingSettings.networkType,
                        });
                        // Build new stream URL with new transcoding parameters
                        console.log('[TrackPlayer] Building stream URL with params:', {
                            trackId: currentTrack.id,
                            maxBitRate: streamingSettings.maxBitRate,
                            format: streamingSettings.format,
                        });
                        return [4 /*yield*/, (0, streaming_1.getStreamUrl)(currentTrack.id, streamingSettings.maxBitRate, streamingSettings.format)];
                    case 8:
                        streamUrl = _c.sent();
                        console.log('[TrackPlayer] Stream URL built:', streamUrl);
                        coverArtUrl = void 0;
                        if (!currentTrack.coverArt) return [3 /*break*/, 10];
                        return [4 /*yield*/, (0, streaming_1.getCoverArtUrl)(currentTrack.coverArt, 500)];
                    case 9:
                        coverArtUrl = _c.sent();
                        _c.label = 10;
                    case 10: 
                    // Reset and load new stream with new quality
                    return [4 /*yield*/, react_native_track_player_1.default.reset()];
                    case 11:
                        // Reset and load new stream with new quality
                        _c.sent();
                        return [4 /*yield*/, react_native_track_player_1.default.add({
                                id: currentTrack.id,
                                url: streamUrl,
                                title: currentTrack.title,
                                artist: (0, artistUtils_1.getTrackArtistString)(currentTrack),
                                artwork: coverArtUrl,
                                duration: currentTrack.duration,
                            })];
                    case 12:
                        _c.sent();
                        seekPosition = Math.max(0, currentPosition - 0.5);
                        return [4 /*yield*/, react_native_track_player_1.default.seekTo(seekPosition)];
                    case 13:
                        _c.sent();
                        if (!wasPlaying) return [3 /*break*/, 15];
                        return [4 /*yield*/, react_native_track_player_1.default.play()];
                    case 14:
                        _c.sent();
                        _c.label = 15;
                    case 15:
                        elapsedTime = Date.now() - startTime;
                        console.log("[TrackPlayer] Quality switch completed in ".concat(elapsedTime, "ms"));
                        return [3 /*break*/, 17];
                    case 16:
                        error_9 = _c.sent();
                        console.error('[TrackPlayer] Failed to handle network change:', error_9);
                        // Restore playback state on error
                        stores_1.usePlayerStore.getState().setPlaybackState(playbackState);
                        return [3 /*break*/, 17];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.stop()];
                    case 1:
                        _a.sent();
                        stores_1.usePlayerStore.getState().setPlaybackState('stopped');
                        return [2 /*return*/];
                }
            });
        });
    };
    TrackPlayerService.prototype.getVolume = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, stores_1.usePlayerStore.getState().volume];
            });
        });
    };
    TrackPlayerService.prototype.saveState = function () {
        return __awaiter(this, void 0, void 0, function () {
            var position, state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, react_native_track_player_1.default.getPosition()];
                    case 1:
                        position = _a.sent();
                        return [4 /*yield*/, react_native_track_player_1.default.getState()];
                    case 2:
                        state = _a.sent();
                        return [2 /*return*/, {
                                position: position,
                                isPlaying: state === react_native_track_player_1.State.Playing,
                            }];
                }
            });
        });
    };
    TrackPlayerService.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.stopNetworkMonitoring();
                        // Stop managers
                        QueueSyncManager_1.queueSyncManager.stop();
                        ScrobblingManager_1.scrobblingManager.stop();
                        // Force final sync before destroying
                        return [4 /*yield*/, ScrobblingManager_1.scrobblingManager.forceUpdate()];
                    case 1:
                        // Force final sync before destroying
                        _a.sent();
                        return [4 /*yield*/, react_native_track_player_1.default.reset()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get queue sync manager instance
     */
    TrackPlayerService.prototype.getQueueSyncManager = function () {
        return QueueSyncManager_1.queueSyncManager;
    };
    /**
     * Get scrobbling manager instance
     */
    TrackPlayerService.prototype.getScrobblingManager = function () {
        return ScrobblingManager_1.scrobblingManager;
    };
    return TrackPlayerService;
}());
exports.trackPlayerService = new TrackPlayerService();
