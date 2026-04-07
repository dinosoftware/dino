"use strict";
/**
 * Dino Music App - Auth Store
 * Authentication state management with Zustand
 * Uses Subsonic token authentication (MD5 hash) for security
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
exports.useAuthStore = void 0;
var zustand_1 = require("zustand");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var Crypto = require("expo-crypto");
var constants_1 = require("../config/constants");
var client_1 = require("../api/client");
var serverStore_1 = require("./serverStore");
var userStore_1 = require("./userStore");
var extensions_1 = require("../api/opensubsonic/extensions");
exports.useAuthStore = (0, zustand_1.create)(function (set, get) { return ({
    credentials: {},
    isAuthenticated: false,
    login: function (serverId, username, password) { return __awaiter(void 0, void 0, void 0, function () {
        var server, salt, token, success, credentials;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    server = serverStore_1.useServerStore.getState().servers.find(function (s) { return s.id === serverId; });
                    if (!server) {
                        throw new Error('Server not found');
                    }
                    salt = Math.random().toString(36).substring(2, 15);
                    return [4 /*yield*/, Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, password + salt)];
                case 1:
                    token = _b.sent();
                    return [4 /*yield*/, client_1.apiClient.ping(server.url, username, token, salt)];
                case 2:
                    success = _b.sent();
                    if (!success) {
                        throw new Error('Authentication failed');
                    }
                    credentials = __assign(__assign({}, get().credentials), (_a = {}, _a[serverId] = { username: username, token: token, salt: salt }, _a));
                    return [4 /*yield*/, async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials))];
                case 3:
                    _b.sent();
                    // Set API client credentials
                    client_1.apiClient.setCredentials({
                        username: username,
                        token: token,
                        salt: salt,
                        serverUrl: server.url,
                    });
                    set({ credentials: credentials, isAuthenticated: true });
                    console.log('[AuthStore.login] ✅ Login successful, credentials set, isAuthenticated=true');
                    // Fetch user info in background
                    userStore_1.useUserStore.getState().fetchUser().catch(function (err) {
                        console.log('[AuthStore.login] Failed to fetch user info:', err);
                    });
                    // Fetch server capabilities in background
                    console.log('[AuthStore.login] 🔍 Starting to fetch server capabilities for serverId:', serverId);
                    console.log('[AuthStore.login] 🔍 Current API client has credentials?', client_1.apiClient.hasCredentials());
                    // Use a self-executing async function to ensure proper error handling
                    (function () { return __awaiter(void 0, void 0, void 0, function () {
                        var extensions, capabilities, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    console.log('[AuthStore.login] 🔍 Calling getOpenSubsonicExtensions()...');
                                    return [4 /*yield*/, (0, extensions_1.getOpenSubsonicExtensions)()];
                                case 1:
                                    extensions = _a.sent();
                                    console.log('[AuthStore.login] ✅ Received extensions:', extensions);
                                    console.log('[AuthStore.login] 🔍 Extensions is array?', Array.isArray(extensions));
                                    console.log('[AuthStore.login] 🔍 Extensions length:', extensions === null || extensions === void 0 ? void 0 : extensions.length);
                                    capabilities = {
                                        extensions: extensions,
                                        supportsFormPost: (0, extensions_1.supportsFormPost)(extensions),
                                        supportsApiKeyAuth: (0, extensions_1.supportsApiKeyAuth)(extensions),
                                        supportsSongLyrics: (0, extensions_1.supportsSongLyrics)(extensions),
                                        lastChecked: Date.now(),
                                    };
                                    console.log('[AuthStore.login] 🔍 Computed capabilities:', capabilities);
                                    serverStore_1.useServerStore.getState().updateServerCapabilities(serverId, capabilities);
                                    console.log('[AuthStore.login] ✅ Server capabilities updated successfully');
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_1 = _a.sent();
                                    console.error('[AuthStore.login] ❌ Failed to fetch server capabilities:', error_1);
                                    console.error('[AuthStore.login] ❌ Error details:', error_1 instanceof Error ? error_1.message : String(error_1));
                                    console.error('[AuthStore.login] ❌ Error stack:', error_1 instanceof Error ? error_1.stack : 'no stack');
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })();
                    return [2 /*return*/];
            }
        });
    }); },
    loginWithToken: function (serverId, username, token, salt) { return __awaiter(void 0, void 0, void 0, function () {
        var server, success, credentials;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    server = serverStore_1.useServerStore.getState().servers.find(function (s) { return s.id === serverId; });
                    if (!server) {
                        throw new Error('Server not found');
                    }
                    return [4 /*yield*/, client_1.apiClient.ping(server.url, username, token, salt)];
                case 1:
                    success = _b.sent();
                    if (!success) {
                        throw new Error('Authentication failed');
                    }
                    credentials = __assign(__assign({}, get().credentials), (_a = {}, _a[serverId] = { username: username, token: token, salt: salt }, _a));
                    return [4 /*yield*/, async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials))];
                case 2:
                    _b.sent();
                    // Set API client credentials
                    client_1.apiClient.setCredentials({
                        username: username,
                        token: token,
                        salt: salt,
                        serverUrl: server.url,
                    });
                    set({ credentials: credentials, isAuthenticated: true });
                    console.log('[AuthStore.loginWithToken] ✅ Login successful');
                    // Fetch user info in background
                    userStore_1.useUserStore.getState().fetchUser().catch(function (err) {
                        console.log('[AuthStore.loginWithToken] Failed to fetch user info:', err);
                    });
                    // Fetch server capabilities in background
                    (function () { return __awaiter(void 0, void 0, void 0, function () {
                        var extensions, capabilities, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    console.log('[AuthStore.loginWithToken] 🔍 Fetching server capabilities...');
                                    return [4 /*yield*/, (0, extensions_1.getOpenSubsonicExtensions)()];
                                case 1:
                                    extensions = _a.sent();
                                    console.log('[AuthStore.loginWithToken] ✅ Received extensions:', extensions);
                                    capabilities = {
                                        extensions: extensions,
                                        supportsFormPost: (0, extensions_1.supportsFormPost)(extensions),
                                        supportsApiKeyAuth: (0, extensions_1.supportsApiKeyAuth)(extensions),
                                        supportsSongLyrics: (0, extensions_1.supportsSongLyrics)(extensions),
                                        lastChecked: Date.now(),
                                    };
                                    serverStore_1.useServerStore.getState().updateServerCapabilities(serverId, capabilities);
                                    console.log('[AuthStore.loginWithToken] ✅ Server capabilities updated');
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_2 = _a.sent();
                                    console.error('[AuthStore.loginWithToken] ❌ Failed to fetch server capabilities:', error_2);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })();
                    return [2 /*return*/];
            }
        });
    }); },
    loginWithApiKey: function (serverId, apiKey) { return __awaiter(void 0, void 0, void 0, function () {
        var server, success, credentials;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    server = serverStore_1.useServerStore.getState().servers.find(function (s) { return s.id === serverId; });
                    if (!server) {
                        throw new Error('Server not found');
                    }
                    return [4 /*yield*/, client_1.apiClient.ping(server.url, undefined, undefined, undefined, apiKey)];
                case 1:
                    success = _b.sent();
                    if (!success) {
                        throw new Error('Authentication failed');
                    }
                    credentials = __assign(__assign({}, get().credentials), (_a = {}, _a[serverId] = { apiKey: apiKey }, _a));
                    return [4 /*yield*/, async_storage_1.default.setItem(constants_1.STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials))];
                case 2:
                    _b.sent();
                    // Set API client credentials
                    client_1.apiClient.setCredentials({
                        apiKey: apiKey,
                        serverUrl: server.url,
                    });
                    set({ credentials: credentials, isAuthenticated: true });
                    console.log('[AuthStore.loginWithApiKey] ✅ Login successful');
                    // Fetch user info in background
                    userStore_1.useUserStore.getState().fetchUser().catch(function (err) {
                        console.log('[AuthStore.loginWithApiKey] Failed to fetch user info:', err);
                    });
                    // Fetch server capabilities in background
                    (function () { return __awaiter(void 0, void 0, void 0, function () {
                        var extensions, capabilities, error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    console.log('[AuthStore.loginWithApiKey] 🔍 Fetching server capabilities...');
                                    return [4 /*yield*/, (0, extensions_1.getOpenSubsonicExtensions)()];
                                case 1:
                                    extensions = _a.sent();
                                    console.log('[AuthStore.loginWithApiKey] ✅ Received extensions:', extensions);
                                    capabilities = {
                                        extensions: extensions,
                                        supportsFormPost: (0, extensions_1.supportsFormPost)(extensions),
                                        supportsApiKeyAuth: (0, extensions_1.supportsApiKeyAuth)(extensions),
                                        supportsSongLyrics: (0, extensions_1.supportsSongLyrics)(extensions),
                                        lastChecked: Date.now(),
                                    };
                                    serverStore_1.useServerStore.getState().updateServerCapabilities(serverId, capabilities);
                                    console.log('[AuthStore.loginWithApiKey] ✅ Server capabilities updated');
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_3 = _a.sent();
                                    console.error('[AuthStore.loginWithApiKey] ❌ Failed to fetch server capabilities:', error_3);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })();
                    return [2 /*return*/];
            }
        });
    }); },
    logout: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (deleteCredentials) {
            if (deleteCredentials === void 0) { deleteCredentials = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Clear user info
                        userStore_1.useUserStore.getState().clearUser();
                        if (!deleteCredentials) return [3 /*break*/, 2];
                        // ONLY delete credentials if explicitly requested (e.g., "Forget this server")
                        return [4 /*yield*/, async_storage_1.default.removeItem(constants_1.STORAGE_KEYS.CREDENTIALS)];
                    case 1:
                        // ONLY delete credentials if explicitly requested (e.g., "Forget this server")
                        _a.sent();
                        client_1.apiClient.clearCredentials();
                        set({ credentials: {}, isAuthenticated: false });
                        return [3 /*break*/, 3];
                    case 2:
                        // Normal logout - keep credentials but clear session
                        // Just clear API client and set authenticated to false
                        client_1.apiClient.clearCredentials();
                        set({ isAuthenticated: false });
                        console.log('[AuthStore] Logged out (credentials preserved)');
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    switchServer: function (serverId) {
        var credentials = get().credentials[serverId];
        var server = serverStore_1.useServerStore.getState().servers.find(function (s) { return s.id === serverId; });
        if (!credentials || !server) {
            // No credentials for this server
            console.log('[AuthStore] No credentials for server:', serverId);
            client_1.apiClient.clearCredentials();
            set({ isAuthenticated: false });
            return false;
        }
        // Has credentials - set them in API client
        console.log('[AuthStore] Switching to server:', server.url);
        client_1.apiClient.setCredentials(__assign(__assign({}, credentials), { serverUrl: server.url }));
        // Set server capabilities if available
        if (server.capabilities) {
            console.log('[AuthStore] ⚙️  Setting API client capabilities for switched server');
            client_1.apiClient.setServerCapabilities({
                supportsFormPost: server.capabilities.supportsFormPost,
            });
        }
        else {
            console.log('[AuthStore] ⚠️  No capabilities for switched server');
        }
        set({ isAuthenticated: true });
        return true;
    },
    checkAuth: function (serverId) {
        return !!get().credentials[serverId];
    },
    getCurrentServerAuth: function () {
        var currentServerId = serverStore_1.useServerStore.getState().currentServerId;
        if (!currentServerId)
            return null;
        var credentials = get().credentials[currentServerId];
        if (!credentials)
            return null;
        var server = serverStore_1.useServerStore.getState().servers.find(function (s) { return s.id === currentServerId; });
        if (!server)
            return null;
        return __assign(__assign({}, credentials), { serverUrl: server.url });
    },
    loadFromStorage: function () { return __awaiter(void 0, void 0, void 0, function () {
        var credentialsJson, credentials, currentServerId_1, isAuthenticated, creds, server, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.getItem(constants_1.STORAGE_KEYS.CREDENTIALS)];
                case 1:
                    credentialsJson = _a.sent();
                    credentials = credentialsJson ? JSON.parse(credentialsJson) : {};
                    console.log('[AuthStore] Loaded credentials from AsyncStorage:', Object.keys(credentials));
                    currentServerId_1 = serverStore_1.useServerStore.getState().currentServerId;
                    console.log('[AuthStore] Current server ID:', currentServerId_1);
                    console.log('[AuthStore] Has credentials for this server:', currentServerId_1 ? !!credentials[currentServerId_1] : false);
                    isAuthenticated = currentServerId_1 ? !!credentials[currentServerId_1] : false;
                    // Set state - this is synchronous and immediate
                    set({ credentials: credentials, isAuthenticated: isAuthenticated });
                    console.log('[AuthStore] State set - isAuthenticated:', isAuthenticated);
                    // Set API client credentials if authenticated
                    if (isAuthenticated && currentServerId_1) {
                        creds = credentials[currentServerId_1];
                        server = serverStore_1.useServerStore.getState().servers.find(function (s) { return s.id === currentServerId_1; });
                        if (creds && server) {
                            console.log('[AuthStore] Restoring API credentials for server:', server.url);
                            client_1.apiClient.setCredentials({
                                username: creds.username,
                                token: creds.token,
                                salt: creds.salt,
                                apiKey: creds.apiKey,
                                serverUrl: server.url,
                            });
                            // Set server capabilities if available
                            if (server.capabilities) {
                                console.log('[AuthStore] ⚙️  Setting API client capabilities from storage');
                                client_1.apiClient.setServerCapabilities({
                                    supportsFormPost: server.capabilities.supportsFormPost,
                                });
                            }
                            else {
                                console.log('[AuthStore] ⚠️  No capabilities in storage');
                            }
                            // Fetch user info in background
                            userStore_1.useUserStore.getState().fetchUser().catch(function (err) {
                                console.log('[AuthStore] Failed to fetch user info on startup:', err);
                            });
                        }
                        else {
                            console.log('[AuthStore] Could not find server or credentials');
                        }
                    }
                    else {
                        console.log('[AuthStore] Not authenticated - no valid credentials');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    console.error('Failed to load auth data from storage:', error_4);
                    set({ credentials: {}, isAuthenticated: false });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); },
}); });
