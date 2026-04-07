"use strict";
/**
 * Dino Music App - Player Router
 * Abstracts player selection and delegates calls to active service
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
exports.playerRouter = void 0;
var remotePlaybackStore_1 = require("../../stores/remotePlaybackStore");
var TrackPlayerService_1 = require("./TrackPlayerService");
var PlayerRouter = /** @class */ (function () {
    function PlayerRouter() {
        this.players = {
            local: TrackPlayerService_1.trackPlayerService,
        };
    }
    Object.defineProperty(PlayerRouter.prototype, "activePlayer", {
        get: function () {
            var type = remotePlaybackStore_1.useRemotePlaybackStore.getState().activePlayerType;
            var player = this.players[type];
            if (!player) {
                console.warn('[PlayerRouter] Player not available:', type, ', falling back to local');
                return TrackPlayerService_1.trackPlayerService;
            }
            return player;
        },
        enumerable: false,
        configurable: true
    });
    PlayerRouter.prototype.registerPlayer = function (type, service) {
        this.players[type] = service;
        console.log('[PlayerRouter] Registered player:', type);
    };
    PlayerRouter.prototype.unregisterPlayer = function (type) {
        delete this.players[type];
        console.log('[PlayerRouter] Unregistered player:', type);
    };
    PlayerRouter.prototype.getActivePlayerType = function () {
        return remotePlaybackStore_1.useRemotePlaybackStore.getState().activePlayerType;
    };
    PlayerRouter.prototype.setActivePlayer = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('[PlayerRouter] Setting active player:', type);
                remotePlaybackStore_1.useRemotePlaybackStore.getState().setActivePlayerType(type);
                return [2 /*return*/];
            });
        });
    };
    PlayerRouter.prototype.play = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.play()];
            });
        });
    };
    PlayerRouter.prototype.pause = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.pause()];
            });
        });
    };
    PlayerRouter.prototype.togglePlayPause = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.togglePlayPause()];
            });
        });
    };
    PlayerRouter.prototype.seekTo = function (position) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.seekTo(position)];
            });
        });
    };
    PlayerRouter.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.stop()];
            });
        });
    };
    PlayerRouter.prototype.skipToNext = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.skipToNext()];
            });
        });
    };
    PlayerRouter.prototype.skipToPrevious = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.skipToPrevious()];
            });
        });
    };
    PlayerRouter.prototype.playTrack = function (index) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.playTrack(index)];
            });
        });
    };
    PlayerRouter.prototype.setVolume = function (volume) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.setVolume(volume)];
            });
        });
    };
    PlayerRouter.prototype.getVolume = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.getVolume()];
            });
        });
    };
    PlayerRouter.prototype.saveState = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.activePlayer.saveState()];
            });
        });
    };
    PlayerRouter.prototype.connectToDevice = function (device) {
        return __awaiter(this, void 0, void 0, function () {
            var player, previousState, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        player = this.players[device.type];
                        if (!player || !player.connect) {
                            throw new Error("Player type ".concat(device.type, " does not support connection"));
                        }
                        return [4 /*yield*/, TrackPlayerService_1.trackPlayerService.saveState()];
                    case 1:
                        previousState = _a.sent();
                        if (!previousState.isPlaying) return [3 /*break*/, 3];
                        return [4 /*yield*/, TrackPlayerService_1.trackPlayerService.pause()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 8, , 11]);
                        return [4 /*yield*/, player.connect(device)];
                    case 4:
                        _a.sent();
                        remotePlaybackStore_1.useRemotePlaybackStore.getState().selectDevice(device);
                        remotePlaybackStore_1.useRemotePlaybackStore.getState().setActivePlayerType(device.type);
                        if (!previousState.isPlaying) return [3 /*break*/, 7];
                        console.log('[PlayerRouter] Resuming playback from', previousState.position);
                        return [4 /*yield*/, player.play()];
                    case 5:
                        _a.sent();
                        if (!(previousState.position > 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, player.seekTo(previousState.position)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [3 /*break*/, 11];
                    case 8:
                        error_1 = _a.sent();
                        console.error('[PlayerRouter] Failed to connect to device:', error_1);
                        remotePlaybackStore_1.useRemotePlaybackStore.getState().selectDevice(null);
                        remotePlaybackStore_1.useRemotePlaybackStore.getState().setActivePlayerType('local');
                        if (!previousState.isPlaying) return [3 /*break*/, 10];
                        return [4 /*yield*/, TrackPlayerService_1.trackPlayerService.play()];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10: throw error_1;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    PlayerRouter.prototype.disconnectFromDevice = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentType, player, state, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentType = remotePlaybackStore_1.useRemotePlaybackStore.getState().activePlayerType;
                        player = this.players[currentType];
                        // Reset state first
                        remotePlaybackStore_1.useRemotePlaybackStore.getState().selectDevice(null);
                        remotePlaybackStore_1.useRemotePlaybackStore.getState().setActivePlayerType('local');
                        if (!(player && player.disconnect)) return [3 /*break*/, 8];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, player.saveState()];
                    case 2:
                        state = _a.sent();
                        return [4 /*yield*/, player.disconnect()];
                    case 3:
                        _a.sent();
                        if (!state.isPlaying) return [3 /*break*/, 6];
                        console.log('[PlayerRouter] Resuming local playback from', state.position);
                        return [4 /*yield*/, TrackPlayerService_1.trackPlayerService.play()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, TrackPlayerService_1.trackPlayerService.seekTo(state.position)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        console.error('[PlayerRouter] Error during disconnect:', error_2);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return PlayerRouter;
}());
exports.playerRouter = new PlayerRouter();
