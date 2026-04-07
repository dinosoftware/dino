"use strict";
/**
 * Dino Music App - Queue Store
 * Queue management with server sync support using Zustand
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQueueStore = exports.setClearPreloadedTracksCallback = exports.setSyncQueueCallback = exports.setClearRestoredPositionCallback = exports.setQueueSyncCallback = void 0;
var zustand_1 = require("zustand");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var react_native_track_player_1 = require("react-native-track-player");
var constants_1 = require("../config/constants");
var playerStore_1 = require("./playerStore");
var navigationStore_1 = require("./navigationStore");
var playqueue_1 = require("../api/opensubsonic/playqueue");
// Callback for queue sync (set by QueueSyncManager to avoid circular imports)
var queueSyncCallback = null;
var setQueueSyncCallback = function (callback) {
    queueSyncCallback = callback;
};
exports.setQueueSyncCallback = setQueueSyncCallback;
var triggerSync = function (debounced) {
    if (debounced === void 0) { debounced = true; }
    if (queueSyncCallback) {
        queueSyncCallback(debounced);
    }
};
// Callback to clear restored position (set by TrackPlayerService to avoid circular imports)
var clearRestoredPositionCallback = null;
var setClearRestoredPositionCallback = function (callback) {
    clearRestoredPositionCallback = callback;
};
exports.setClearRestoredPositionCallback = setClearRestoredPositionCallback;
var clearRestoredPosition = function () {
    if (clearRestoredPositionCallback) {
        clearRestoredPositionCallback();
    }
};
// Callback to sync queue with TrackPlayer (set by TrackPlayerService)
var syncQueueCallback = null;
var clearPreloadedTracksCallback = null;
var setSyncQueueCallback = function (callback) {
    syncQueueCallback = callback;
};
exports.setSyncQueueCallback = setSyncQueueCallback;
var setClearPreloadedTracksCallback = function (callback) {
    clearPreloadedTracksCallback = callback;
};
exports.setClearPreloadedTracksCallback = setClearPreloadedTracksCallback;
var clearPreloadedTracks = function () {
    if (clearPreloadedTracksCallback) {
        clearPreloadedTracksCallback();
    }
};
var syncQueue = function () {
    if (syncQueueCallback) {
        syncQueueCallback().catch(function (error) {
            console.error('[QueueStore] Failed to sync queue with TrackPlayer:', error);
        });
    }
};
exports.useQueueStore = (0, zustand_1.create)(function (set, get) { return ({
    // Initial State
    queue: [],
    currentIndex: -1,
    originalQueue: [],
    history: [],
    serverSyncStatus: 'synced',
    lastServerSync: 0,
    // Queue Actions
    setQueue: function (queue, currentIndex) {
        var _a;
        if (currentIndex === void 0) { currentIndex = 0; }
        var shuffleEnabled = playerStore_1.usePlayerStore.getState().shuffleEnabled;
        if (shuffleEnabled) {
            // Shuffle is enabled - shuffle the new queue
            var currentTrack = queue[currentIndex];
            var before = queue.slice(0, currentIndex);
            var after = queue.slice(currentIndex + 1);
            var toShuffle = __spreadArray(__spreadArray([], before, true), after, true);
            // Fisher-Yates shuffle
            for (var i = toShuffle.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                _a = [toShuffle[j], toShuffle[i]], toShuffle[i] = _a[0], toShuffle[j] = _a[1];
            }
            var shuffledQueue = currentTrack ? __spreadArray([currentTrack], toShuffle, true) : toShuffle;
            set({
                queue: shuffledQueue,
                currentIndex: currentTrack ? 0 : -1,
                originalQueue: queue,
            });
        }
        else {
            set({
                queue: queue,
                currentIndex: currentIndex,
                originalQueue: queue,
            });
        }
        // CRITICAL: Clear restored position when user starts a new queue
        // This prevents server position from being applied to new queues
        clearRestoredPosition();
        get().saveToStorage();
        triggerSync(true);
    },
    // Internal method for loading from server - doesn't clear restoredPosition
    setQueueFromServer: function (queue, currentIndex) {
        var _a;
        if (currentIndex === void 0) { currentIndex = 0; }
        var shuffleEnabled = playerStore_1.usePlayerStore.getState().shuffleEnabled;
        if (shuffleEnabled) {
            // Shuffle is enabled - shuffle the queue from server too
            var currentTrack = queue[currentIndex];
            var before = queue.slice(0, currentIndex);
            var after = queue.slice(currentIndex + 1);
            var toShuffle = __spreadArray(__spreadArray([], before, true), after, true);
            for (var i = toShuffle.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                _a = [toShuffle[j], toShuffle[i]], toShuffle[i] = _a[0], toShuffle[j] = _a[1];
            }
            var shuffledQueue = currentTrack ? __spreadArray([currentTrack], toShuffle, true) : toShuffle;
            set({
                queue: shuffledQueue,
                currentIndex: currentTrack ? 0 : -1,
                originalQueue: queue,
            });
        }
        else {
            set({
                queue: queue,
                currentIndex: currentIndex,
                originalQueue: queue,
            });
        }
        // DON'T clear restoredPosition - server is restoring playback state
        get().saveToStorage();
        // Don't trigger sync when loading FROM server
    },
    addToQueue: function (tracks, position) {
        if (position === void 0) { position = 'end'; }
        var tracksArray = Array.isArray(tracks) ? tracks : [tracks];
        var state = get();
        // If queue is empty, create new queue and start playing
        if (state.queue.length === 0) {
            var usePlayerStore_1 = require('./playerStore').usePlayerStore;
            var trackPlayerService = require('../services/player/TrackPlayerService').trackPlayerService;
            set({
                queue: tracksArray,
                currentIndex: 0,
                originalQueue: tracksArray,
            });
            usePlayerStore_1.getState().setCurrentTrack(tracksArray[0]);
            trackPlayerService.playTrack(0).catch(function (err) {
                console.error('[QueueStore] Failed to play track:', err);
            });
            get().saveToStorage();
            triggerSync(true);
            return;
        }
        set(function (state) {
            var newQueue;
            if (position === 'next') {
                // Add after current track
                var before = state.queue.slice(0, state.currentIndex + 1);
                var after = state.queue.slice(state.currentIndex + 1);
                newQueue = __spreadArray(__spreadArray(__spreadArray([], before, true), tracksArray, true), after, true);
            }
            else {
                // Add to end
                newQueue = __spreadArray(__spreadArray([], state.queue, true), tracksArray, true);
            }
            return { queue: newQueue };
        });
        get().saveToStorage();
        // If adding to 'next', the immediate next track changed - update preloaded track
        if (position === 'next') {
            clearPreloadedTracks();
        }
        triggerSync(true);
    },
    removeFromQueue: function (index) {
        var oldCurrentIndex = get().currentIndex;
        var removingCurrentTrack = index === oldCurrentIndex;
        set(function (state) {
            var newQueue = state.queue.filter(function (_, i) { return i !== index; });
            var newIndex = state.currentIndex;
            // Adjust current index if needed
            if (index < state.currentIndex) {
                // Removed track was before current, shift index down
                newIndex = state.currentIndex - 1;
            }
            else if (index === state.currentIndex) {
                // Removing current track
                // Keep same index - this will point to the track that was "next"
                // But clamp to valid range
                newIndex = Math.min(state.currentIndex, newQueue.length - 1);
            }
            // If index > currentIndex, no change needed
            return {
                queue: newQueue,
                currentIndex: newIndex,
            };
        });
        get().saveToStorage();
        if (removingCurrentTrack && get().queue.length > 0) {
            // Removing current track - skip to next
            console.log('[QueueStore] Removed current track, skipping to next');
            react_native_track_player_1.default.skipToNext().catch(function (err) {
                console.error('[QueueStore] Failed to skip to next after removing current:', err);
            });
        }
        else if (index === oldCurrentIndex + 1) {
            // Removed the immediate next track - preloaded track is now stale
            clearPreloadedTracks();
        }
        triggerSync(true);
    },
    reorderQueue: function (fromIndex, toIndex) {
        var oldCurrentIndex = get().currentIndex;
        set(function (state) {
            var newQueue = __spreadArray([], state.queue, true);
            var movedTrack = newQueue.splice(fromIndex, 1)[0];
            newQueue.splice(toIndex, 0, movedTrack);
            // Adjust current index
            var newIndex = state.currentIndex;
            if (fromIndex === state.currentIndex) {
                newIndex = toIndex;
            }
            else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
                newIndex = state.currentIndex - 1;
            }
            else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
                newIndex = state.currentIndex + 1;
            }
            return {
                queue: newQueue,
                currentIndex: newIndex,
            };
        });
        get().saveToStorage();
        // Clear preloaded tracks if the move could change what plays next.
        // Use oldCurrentIndex because preloaded track was based on that position.
        var oldNextPosition = oldCurrentIndex + 1;
        var moveTouchedNextSlot = fromIndex === oldCurrentIndex || // current track itself was moved
            fromIndex === oldNextPosition || // the preloaded next track was moved away
            toIndex === oldNextPosition; // something new was moved into next position
        if (moveTouchedNextSlot) {
            console.log('[QueueStore] Reorder changed next track, clearing preloaded tracks');
            clearPreloadedTracks();
        }
        triggerSync(true);
    },
    clearQueue: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (clearServerQueue) {
            var error_1;
            if (clearServerQueue === void 0) { clearServerQueue = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Stop playback and reset TrackPlayer
                    return [4 /*yield*/, react_native_track_player_1.default.reset()];
                    case 1:
                        // Stop playback and reset TrackPlayer
                        _a.sent();
                        // Clear queue state
                        set({
                            queue: [],
                            currentIndex: -1,
                            originalQueue: [],
                            history: [],
                        });
                        get().saveToStorage();
                        // Clear player state
                        playerStore_1.usePlayerStore.getState().setCurrentTrack(null);
                        playerStore_1.usePlayerStore.getState().setPlaybackState('stopped');
                        // Close full player if open
                        navigationStore_1.useNavigationStore.getState().closeFullPlayer();
                        if (!clearServerQueue) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, playqueue_1.savePlayQueue)([], undefined, undefined)];
                    case 3:
                        _a.sent();
                        console.log('[QueueStore] Server queue cleared');
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.error('[QueueStore] Failed to clear server queue:', error_1);
                        return [3 /*break*/, 5];
                    case 5:
                        triggerSync(true);
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    },
    shuffleQueue: function () {
        set(function (state) {
            var _a;
            // Save original order
            var originalQueue = __spreadArray([], state.queue, true);
            var currentTrack = state.queue[state.currentIndex];
            // Shuffle remaining tracks (excluding current)
            var before = state.queue.slice(0, state.currentIndex);
            var after = state.queue.slice(state.currentIndex + 1);
            var toShuffle = __spreadArray(__spreadArray([], before, true), after, true);
            // Fisher-Yates shuffle
            for (var i = toShuffle.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                _a = [toShuffle[j], toShuffle[i]], toShuffle[i] = _a[0], toShuffle[j] = _a[1];
            }
            // Rebuild queue with current track first
            var shuffledQueue = currentTrack
                ? __spreadArray([currentTrack], toShuffle, true) : toShuffle;
            return {
                queue: shuffledQueue,
                currentIndex: currentTrack ? 0 : -1,
                originalQueue: originalQueue,
            };
        });
        get().saveToStorage();
    },
    unshuffleQueue: function () {
        set(function (state) {
            if (state.originalQueue.length === 0)
                return state;
            var currentTrack = state.queue[state.currentIndex];
            var originalIndex = currentTrack
                ? state.originalQueue.findIndex(function (t) { return t.id === currentTrack.id; })
                : -1;
            return {
                queue: state.originalQueue,
                currentIndex: originalIndex,
                originalQueue: [],
            };
        });
        get().saveToStorage();
    },
    skipToTrack: function (index) {
        set(function (state) {
            // Add current track to history
            if (state.currentIndex >= 0 && state.currentIndex < state.queue.length) {
                var currentTrack = state.queue[state.currentIndex];
                return {
                    currentIndex: index,
                    history: __spreadArray(__spreadArray([], state.history, true), [currentTrack], false),
                };
            }
            return { currentIndex: index };
        });
        get().saveToStorage();
        triggerSync(true);
    },
    skipToNext: function () {
        var state = get();
        if (state.currentIndex < state.queue.length - 1) {
            get().skipToTrack(state.currentIndex + 1);
            return true;
        }
        return false;
    },
    skipToPrevious: function () {
        var state = get();
        if (state.currentIndex > 0) {
            get().skipToTrack(state.currentIndex - 1);
            return true;
        }
        return false;
    },
    // Server Sync Actions
    setServerSyncStatus: function (status) {
        set({ serverSyncStatus: status });
    },
    markServerSynced: function () {
        set({
            serverSyncStatus: 'synced',
            lastServerSync: Date.now(),
        });
    },
    // Persistence
    saveToStorage: function () {
        var state = get();
        async_storage_1.default.setItem(constants_1.STORAGE_KEYS.QUEUE, JSON.stringify(state.queue));
        async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CURRENT_TRACK_INDEX, state.currentIndex.toString());
    },
    loadFromStorage: function () { return __awaiter(void 0, void 0, void 0, function () {
        var queueJson, queue, currentIndexStr, currentIndex, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, async_storage_1.default.getItem(constants_1.STORAGE_KEYS.QUEUE)];
                case 1:
                    queueJson = _a.sent();
                    queue = queueJson ? JSON.parse(queueJson) : [];
                    return [4 /*yield*/, async_storage_1.default.getItem(constants_1.STORAGE_KEYS.CURRENT_TRACK_INDEX)];
                case 2:
                    currentIndexStr = _a.sent();
                    currentIndex = currentIndexStr ? parseInt(currentIndexStr, 10) : -1;
                    set({ queue: queue, currentIndex: currentIndex, originalQueue: queue });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('Failed to load queue from storage:', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); },
}); });
