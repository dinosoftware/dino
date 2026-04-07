"use strict";
/**
 * Dino Music App - Albums API Hooks
 * React Query hooks for album data
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
exports.useCoverArt = exports.useAlbum = exports.useAlbums = void 0;
var react_query_1 = require("@tanstack/react-query");
var albums_1 = require("../../api/opensubsonic/albums");
var streaming_1 = require("../../api/opensubsonic/streaming");
var serverStore_1 = require("../../stores/serverStore");
var downloadStore_1 = require("../../stores/downloadStore");
var useAlbums = function (type, size) {
    if (type === void 0) { type = 'newest'; }
    if (size === void 0) { size = 20; }
    var currentServerId = (0, serverStore_1.useServerStore)().currentServerId;
    return (0, react_query_1.useQuery)({
        queryKey: ['albums', type, size, currentServerId],
        queryFn: function () { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, albums_1.getAlbumList2)(type, size)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.albumList2.album || []];
                }
            });
        }); },
        enabled: !!currentServerId,
    });
};
exports.useAlbums = useAlbums;
var useAlbum = function (albumId) {
    var getDownloadedAlbum = (0, downloadStore_1.useDownloadStore)().getDownloadedAlbum;
    return (0, react_query_1.useQuery)({
        queryKey: ['album', albumId],
        queryFn: function () { return __awaiter(void 0, void 0, void 0, function () {
            var downloadedAlbum, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        downloadedAlbum = getDownloadedAlbum(albumId);
                        if (downloadedAlbum && downloadedAlbum.metadata) {
                            console.log('[useAlbum] Using cached metadata for album:', albumId);
                            // Return the cached album metadata
                            return [2 /*return*/, downloadedAlbum.metadata.album];
                        }
                        // Otherwise fetch from server
                        console.log('[useAlbum] Fetching from server for album:', albumId);
                        return [4 /*yield*/, (0, albums_1.getAlbum)(albumId)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.album];
                }
            });
        }); },
        enabled: !!albumId,
    });
};
exports.useAlbum = useAlbum;
var useCoverArt = function (coverArtId, size) {
    if (size === void 0) { size = 300; }
    var _a = (0, downloadStore_1.useDownloadStore)(), downloadedAlbums = _a.downloadedAlbums, downloadedPlaylists = _a.downloadedPlaylists, downloadedTracks = _a.downloadedTracks;
    return (0, react_query_1.useQuery)({
        queryKey: ['coverArt', coverArtId, size],
        queryFn: function () { return __awaiter(void 0, void 0, void 0, function () {
            var album, playlist, track;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!coverArtId)
                            return [2 /*return*/, null];
                        album = Object.values(downloadedAlbums).find(function (a) { return a.album.coverArt === coverArtId; });
                        if (album && album.coverArtUri) {
                            console.log('[useCoverArt] Using cached cover art for album');
                            return [2 /*return*/, album.coverArtUri];
                        }
                        playlist = Object.values(downloadedPlaylists).find(function (p) { return p.playlist.coverArt === coverArtId; });
                        if (playlist && playlist.coverArtUri) {
                            console.log('[useCoverArt] Using cached cover art for playlist');
                            return [2 /*return*/, playlist.coverArtUri];
                        }
                        track = Object.values(downloadedTracks).find(function (t) { return t.track.coverArt === coverArtId; });
                        if (track && track.coverArtUri) {
                            console.log('[useCoverArt] Using cached cover art for track');
                            return [2 /*return*/, track.coverArtUri];
                        }
                        return [4 /*yield*/, (0, streaming_1.getCoverArtUrl)(coverArtId, size)];
                    case 1: 
                    // Otherwise fetch from server
                    return [2 /*return*/, _a.sent()];
                }
            });
        }); },
        enabled: !!coverArtId,
        staleTime: Infinity, // Cover art URLs don't change
    });
};
exports.useCoverArt = useCoverArt;
