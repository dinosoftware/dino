"use strict";
/**
 * Dino Music App - Scrobbling Manager
 * Handles track play counting and scrobbling to server
 * Also triggers queue sync when updating playback progress
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
exports.scrobblingManager = void 0;
var streaming_1 = require("../../api/opensubsonic/streaming");
var stores_1 = require("../../stores");
var QueueSyncManager_1 = require("./QueueSyncManager");
var ScrobblingManager = /** @class */ (function () {
    function ScrobblingManager() {
        this.state = {
            currentTrackId: null,
            hasScrobbledNowPlaying: false,
            hasScrobbledSubmission: false,
            lastProgressUpdate: 0,
        };
        this.progressUpdateInterval = null;
        this.PROGRESS_UPDATE_INTERVAL = 30000; // 30 seconds
        this.SCROBBLE_THRESHOLD = 0.75; // 80% of track or 4 minutes
    }
    /**
     * Start scrobbling manager
     */
    ScrobblingManager.prototype.start = function () {
        var _this = this;
        console.log('[Scrobbling] 🚀 Starting manager with interval:', this.PROGRESS_UPDATE_INTERVAL);
        // Clear existing interval
        this.stop();
        // Setup periodic progress updates (30 seconds)
        this.progressUpdateInterval = setInterval(function () {
            console.log('[Scrobbling] ⏰ Interval triggered, calling updateProgress()');
            _this.updateProgress();
        }, this.PROGRESS_UPDATE_INTERVAL);
        console.log('[Scrobbling] ✅ Manager started, interval ID:', this.progressUpdateInterval);
    };
    /**
     * Stop scrobbling manager
     */
    ScrobblingManager.prototype.stop = function () {
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
        console.log('[Scrobbling] Stopped');
    };
    /**
     * Handle track change - send "now playing" scrobble
     */
    ScrobblingManager.prototype.onTrackChange = function (track, previousTrack, position, duration) {
        return __awaiter(this, void 0, void 0, function () {
            var pos, dur, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(previousTrack && position !== undefined && duration !== undefined)) return [3 /*break*/, 2];
                        pos = position;
                        dur = duration || previousTrack.duration;
                        console.log('[Scrobbling] Track changed, checking if previous track should be scrobbled:', previousTrack.title);
                        // Force check even if already scrobbled, in case track changed before periodic update
                        return [4 /*yield*/, this.onTrackPlayed(previousTrack, pos, dur, true)];
                    case 1:
                        // Force check even if already scrobbled, in case track changed before periodic update
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!track) {
                            this.resetState();
                            return [2 /*return*/];
                        }
                        // Reset state for new track
                        this.state = {
                            currentTrackId: track.id,
                            hasScrobbledNowPlaying: false,
                            hasScrobbledSubmission: false,
                            lastProgressUpdate: 0,
                        };
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        console.log('[Scrobbling] Sending now playing for:', track.title);
                        return [4 /*yield*/, (0, streaming_1.scrobble)(track.id, Date.now(), false)];
                    case 4:
                        _a.sent();
                        this.state.hasScrobbledNowPlaying = true;
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        console.error('[Scrobbling] Failed to send now playing:', error_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle track completion or significant playback (80% or 4 minutes)
     * Send submission scrobble
     */
    ScrobblingManager.prototype.onTrackPlayed = function (track_1, position_1, duration_1) {
        return __awaiter(this, arguments, void 0, function (track, position, duration, force) {
            var isAtEndOfTrack, playedPercentage, playedMinutes, shouldScrobble, error_2;
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isAtEndOfTrack = duration > 0 && Math.abs(position - duration) < 5;
                        if (!force && !isAtEndOfTrack && this.state.hasScrobbledSubmission && this.state.currentTrackId === track.id) {
                            console.log('[Scrobbling] Already scrobbled this track, skipping');
                            return [2 /*return*/];
                        }
                        playedPercentage = duration > 0 ? position / duration : 0;
                        playedMinutes = position / 60;
                        shouldScrobble = playedPercentage >= this.SCROBBLE_THRESHOLD || playedMinutes >= 4 || isAtEndOfTrack;
                        console.log('[Scrobbling] Checking if should scrobble:', track.title, {
                            position: position.toFixed(1),
                            duration: duration.toFixed(1),
                            percentage: (playedPercentage * 100).toFixed(1) + '%',
                            playedMinutes: playedMinutes.toFixed(1),
                            isAtEndOfTrack: isAtEndOfTrack,
                            shouldScrobble: shouldScrobble,
                            force: force,
                        });
                        if (!shouldScrobble) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        console.log('[Scrobbling] Submitting scrobble for:', track.title);
                        // Send submission scrobble
                        return [4 /*yield*/, (0, streaming_1.scrobble)(track.id, undefined, true)];
                    case 2:
                        // Send submission scrobble
                        _a.sent();
                        this.state.hasScrobbledSubmission = true;
                        console.log('[Scrobbling] ✅ Successfully scrobbled:', track.title);
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[Scrobbling] ❌ Failed to submit scrobble:', error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update playback progress periodically (every 30 seconds)
     * This also triggers queue sync with current position
     */
    ScrobblingManager.prototype.updateProgress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, currentTrack, playbackState, progress, now, position, duration, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = stores_1.usePlayerStore.getState(), currentTrack = _a.currentTrack, playbackState = _a.playbackState, progress = _a.progress;
                        // Only update if playing
                        if (playbackState !== 'playing' || !currentTrack) {
                            return [2 /*return*/];
                        }
                        now = Date.now();
                        // Don't update too frequently (though interval should prevent this)
                        if (now - this.state.lastProgressUpdate < this.PROGRESS_UPDATE_INTERVAL - 1000) {
                            return [2 /*return*/];
                        }
                        this.state.lastProgressUpdate = now;
                        position = progress.position;
                        duration = progress.duration || currentTrack.duration;
                        console.log('[Scrobbling] Updating progress:', {
                            track: currentTrack.title,
                            position: position.toFixed(1),
                            duration: duration.toFixed(1),
                        });
                        // Check if we should submit scrobble (80% or 4 minutes)
                        return [4 /*yield*/, this.onTrackPlayed(currentTrack, position, duration)];
                    case 1:
                        // Check if we should submit scrobble (80% or 4 minutes)
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        console.log('[Scrobbling] Syncing queue with position:', position.toFixed(1));
                        return [4 /*yield*/, QueueSyncManager_1.queueSyncManager.syncToServer(position)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _b.sent();
                        console.error('[Scrobbling] Failed to sync queue during progress update:', error_3);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle playback state change
     */
    ScrobblingManager.prototype.onPlaybackStateChange = function (state) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, currentTrack, progress, _b, currentTrack, progress;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(state === 'stopped')) return [3 /*break*/, 3];
                        _a = stores_1.usePlayerStore.getState(), currentTrack = _a.currentTrack, progress = _a.progress;
                        if (!currentTrack) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.onTrackPlayed(currentTrack, progress.position, progress.duration)];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2:
                        this.resetState();
                        return [3 /*break*/, 5];
                    case 3:
                        if (!(state === 'paused')) return [3 /*break*/, 5];
                        _b = stores_1.usePlayerStore.getState(), currentTrack = _b.currentTrack, progress = _b.progress;
                        if (!currentTrack) return [3 /*break*/, 5];
                        return [4 /*yield*/, QueueSyncManager_1.queueSyncManager.syncToServer(progress.position)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle natural track end (queue ended or track finished)
     */
    ScrobblingManager.prototype.onTrackEnded = function (track, position, duration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[Scrobbling] Track ended naturally:', track.title);
                        // Force scrobble with full duration for natural endings
                        return [4 /*yield*/, this.onTrackPlayed(track, duration, duration, true)];
                    case 1:
                        // Force scrobble with full duration for natural endings
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle seek - update progress immediately
     */
    ScrobblingManager.prototype.onSeek = function (position) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[Scrobbling] Seek detected, syncing position:', position.toFixed(1));
                        return [4 /*yield*/, QueueSyncManager_1.queueSyncManager.syncToServer(position)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset scrobble state
     */
    ScrobblingManager.prototype.resetState = function () {
        this.state = {
            currentTrackId: null,
            hasScrobbledNowPlaying: false,
            hasScrobbledSubmission: false,
            lastProgressUpdate: 0,
        };
    };
    /**
     * Force immediate progress update and queue sync
     * Useful for app backgrounding or user-initiated sync
     */
    ScrobblingManager.prototype.forceUpdate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, currentTrack, playbackState;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = stores_1.usePlayerStore.getState(), currentTrack = _a.currentTrack, playbackState = _a.playbackState;
                        if (!(playbackState === 'playing' && currentTrack)) return [3 /*break*/, 2];
                        console.log('[Scrobbling] Force updating progress and queue');
                        this.state.lastProgressUpdate = 0; // Reset to allow immediate update
                        return [4 /*yield*/, this.updateProgress()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return ScrobblingManager;
}());
exports.scrobblingManager = new ScrobblingManager();
