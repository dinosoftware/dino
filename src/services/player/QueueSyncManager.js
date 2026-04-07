"use strict";
/**
 * Dino Music App - Queue Sync Manager
 * Handles server queue synchronization with playback position tracking
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
exports.queueSyncManager = void 0;
var playqueue_1 = require("../../api/opensubsonic/playqueue");
var stores_1 = require("../../stores");
var queueStore_1 = require("../../stores/queueStore");
var constants_1 = require("../../config/constants");
var QueueSyncManager = /** @class */ (function () {
    function QueueSyncManager() {
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.isSyncing = false;
        this.syncDebounceTimer = null;
    }
    /**
     * Start automatic queue synchronization
     */
    QueueSyncManager.prototype.start = function () {
        var _this = this;
        var _a = stores_1.useSettingsStore.getState(), autoSyncQueue = _a.autoSyncQueue, queueSyncInterval = _a.queueSyncInterval;
        if (!autoSyncQueue) {
            console.log('[QueueSync] Auto-sync disabled in settings');
            return;
        }
        console.log('[QueueSync] Starting automatic sync with interval:', queueSyncInterval);
        // Register callback for queue store to trigger sync
        (0, queueStore_1.setQueueSyncCallback)(function (debounced) {
            if (debounced === void 0) { debounced = true; }
            if (debounced) {
                _this.syncToServerDebounced();
            }
            else {
                _this.syncToServer();
            }
        });
        // Clear existing interval
        this.stop();
        // Don't sync immediately - wait for loadFromServer to complete first
        // The caller (TrackPlayerService) will call loadFromServer() and then
        // periodic sync will handle subsequent syncs
        // Setup periodic sync
        this.syncInterval = setInterval(function () {
            _this.syncToServer();
        }, queueSyncInterval);
    };
    /**
     * Stop automatic queue synchronization
     */
    QueueSyncManager.prototype.stop = function () {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
            this.syncDebounceTimer = null;
        }
        console.log('[QueueSync] Stopped');
    };
    /**
     * Sync queue to server with current position
     * This is called by ScrobblingManager when updating playback progress
     * @param currentPosition - Optional current playback position
     * @param force - If true, bypass autoSyncQueue setting check
     */
    QueueSyncManager.prototype.syncToServer = function (currentPosition_1) {
        return __awaiter(this, arguments, void 0, function (currentPosition, force) {
            var autoSyncQueue, now, _a, queue, currentIndex, setServerSyncStatus, markServerSynced, trackIds, currentTrackId, position, progress, error_1;
            var _b;
            if (force === void 0) { force = false; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        autoSyncQueue = stores_1.useSettingsStore.getState().autoSyncQueue;
                        if (!force && !autoSyncQueue) {
                            return [2 /*return*/];
                        }
                        now = Date.now();
                        if (now - this.lastSyncTime < constants_1.QUEUE_SYNC_CONFIG.SYNC_DEBOUNCE && !currentPosition) {
                            console.log('[QueueSync] Sync debounced (too frequent)');
                            return [2 /*return*/];
                        }
                        if (this.isSyncing) {
                            console.log('[QueueSync] Sync already in progress, skipping');
                            return [2 /*return*/];
                        }
                        this.isSyncing = true;
                        _a = stores_1.useQueueStore.getState(), queue = _a.queue, currentIndex = _a.currentIndex, setServerSyncStatus = _a.setServerSyncStatus, markServerSynced = _a.markServerSynced;
                        // Don't sync empty queue
                        if (queue.length === 0) {
                            console.log('[QueueSync] Queue is empty, skipping sync');
                            this.isSyncing = false;
                            return [2 /*return*/];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, 4, 5]);
                        setServerSyncStatus('syncing');
                        trackIds = queue.map(function (track) { return track.id; });
                        currentTrackId = currentIndex >= 0 && currentIndex < queue.length
                            ? (_b = queue[currentIndex]) === null || _b === void 0 ? void 0 : _b.id
                            : undefined;
                        position = currentPosition;
                        if (position === undefined) {
                            progress = stores_1.usePlayerStore.getState().progress;
                            position = Math.floor(progress.position * 1000); // Convert to milliseconds
                        }
                        else {
                            position = Math.floor(position * 1000); // Convert to milliseconds
                        }
                        console.log('[QueueSync] Syncing to server:', {
                            trackCount: trackIds.length,
                            currentTrackId: currentTrackId,
                            position: position / 1000, // Log in seconds for readability
                        });
                        return [4 /*yield*/, (0, playqueue_1.savePlayQueue)(trackIds, currentTrackId, position)];
                    case 2:
                        _c.sent();
                        markServerSynced();
                        this.lastSyncTime = now;
                        console.log('[QueueSync] Successfully synced to server');
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _c.sent();
                        console.error('[QueueSync] Failed to sync to server:', error_1);
                        setServerSyncStatus('error');
                        return [3 /*break*/, 5];
                    case 4:
                        this.isSyncing = false;
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sync queue to server with debouncing
     * Useful for queue modifications (add, remove, reorder)
     */
    QueueSyncManager.prototype.syncToServerDebounced = function (delay) {
        var _this = this;
        if (delay === void 0) { delay = 2000; }
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
        }
        this.syncDebounceTimer = setTimeout(function () {
            _this.syncToServer();
        }, delay);
    };
    /**
     * Load queue from server
     * Returns true if server queue was loaded, false if using local queue
     * @param force - If true, bypass autoSyncQueue setting check
     * @param forceUseServer - If true, always use server queue regardless of timestamps
     */
    QueueSyncManager.prototype.loadFromServer = function () {
        return __awaiter(this, arguments, void 0, function (force, forceUseServer) {
            var autoSyncQueue, response, serverQueue, _a, localQueue, setQueue, markServerSynced, shouldUseServerQueue, positionSeconds, currentTrackId_1, currentIndex, error_2;
            var _b;
            if (force === void 0) { force = false; }
            if (forceUseServer === void 0) { forceUseServer = false; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        autoSyncQueue = stores_1.useSettingsStore.getState().autoSyncQueue;
                        if (!force && !autoSyncQueue) {
                            console.log('[QueueSync] Auto-sync disabled, skipping server load');
                            return [2 /*return*/, false];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        console.log('[QueueSync] Loading queue from server...');
                        return [4 /*yield*/, (0, playqueue_1.getPlayQueue)()];
                    case 2:
                        response = _c.sent();
                        serverQueue = response.playQueue;
                        console.log('[QueueSync] Server queue:', {
                            hasPlayQueue: !!serverQueue,
                            entryLength: (_b = serverQueue === null || serverQueue === void 0 ? void 0 : serverQueue.entry) === null || _b === void 0 ? void 0 : _b.length,
                            changed: serverQueue === null || serverQueue === void 0 ? void 0 : serverQueue.changed,
                            current: serverQueue === null || serverQueue === void 0 ? void 0 : serverQueue.current,
                        });
                        if (!serverQueue || !serverQueue.entry || serverQueue.entry.length === 0) {
                            console.log('[QueueSync] No queue on server');
                            return [2 /*return*/, false];
                        }
                        _a = stores_1.useQueueStore.getState(), localQueue = _a.queue, setQueue = _a.setQueue, markServerSynced = _a.markServerSynced;
                        shouldUseServerQueue = forceUseServer || this.shouldUseServerQueue(serverQueue, localQueue);
                        if (shouldUseServerQueue) {
                            positionSeconds = serverQueue.position ? serverQueue.position / 1000 : 0;
                            currentTrackId_1 = serverQueue.current;
                            currentIndex = currentTrackId_1
                                ? serverQueue.entry.findIndex(function (track) { return track.id === currentTrackId_1; })
                                : 0;
                            console.log('[QueueSync] Using server queue:', {
                                trackCount: serverQueue.entry.length,
                                currentIndex: currentIndex,
                                currentTrackId: currentTrackId_1,
                                position: positionSeconds,
                            });
                            // Load server queue using setQueueFromServer to preserve restoredPosition
                            stores_1.useQueueStore.getState().setQueueFromServer(serverQueue.entry, currentIndex);
                            // Store the position to restore after track is loaded
                            if (serverQueue.position && positionSeconds > 0) {
                                // Store in player store so TrackPlayerService can use it
                                stores_1.usePlayerStore.setState({
                                    restoredPosition: positionSeconds
                                });
                                console.log('[QueueSync] Will restore position:', positionSeconds);
                            }
                            markServerSynced();
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, false];
                    case 3:
                        error_2 = _c.sent();
                        console.error('[QueueSync] Failed to load from server:', error_2);
                        stores_1.useQueueStore.getState().setServerSyncStatus('error');
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Determine if we should use server queue over local queue
     * Returns true if server queue is newer or local queue is empty
     */
    QueueSyncManager.prototype.shouldUseServerQueue = function (serverQueue, localQueue) {
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
            var serverTimestamp = new Date(serverQueue.changed).getTime();
            var localTimestamp = stores_1.useQueueStore.getState().lastServerSync;
            // If server queue is significantly newer, prefer it
            if (serverTimestamp - localTimestamp > constants_1.QUEUE_SYNC_CONFIG.CONFLICT_THRESHOLD) {
                console.log('[QueueSync] Server queue is newer, using it');
                return true;
            }
        }
        // Default: keep local queue
        return false;
    };
    /**
     * Trigger manual sync (for user-initiated sync)
     */
    QueueSyncManager.prototype.manualSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[QueueSync] Manual sync triggered');
                        // Bypass debouncing for manual sync
                        this.lastSyncTime = 0;
                        return [4 /*yield*/, this.syncToServer()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return QueueSyncManager;
}());
exports.queueSyncManager = new QueueSyncManager();
