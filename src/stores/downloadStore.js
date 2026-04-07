"use strict";
/**
 * Dino Music App - Download Store
 * Download progress tracking with Zustand - supports tracks, albums, and playlists
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
exports.useDownloadStore = void 0;
var zustand_1 = require("zustand");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var constants_1 = require("../config/constants");
exports.useDownloadStore = (0, zustand_1.create)(function (set, get) { return ({
    activeDownloads: {},
    downloadedTracks: {},
    downloadedAlbums: {},
    downloadedPlaylists: {},
    totalStorageUsed: 0,
    addDownload: function (itemId, type, totalBytes, totalTracks) {
        var id = "download_".concat(Date.now(), "_").concat(itemId);
        var download = {
            id: id,
            itemId: itemId,
            type: type,
            progress: 0,
            totalBytes: totalBytes,
            downloadedBytes: 0,
            status: 'pending',
            totalTracks: totalTracks,
            completedTracks: 0,
        };
        set(function (state) {
            var _a;
            return ({
                activeDownloads: __assign(__assign({}, state.activeDownloads), (_a = {}, _a[id] = download, _a)),
            });
        });
        return id;
    },
    updateProgress: function (id, downloadedBytes, completedTracks, totalBytes) {
        set(function (state) {
            var _a;
            var download = state.activeDownloads[id];
            if (!download)
                return state;
            var finalTotalBytes = totalBytes !== null && totalBytes !== void 0 ? totalBytes : download.totalBytes;
            var progress = 0;
            if (download.totalTracks && download.totalTracks > 0 && completedTracks !== undefined) {
                progress = completedTracks / download.totalTracks;
            }
            else if (finalTotalBytes > 0) {
                progress = downloadedBytes / finalTotalBytes;
            }
            return {
                activeDownloads: __assign(__assign({}, state.activeDownloads), (_a = {}, _a[id] = __assign(__assign(__assign({}, download), { downloadedBytes: downloadedBytes, totalBytes: finalTotalBytes, progress: progress, status: 'downloading' }), (completedTracks !== undefined && { completedTracks: completedTracks })), _a)),
            };
        });
    },
    updateDownloadMeta: function (id, meta) {
        set(function (state) {
            var _a;
            var download = state.activeDownloads[id];
            if (!download)
                return state;
            return {
                activeDownloads: __assign(__assign({}, state.activeDownloads), (_a = {}, _a[id] = __assign(__assign({}, download), meta), _a)),
            };
        });
    },
    completeDownload: function (id) {
        set(function (state) {
            var _a;
            var download = state.activeDownloads[id];
            if (!download)
                return state;
            return {
                activeDownloads: __assign(__assign({}, state.activeDownloads), (_a = {}, _a[id] = __assign(__assign({}, download), { progress: 1, status: 'completed' }), _a)),
            };
        });
    },
    failDownload: function (id, error) {
        set(function (state) {
            var _a;
            var download = state.activeDownloads[id];
            if (!download)
                return state;
            return {
                activeDownloads: __assign(__assign({}, state.activeDownloads), (_a = {}, _a[id] = __assign(__assign({}, download), { status: 'failed', error: error }), _a)),
            };
        });
    },
    cancelDownload: function (id) {
        set(function (state) {
            var _a;
            var download = state.activeDownloads[id];
            if (!download)
                return state;
            return {
                activeDownloads: __assign(__assign({}, state.activeDownloads), (_a = {}, _a[id] = __assign(__assign({}, download), { status: 'cancelled' }), _a)),
            };
        });
    },
    isTrackDownloaded: function (trackId) { return !!get().downloadedTracks[trackId]; },
    isAlbumDownloaded: function (albumId) { return !!get().downloadedAlbums[albumId]; },
    isPlaylistDownloaded: function (playlistId) { return !!get().downloadedPlaylists[playlistId]; },
    markTrackDownloaded: function (track, localUri, size, coverArtUri, lyricsUri) {
        set(function (state) {
            var _a;
            return ({
                downloadedTracks: __assign(__assign({}, state.downloadedTracks), (_a = {}, _a[track.id] = {
                    track: track,
                    localUri: localUri,
                    coverArtUri: coverArtUri,
                    lyricsUri: lyricsUri,
                    downloadedAt: Date.now(),
                    size: size,
                }, _a)),
                totalStorageUsed: state.totalStorageUsed + size,
            });
        });
        get().saveToStorage();
    },
    removeTrackDownload: function (trackId) { return __awaiter(void 0, void 0, void 0, function () {
        var downloadedTrack, FileSystem_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    downloadedTrack = get().downloadedTracks[trackId];
                    if (!downloadedTrack)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('expo-file-system'); })];
                case 2:
                    FileSystem_1 = _a.sent();
                    return [4 /*yield*/, FileSystem_1.deleteAsync(downloadedTrack.localUri, { idempotent: true })];
                case 3:
                    _a.sent();
                    if (!downloadedTrack.coverArtUri) return [3 /*break*/, 5];
                    return [4 /*yield*/, FileSystem_1.deleteAsync(downloadedTrack.coverArtUri, { idempotent: true })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    if (!downloadedTrack.lyricsUri) return [3 /*break*/, 7];
                    return [4 /*yield*/, FileSystem_1.deleteAsync(downloadedTrack.lyricsUri, { idempotent: true })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error('Failed to delete track files:', error_1);
                    return [3 /*break*/, 9];
                case 9:
                    set(function (state) {
                        var downloadedTracks = __assign({}, state.downloadedTracks);
                        delete downloadedTracks[trackId];
                        return { downloadedTracks: downloadedTracks, totalStorageUsed: state.totalStorageUsed - downloadedTrack.size };
                    });
                    get().saveToStorage();
                    return [2 /*return*/];
            }
        });
    }); },
    getDownloadedTrack: function (trackId) { return get().downloadedTracks[trackId]; },
    markAlbumDownloaded: function (album, tracks, metadata, coverArtUri) {
        var totalSize = tracks.reduce(function (sum, t) { return sum + t.size; }, 0);
        set(function (state) {
            var _a;
            var downloadedTracks = __assign({}, state.downloadedTracks);
            tracks.forEach(function (t) {
                downloadedTracks[t.track.id] = t;
            });
            return {
                downloadedAlbums: __assign(__assign({}, state.downloadedAlbums), (_a = {}, _a[album.id] = {
                    album: album,
                    tracks: tracks,
                    metadata: metadata,
                    coverArtUri: coverArtUri,
                    downloadedAt: Date.now(),
                    totalSize: totalSize,
                }, _a)),
                downloadedTracks: downloadedTracks,
                totalStorageUsed: state.totalStorageUsed + totalSize,
            };
        });
        get().saveToStorage();
    },
    removeAlbumDownload: function (albumId) { return __awaiter(void 0, void 0, void 0, function () {
        var downloadedAlbum, FileSystem_2, _i, _a, track, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    downloadedAlbum = get().downloadedAlbums[albumId];
                    if (!downloadedAlbum)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('expo-file-system'); })];
                case 2:
                    FileSystem_2 = _b.sent();
                    _i = 0, _a = downloadedAlbum.tracks;
                    _b.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 9];
                    track = _a[_i];
                    return [4 /*yield*/, FileSystem_2.deleteAsync(track.localUri, { idempotent: true })];
                case 4:
                    _b.sent();
                    if (!track.coverArtUri) return [3 /*break*/, 6];
                    return [4 /*yield*/, FileSystem_2.deleteAsync(track.coverArtUri, { idempotent: true })];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    if (!track.lyricsUri) return [3 /*break*/, 8];
                    return [4 /*yield*/, FileSystem_2.deleteAsync(track.lyricsUri, { idempotent: true })];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9:
                    if (!downloadedAlbum.coverArtUri) return [3 /*break*/, 11];
                    return [4 /*yield*/, FileSystem_2.deleteAsync(downloadedAlbum.coverArtUri, { idempotent: true })];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    error_2 = _b.sent();
                    console.error('Failed to delete album files:', error_2);
                    return [3 /*break*/, 13];
                case 13:
                    set(function (state) {
                        var downloadedAlbums = __assign({}, state.downloadedAlbums);
                        delete downloadedAlbums[albumId];
                        var downloadedTracks = __assign({}, state.downloadedTracks);
                        downloadedAlbum.tracks.forEach(function (t) { return delete downloadedTracks[t.track.id]; });
                        return { downloadedAlbums: downloadedAlbums, downloadedTracks: downloadedTracks, totalStorageUsed: state.totalStorageUsed - downloadedAlbum.totalSize };
                    });
                    get().saveToStorage();
                    return [2 /*return*/];
            }
        });
    }); },
    getDownloadedAlbum: function (albumId) { return get().downloadedAlbums[albumId]; },
    markPlaylistDownloaded: function (playlist, tracks, metadata, coverArtUri) {
        var totalSize = tracks.reduce(function (sum, t) { return sum + t.size; }, 0);
        set(function (state) {
            var _a;
            var downloadedTracks = __assign({}, state.downloadedTracks);
            tracks.forEach(function (t) {
                downloadedTracks[t.track.id] = t;
            });
            return {
                downloadedPlaylists: __assign(__assign({}, state.downloadedPlaylists), (_a = {}, _a[playlist.id] = {
                    playlist: playlist,
                    tracks: tracks,
                    metadata: metadata,
                    coverArtUri: coverArtUri,
                    downloadedAt: Date.now(),
                    totalSize: totalSize,
                }, _a)),
                downloadedTracks: downloadedTracks,
                totalStorageUsed: state.totalStorageUsed + totalSize,
            };
        });
        get().saveToStorage();
    },
    removePlaylistDownload: function (playlistId) { return __awaiter(void 0, void 0, void 0, function () {
        var downloadedPlaylist, FileSystem_3, _i, _a, track, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    downloadedPlaylist = get().downloadedPlaylists[playlistId];
                    if (!downloadedPlaylist)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('expo-file-system'); })];
                case 2:
                    FileSystem_3 = _b.sent();
                    _i = 0, _a = downloadedPlaylist.tracks;
                    _b.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 9];
                    track = _a[_i];
                    return [4 /*yield*/, FileSystem_3.deleteAsync(track.localUri, { idempotent: true })];
                case 4:
                    _b.sent();
                    if (!track.coverArtUri) return [3 /*break*/, 6];
                    return [4 /*yield*/, FileSystem_3.deleteAsync(track.coverArtUri, { idempotent: true })];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    if (!track.lyricsUri) return [3 /*break*/, 8];
                    return [4 /*yield*/, FileSystem_3.deleteAsync(track.lyricsUri, { idempotent: true })];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9:
                    if (!downloadedPlaylist.coverArtUri) return [3 /*break*/, 11];
                    return [4 /*yield*/, FileSystem_3.deleteAsync(downloadedPlaylist.coverArtUri, { idempotent: true })];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    error_3 = _b.sent();
                    console.error('Failed to delete playlist files:', error_3);
                    return [3 /*break*/, 13];
                case 13:
                    set(function (state) {
                        var downloadedPlaylists = __assign({}, state.downloadedPlaylists);
                        delete downloadedPlaylists[playlistId];
                        return { downloadedPlaylists: downloadedPlaylists, totalStorageUsed: state.totalStorageUsed - downloadedPlaylist.totalSize };
                    });
                    get().saveToStorage();
                    return [2 /*return*/];
            }
        });
    }); },
    getDownloadedPlaylist: function (playlistId) { return get().downloadedPlaylists[playlistId]; },
    getAllTracks: function () { return Object.values(get().downloadedTracks); },
    getAllAlbums: function () { return Object.values(get().downloadedAlbums); },
    getAllPlaylists: function () { return Object.values(get().downloadedPlaylists); },
    clearCompletedDownloads: function () {
        set(function (state) {
            var activeDownloads = __assign({}, state.activeDownloads);
            Object.keys(activeDownloads).forEach(function (id) {
                var download = activeDownloads[id];
                if (download.status === 'completed' || download.status === 'failed' || download.status === 'cancelled') {
                    delete activeDownloads[id];
                }
            });
            return { activeDownloads: activeDownloads };
        });
    },
    loadFromStorage: function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, tracksData, albumsData, playlistsData, tracks, albums, playlists, totalStorageUsed_1, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.all([
                            async_storage_1.default.getItem(constants_1.STORAGE_KEYS.DOWNLOADED_TRACKS),
                            async_storage_1.default.getItem(constants_1.STORAGE_KEYS.DOWNLOADED_ALBUMS),
                            async_storage_1.default.getItem(constants_1.STORAGE_KEYS.DOWNLOADED_PLAYLISTS),
                        ])];
                case 1:
                    _a = _b.sent(), tracksData = _a[0], albumsData = _a[1], playlistsData = _a[2];
                    tracks = tracksData ? JSON.parse(tracksData) : {};
                    albums = albumsData ? JSON.parse(albumsData) : {};
                    playlists = playlistsData ? JSON.parse(playlistsData) : {};
                    totalStorageUsed_1 = 0;
                    Object.values(tracks).forEach(function (t) { return totalStorageUsed_1 += t.size || 0; });
                    Object.values(albums).forEach(function (a) { return totalStorageUsed_1 += a.totalSize || 0; });
                    Object.values(playlists).forEach(function (p) { return totalStorageUsed_1 += p.totalSize || 0; });
                    set({ downloadedTracks: tracks, downloadedAlbums: albums, downloadedPlaylists: playlists, totalStorageUsed: totalStorageUsed_1 });
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _b.sent();
                    console.error('Failed to load downloads from storage:', error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    saveToStorage: function () {
        var state = get();
        Promise.all([
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(state.downloadedTracks)),
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.DOWNLOADED_ALBUMS, JSON.stringify(state.downloadedAlbums)),
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.DOWNLOADED_PLAYLISTS, JSON.stringify(state.downloadedPlaylists)),
        ]).catch(function (error) { return console.error('Failed to save downloads to storage:', error); });
    },
}); });
