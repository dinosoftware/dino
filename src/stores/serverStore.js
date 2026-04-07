"use strict";
/**
 * Dino Music App - Server Store
 * Multi-server management with Zustand
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
exports.useServerStore = void 0;
var zustand_1 = require("zustand");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var constants_1 = require("../config/constants");
var client_1 = require("../api/client");
exports.useServerStore = (0, zustand_1.create)(function (set, get) { return ({
    servers: [],
    currentServerId: null,
    hasCompletedSetup: false,
    addServer: function (name, url, autoSwitch) {
        if (autoSwitch === void 0) { autoSwitch = false; }
        var newServer = {
            id: "server_".concat(Date.now()),
            name: name,
            url: url.replace(/\/$/, ''), // Remove trailing slash
            createdAt: Date.now(),
        };
        set(function (state) {
            var servers = __spreadArray(__spreadArray([], state.servers, true), [newServer], false);
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.SERVERS, JSON.stringify(servers));
            // Update currentServerId in the same state update to avoid race condition
            var currentServerId = autoSwitch ? newServer.id : state.currentServerId;
            if (autoSwitch) {
                async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CURRENT_SERVER_ID, newServer.id);
            }
            return { servers: servers, currentServerId: currentServerId };
        });
        return newServer;
    },
    removeServer: function (id) {
        set(function (state) {
            var servers = state.servers.filter(function (s) { return s.id !== id; });
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.SERVERS, JSON.stringify(servers));
            // If removing current server, switch to first available
            var currentServerId = state.currentServerId;
            if (currentServerId === id) {
                currentServerId = servers.length > 0 ? servers[0].id : null;
                if (currentServerId) {
                    async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CURRENT_SERVER_ID, currentServerId);
                }
                else {
                    async_storage_1.default.removeItem(constants_1.STORAGE_KEYS.CURRENT_SERVER_ID);
                }
            }
            return { servers: servers, currentServerId: currentServerId };
        });
    },
    updateServer: function (id, name, url) {
        set(function (state) {
            var servers = state.servers.map(function (s) {
                return s.id === id
                    ? __assign(__assign({}, s), { name: name, url: url.replace(/\/$/, '') }) : s;
            });
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.SERVERS, JSON.stringify(servers));
            return { servers: servers };
        });
    },
    updateServerCapabilities: function (id, capabilities) {
        console.log('[ServerStore] Updating capabilities for server:', id);
        console.log('[ServerStore] New capabilities:', JSON.stringify(capabilities, null, 2));
        set(function (state) {
            var servers = state.servers.map(function (s) {
                return s.id === id
                    ? __assign(__assign({}, s), { capabilities: capabilities }) : s;
            });
            async_storage_1.default.setItem(constants_1.STORAGE_KEYS.SERVERS, JSON.stringify(servers));
            console.log('[ServerStore] Server list after update:', servers.map(function (s) {
                var _a, _b;
                return ({
                    id: s.id,
                    name: s.name,
                    hasCapabilities: !!s.capabilities,
                    extensionsCount: ((_b = (_a = s.capabilities) === null || _a === void 0 ? void 0 : _a.extensions) === null || _b === void 0 ? void 0 : _b.length) || 0
                });
            }));
            // If this is the current server, update API client capabilities
            if (id === state.currentServerId) {
                console.log('[ServerStore] Updating API client with server capabilities');
                client_1.apiClient.setServerCapabilities({
                    supportsFormPost: capabilities.supportsFormPost,
                });
            }
            return { servers: servers };
        });
    },
    setCurrentServer: function (id) {
        set({ currentServerId: id });
        async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CURRENT_SERVER_ID, id);
    },
    getCurrentServer: function () {
        var state = get();
        return state.servers.find(function (s) { return s.id === state.currentServerId; }) || null;
    },
    getCurrentServerCapabilities: function () {
        var currentServer = get().getCurrentServer();
        return (currentServer === null || currentServer === void 0 ? void 0 : currentServer.capabilities) || null;
    },
    completeFirstTimeSetup: function () {
        set({ hasCompletedSetup: true });
        async_storage_1.default.setItem(constants_1.STORAGE_KEYS.HAS_COMPLETED_SETUP, 'true');
    },
    loadFromStorage: function () { return __awaiter(void 0, void 0, void 0, function () {
        var serversJson, servers, currentServerId, hasCompletedSetupStr, hasCompletedSetup, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, async_storage_1.default.getItem(constants_1.STORAGE_KEYS.SERVERS)];
                case 1:
                    serversJson = _a.sent();
                    servers = serversJson ? JSON.parse(serversJson) : [];
                    return [4 /*yield*/, async_storage_1.default.getItem(constants_1.STORAGE_KEYS.CURRENT_SERVER_ID)];
                case 2:
                    currentServerId = (_a.sent()) || null;
                    return [4 /*yield*/, async_storage_1.default.getItem(constants_1.STORAGE_KEYS.HAS_COMPLETED_SETUP)];
                case 3:
                    hasCompletedSetupStr = _a.sent();
                    hasCompletedSetup = hasCompletedSetupStr === 'true';
                    console.log('[ServerStore] Loaded from AsyncStorage:', {
                        serversCount: servers.length,
                        currentServerId: currentServerId,
                        hasCompletedSetup: hasCompletedSetup
                    });
                    set({ servers: servers, currentServerId: currentServerId, hasCompletedSetup: hasCompletedSetup });
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('Failed to load server data from storage:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
}); });
