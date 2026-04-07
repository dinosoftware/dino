"use strict";
/**
 * Dino Music App - usePlayer Hook
 * Hook for player controls
 * OPTIMIZED with selective subscriptions to prevent re-renders
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
exports.usePlayer = void 0;
var react_1 = require("react");
var PlayerRouter_1 = require("../services/player/PlayerRouter");
var stores_1 = require("../stores");
var usePlayer = function () {
    var currentTrack = (0, stores_1.usePlayerStore)(function (state) { return state.currentTrack; });
    var playbackState = (0, stores_1.usePlayerStore)(function (state) { return state.playbackState; });
    var progress = (0, stores_1.usePlayerStore)(function (state) { return state.progress; });
    var repeatMode = (0, stores_1.usePlayerStore)(function (state) { return state.repeatMode; });
    var shuffleEnabled = (0, stores_1.usePlayerStore)(function (state) { return state.shuffleEnabled; });
    var volume = (0, stores_1.usePlayerStore)(function (state) { return state.volume; });
    var play = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.play()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var pause = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.pause()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var togglePlayPause = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.togglePlayPause()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var skipToNext = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.skipToNext()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var skipToPrevious = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.skipToPrevious()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var seekTo = (0, react_1.useCallback)(function (positionSeconds) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.seekTo(positionSeconds)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var setVolume = (0, react_1.useCallback)(function (vol) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PlayerRouter_1.playerRouter.setVolume(vol)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var toggleShuffle = (0, react_1.useCallback)(function () {
        stores_1.usePlayerStore.getState().toggleShuffle();
    }, []);
    var cycleRepeatMode = (0, react_1.useCallback)(function () {
        stores_1.usePlayerStore.getState().cycleRepeatMode();
    }, []);
    return {
        currentTrack: currentTrack,
        playbackState: playbackState,
        progress: progress,
        repeatMode: repeatMode,
        shuffleEnabled: shuffleEnabled,
        volume: volume,
        isPlaying: playbackState === 'playing',
        play: play,
        pause: pause,
        togglePlayPause: togglePlayPause,
        skipToNext: skipToNext,
        skipToPrevious: skipToPrevious,
        seekTo: seekTo,
        setVolume: setVolume,
        toggleShuffle: toggleShuffle,
        cycleRepeatMode: cycleRepeatMode,
    };
};
exports.usePlayer = usePlayer;
