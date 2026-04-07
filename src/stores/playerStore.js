"use strict";
/**
 * Dino Music App - Player Store
 * Playback state and lyrics management with Zustand
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.usePlayerStore = void 0;
var zustand_1 = require("zustand");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var constants_1 = require("../config/constants");
exports.usePlayerStore = (0, zustand_1.create)(function (set, get) { return ({
    // Initial State
    currentTrack: null,
    playbackState: 'stopped',
    progress: {
        position: 0,
        duration: 0,
        buffered: 0,
    },
    repeatMode: 'off',
    shuffleEnabled: false,
    volume: 1.0,
    restoredPosition: null,
    streamingInfo: null,
    currentLyrics: null,
    lyricsLoading: {
        isLoading: false,
        trackId: null,
    },
    // Playback Actions
    setCurrentTrack: function (track) {
        set({
            currentTrack: track,
            currentLyrics: null, // Reset lyrics when track changes
            progress: { position: 0, duration: (track === null || track === void 0 ? void 0 : track.duration) || 0, buffered: 0 },
        });
    },
    setPlaybackState: function (state) {
        set({ playbackState: state });
    },
    setProgress: function (position, duration) {
        set(function (state) { return ({
            progress: __assign(__assign({}, state.progress), { position: position, duration: duration }),
        }); });
    },
    setBufferedProgress: function (buffered) {
        set(function (state) { return ({
            progress: __assign(__assign({}, state.progress), { buffered: buffered }),
        }); });
    },
    toggleShuffle: function () {
        var wasShuffled = exports.usePlayerStore.getState().shuffleEnabled;
        set(function (state) { return ({ shuffleEnabled: !state.shuffleEnabled }); });
        get().saveToStorage();
        // Actually shuffle or unshuffle the queue
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        var _a = require('./queueStore').useQueueStore.getState(), shuffleQueue = _a.shuffleQueue, unshuffleQueue = _a.unshuffleQueue;
        if (!wasShuffled) {
            // Turning shuffle ON - shuffle the queue
            shuffleQueue();
        }
        else {
            // Turning shuffle OFF - restore original order
            unshuffleQueue();
        }
    },
    setRepeatMode: function (mode) {
        set({ repeatMode: mode });
        get().saveToStorage();
    },
    cycleRepeatMode: function () {
        set(function (state) {
            var modes = ['off', 'queue', 'track'];
            var currentIndex = modes.indexOf(state.repeatMode);
            var nextIndex = (currentIndex + 1) % modes.length;
            return { repeatMode: modes[nextIndex] };
        });
        get().saveToStorage();
    },
    setVolume: function (volume) {
        set({ volume: Math.max(0, Math.min(1, volume)) });
    },
    // Streaming Actions
    setStreamingInfo: function (info) {
        set({ streamingInfo: info });
    },
    // Lyrics Actions
    setCurrentLyrics: function (lyrics) {
        set({ currentLyrics: lyrics });
    },
    setCurrentLineIndex: function (index) {
        set(function (state) {
            if (!state.currentLyrics)
                return state;
            return {
                currentLyrics: __assign(__assign({}, state.currentLyrics), { currentLineIndex: index }),
            };
        });
    },
    toggleLyricsScrollLock: function () {
        set(function (state) {
            if (!state.currentLyrics)
                return state;
            return {
                currentLyrics: __assign(__assign({}, state.currentLyrics), { isScrollLocked: !state.currentLyrics.isScrollLocked }),
            };
        });
    },
    setLyricsScrollLock: function (locked) {
        set(function (state) {
            if (!state.currentLyrics)
                return state;
            return {
                currentLyrics: __assign(__assign({}, state.currentLyrics), { isScrollLocked: locked }),
            };
        });
    },
    setLyricsLoading: function (isLoading, trackId) {
        set({
            lyricsLoading: {
                isLoading: isLoading,
                trackId: trackId || null,
            },
        });
    },
    // Persistence
    saveToStorage: function () {
        var state = get();
        async_storage_1.default.setItem(constants_1.STORAGE_KEYS.SHUFFLE_ENABLED, JSON.stringify(state.shuffleEnabled));
        async_storage_1.default.setItem(constants_1.STORAGE_KEYS.REPEAT_MODE, state.repeatMode);
    },
    loadFromStorage: function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, shuffleStr, repeatMode, shuffleEnabled, validRepeatModes, validRepeatMode, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.all([
                            async_storage_1.default.getItem(constants_1.STORAGE_KEYS.SHUFFLE_ENABLED),
                            async_storage_1.default.getItem(constants_1.STORAGE_KEYS.REPEAT_MODE),
                        ])];
                case 1:
                    _a = _b.sent(), shuffleStr = _a[0], repeatMode = _a[1];
                    shuffleEnabled = shuffleStr === 'true';
                    validRepeatModes = ['off', 'queue', 'track'];
                    validRepeatMode = repeatMode && validRepeatModes.includes(repeatMode)
                        ? repeatMode
                        : 'off';
                    set({
                        shuffleEnabled: shuffleEnabled,
                        repeatMode: validRepeatMode,
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    console.error('[PlayerStore] Failed to load from storage:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); },
}); });
