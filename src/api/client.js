"use strict";
/**
 * Dino Music App - API Client
 * Axios instance with interceptors for OpenSubsonic API
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
exports.apiClient = void 0;
var axios_1 = require("axios");
var Crypto = require("expo-crypto");
var constants_1 = require("../config/constants");
var APIClient = /** @class */ (function () {
    function APIClient() {
        this.credentials = null;
        this.axiosInstance = axios_1.default.create({
            timeout: constants_1.NETWORK_CONFIG.TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.setupInterceptors();
    }
    /**
     * Set credentials for API requests
     */
    APIClient.prototype.setCredentials = function (credentials) {
        console.log('[API Client] setCredentials called with:', {
            hasApiKey: !!credentials.apiKey,
            hasUsername: !!credentials.username,
            serverUrl: credentials.serverUrl,
        });
        this.credentials = credentials;
        this.axiosInstance.defaults.baseURL = "".concat(credentials.serverUrl, "/rest");
        console.log('[API Client] baseURL set to:', this.axiosInstance.defaults.baseURL);
    };
    /**
     * Clear credentials
     */
    APIClient.prototype.clearCredentials = function () {
        this.credentials = null;
        this.axiosInstance.defaults.baseURL = undefined;
    };
    /**
     * Check if client has credentials
     */
    APIClient.prototype.hasCredentials = function () {
        return this.credentials !== null;
    };
    /**
     * Generate authentication parameters (use stored token + salt or API key)
     */
    APIClient.prototype.generateAuthParams = function () {
        if (!this.credentials) {
            throw new Error('No credentials set');
        }
        var baseParams = {
            v: constants_1.API_VERSION,
            c: constants_1.CLIENT_NAME,
            f: constants_1.API_FORMAT,
        };
        // Use API key if available
        if (this.credentials.apiKey) {
            return __assign(__assign({}, baseParams), { apiKey: this.credentials.apiKey });
        }
        // Otherwise use token-based auth
        if (!this.credentials.username || !this.credentials.token || !this.credentials.salt) {
            throw new Error('Invalid credentials: missing username, token, or salt');
        }
        return __assign(__assign({}, baseParams), { u: this.credentials.username, s: this.credentials.salt, t: this.credentials.token });
    };
    /**
     * Setup request/response interceptors
     */
    APIClient.prototype.setupInterceptors = function () {
        var _this = this;
        // Request interceptor - add auth params (for GET requests only)
        // POST requests handle auth params in the request body
        this.axiosInstance.interceptors.request.use(function (config) {
            var _a;
            if (_this.credentials && ((_a = config.method) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'get') {
                var authParams = _this.generateAuthParams();
                config.params = __assign(__assign({}, config.params), authParams);
            }
            return config;
        }, function (error) {
            return Promise.reject(error);
        });
        // Response interceptor - handle Subsonic errors
        this.axiosInstance.interceptors.response.use(function (response) {
            var data = response.data;
            // Check for Subsonic error
            if (data['subsonic-response'].status === 'failed') {
                var error = data['subsonic-response'].error;
                throw new Error((error === null || error === void 0 ? void 0 : error.message) || 'Unknown API error');
            }
            return response;
        }, function (error) {
            var _a, _b, _c, _d;
            // Log full error for debugging
            console.error('API Client Error:', {
                message: error.message,
                code: error.code,
                status: (_a = error.response) === null || _a === void 0 ? void 0 : _a.status,
                url: (_b = error.config) === null || _b === void 0 ? void 0 : _b.url,
                baseURL: (_c = error.config) === null || _c === void 0 ? void 0 : _c.baseURL,
            });
            // Handle network errors
            if (error.code === 'ECONNABORTED') {
                return Promise.reject(new Error('Request timed out - check server URL and network'));
            }
            if (!error.response) {
                // Network error - provide more details
                var errorMessage = "Network error: ".concat(error.message, ". Check if server is reachable at ").concat(((_d = error.config) === null || _d === void 0 ? void 0 : _d.baseURL) || 'unknown URL');
                console.error('Network Error Details:', errorMessage);
                return Promise.reject(new Error(errorMessage));
            }
            // Handle HTTP errors
            if (error.response.status === 401) {
                return Promise.reject(new Error('Authentication failed - check username/password'));
            }
            if (error.response.status === 404) {
                return Promise.reject(new Error('Not found - check server URL'));
            }
            if (error.response.status >= 500) {
                return Promise.reject(new Error("Server error (".concat(error.response.status, ")")));
            }
            return Promise.reject(error);
        });
    };
    /**
     * Request (auto-selects GET or POST based on server capabilities)
     * Defaults to POST when server supports it (unless forceGet is true)
     *
     * @param endpoint - API endpoint name (without .view)
     * @param params - Request parameters
     * @param options.forceGet - Force GET even if server supports POST (for media URLs)
     * @param options.config - Additional axios config
     */
    APIClient.prototype.request = function (endpoint, params, options) {
        return __awaiter(this, void 0, void 0, function () {
            var serverSupportsPost, clientForcesGet, usePostRequests, userWantsPost, usePost;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        serverSupportsPost = this.supportsFormPost();
                        clientForcesGet = (options === null || options === void 0 ? void 0 : options.forceGet) === true;
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('../stores/settingsStore'); }).then(function (m) { return m.useSettingsStore.getState(); })];
                    case 1:
                        usePostRequests = (_a.sent()).usePostRequests;
                        userWantsPost = usePostRequests !== false;
                        usePost = serverSupportsPost && !clientForcesGet && userWantsPost;
                        console.log('[API Client] 🔍 Request decision for:', endpoint, {
                            serverSupportsFormPost: serverSupportsPost,
                            userWantsPost: userWantsPost,
                            forceGet: clientForcesGet,
                            willUsePost: usePost,
                        });
                        if (usePost) {
                            console.log('[API Client] 📤 Using POST for:', endpoint);
                            return [2 /*return*/, this.post(endpoint, params, options === null || options === void 0 ? void 0 : options.config)];
                        }
                        else {
                            console.log('[API Client] 📥 Using GET for:', endpoint, !serverSupportsPost ? '(server does not support POST)' :
                                !userWantsPost ? '(user disabled POST)' : '(forceGet requested)');
                            return [2 /*return*/, this.get(endpoint, params, options === null || options === void 0 ? void 0 : options.config)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if server supports formPost extension
     */
    APIClient.prototype.supportsFormPost = function () {
        // This will be set by the stores when capabilities are loaded
        // For now, return false - will be implemented via a setter method
        return this._supportsFormPost || false;
    };
    /**
     * Set server capabilities (called by serverStore after fetching extensions)
     */
    APIClient.prototype.setServerCapabilities = function (capabilities) {
        this._supportsFormPost = capabilities.supportsFormPost;
        console.log('[API Client] Server capabilities updated:', capabilities);
    };
    /**
     * GET request
     * Note: Most endpoints should use request() which auto-selects POST when available
     */
    APIClient.prototype.get = function (endpoint, params, config) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[API Client] 📥 GET request to:', endpoint, 'hasCredentials:', this.hasCredentials());
                        return [4 /*yield*/, this.axiosInstance.get("".concat(endpoint, ".view"), __assign(__assign({}, config), { params: params, paramsSerializer: function (params) {
                                    // Custom serializer to handle arrays properly for OpenSubsonic
                                    // Arrays should be sent as repeated parameters, not with [] notation
                                    var parts = [];
                                    Object.keys(params).forEach(function (key) {
                                        var value = params[key];
                                        if (Array.isArray(value)) {
                                            // For arrays, repeat the parameter name for each value
                                            value.forEach(function (v) {
                                                parts.push("".concat(encodeURIComponent(key), "=").concat(encodeURIComponent(v)));
                                            });
                                        }
                                        else if (value !== undefined && value !== null) {
                                            parts.push("".concat(encodeURIComponent(key), "=").concat(encodeURIComponent(value)));
                                        }
                                    });
                                    return parts.join('&');
                                } }))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data['subsonic-response']];
                }
            });
        });
    };
    /**
     * POST request (application/x-www-form-urlencoded)
     */
    APIClient.prototype.post = function (endpoint, params, config) {
        return __awaiter(this, void 0, void 0, function () {
            var authParams, allParams, formData, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('[API Client] POST request to:', endpoint, 'hasCredentials:', this.hasCredentials());
                        authParams = this.generateAuthParams();
                        allParams = __assign(__assign({}, params), authParams);
                        formData = new URLSearchParams();
                        Object.keys(allParams).forEach(function (key) {
                            var value = allParams[key];
                            if (Array.isArray(value)) {
                                // For arrays, repeat the parameter name for each value
                                value.forEach(function (v) {
                                    formData.append(key, String(v));
                                });
                            }
                            else if (value !== undefined && value !== null) {
                                formData.append(key, String(value));
                            }
                        });
                        return [4 /*yield*/, this.axiosInstance.post("".concat(endpoint, ".view"), formData.toString(), __assign(__assign({}, config), { headers: __assign(__assign({}, config === null || config === void 0 ? void 0 : config.headers), { 'Content-Type': 'application/x-www-form-urlencoded' }) }))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data['subsonic-response']];
                }
            });
        });
    };
    /**
     * Build stream URL with auth params
     */
    APIClient.prototype.buildStreamUrl = function (trackId, maxBitRate, format) {
        return __awaiter(this, void 0, void 0, function () {
            var authParams, params, url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.credentials) {
                            throw new Error('No credentials set');
                        }
                        console.log('[API Client] buildStreamUrl called with:', {
                            trackId: trackId,
                            maxBitRate: maxBitRate,
                            format: format,
                            willAddMaxBitRate: !!(maxBitRate && maxBitRate !== '0'),
                            willAddFormat: !!format,
                        });
                        return [4 /*yield*/, this.generateAuthParams()];
                    case 1:
                        authParams = _a.sent();
                        params = new URLSearchParams(__assign(__assign(__assign({ id: trackId }, authParams), (maxBitRate && maxBitRate !== '0' && { maxBitRate: maxBitRate })), (format && { format: format })));
                        url = "".concat(this.credentials.serverUrl, "/rest/stream.view?").concat(params.toString());
                        console.log('[API Client] Built stream URL:', url);
                        return [2 /*return*/, url];
                }
            });
        });
    };
    /**
     * Build download URL with auth params (original file, no transcoding)
     */
    APIClient.prototype.buildDownloadUrl = function (trackId) {
        return __awaiter(this, void 0, void 0, function () {
            var authParams, params;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.credentials) {
                            throw new Error('No credentials set');
                        }
                        return [4 /*yield*/, this.generateAuthParams()];
                    case 1:
                        authParams = _a.sent();
                        params = new URLSearchParams(__assign({ id: trackId }, authParams));
                        return [2 /*return*/, "".concat(this.credentials.serverUrl, "/rest/download.view?").concat(params.toString())];
                }
            });
        });
    };
    /**
     * Build cover art URL with auth params
     */
    APIClient.prototype.buildCoverArtUrl = function (coverArtId, size) {
        return __awaiter(this, void 0, void 0, function () {
            var authParams, params;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.credentials) {
                            throw new Error('No credentials set');
                        }
                        return [4 /*yield*/, this.generateAuthParams()];
                    case 1:
                        authParams = _a.sent();
                        params = new URLSearchParams(__assign(__assign({ id: coverArtId }, authParams), (size && { size: size.toString() })));
                        return [2 /*return*/, "".concat(this.credentials.serverUrl, "/rest/getCoverArt.view?").concat(params.toString())];
                }
            });
        });
    };
    /**
     * Build avatar URL with auth params
     */
    APIClient.prototype.buildAvatarUrl = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var authParams, params, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.credentials) {
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.generateAuthParams()];
                    case 2:
                        authParams = _a.sent();
                        params = new URLSearchParams(__assign(__assign({}, (username && { username: username })), authParams));
                        return [2 /*return*/, "".concat(this.credentials.serverUrl, "/rest/getAvatar.view?").concat(params.toString())];
                    case 3:
                        error_1 = _a.sent();
                        console.log('[API Client] Failed to build avatar URL:', error_1);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ping server to check if it's reachable and validate credentials
     * Supports password, token, and API key authentication
     */
    APIClient.prototype.ping = function (serverUrl, username, tokenOrPassword, salt, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var params, user, authToken, authSalt, pass, response, data, status_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        params = void 0;
                        if (!apiKey) return [3 /*break*/, 1];
                        // API key authentication
                        params = {
                            v: constants_1.API_VERSION,
                            c: constants_1.CLIENT_NAME,
                            f: constants_1.API_FORMAT,
                            apiKey: apiKey,
                        };
                        return [3 /*break*/, 5];
                    case 1:
                        user = username || 'guest';
                        authToken = void 0;
                        authSalt = void 0;
                        if (!salt) return [3 /*break*/, 2];
                        // Token auth - use provided token and salt
                        authToken = tokenOrPassword || 'guest';
                        authSalt = salt;
                        return [3 /*break*/, 4];
                    case 2:
                        pass = tokenOrPassword || 'guest';
                        authSalt = Math.random().toString(36).substring(2, 15);
                        return [4 /*yield*/, Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, pass + authSalt)];
                    case 3:
                        authToken = _a.sent();
                        _a.label = 4;
                    case 4:
                        params = {
                            v: constants_1.API_VERSION,
                            c: constants_1.CLIENT_NAME,
                            f: constants_1.API_FORMAT,
                            u: user,
                            s: authSalt,
                            t: authToken,
                        };
                        _a.label = 5;
                    case 5: return [4 /*yield*/, axios_1.default.get("".concat(serverUrl, "/rest/ping.view"), {
                            params: params,
                            timeout: constants_1.NETWORK_CONFIG.TIMEOUT,
                        })];
                    case 6:
                        response = _a.sent();
                        data = response.data;
                        // Check if the response is valid Subsonic format
                        if (!data['subsonic-response']) {
                            console.log('[API] Ping failed: Invalid response format');
                            return [2 /*return*/, false];
                        }
                        status_1 = data['subsonic-response'].status;
                        console.log('[API] Ping result:', status_1);
                        // If credentials were provided, check auth status
                        if (apiKey || (username && tokenOrPassword)) {
                            // Authentication was attempted - must be 'ok' to succeed
                            if (status_1 === 'ok') {
                                console.log('[API] Ping successful with valid credentials');
                                return [2 /*return*/, true];
                            }
                            else {
                                console.log('[API] Ping failed: Invalid credentials');
                                return [2 /*return*/, false];
                            }
                        }
                        else {
                            // No credentials provided - just checking server reachability
                            // Any valid Subsonic response means server is reachable
                            console.log('[API] Ping successful: Server is reachable');
                            return [2 /*return*/, true];
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        // Network error - server is not reachable
                        console.error('[API] Ping error:', error_2);
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return APIClient;
}());
// Export singleton instance
exports.apiClient = new APIClient();
exports.default = exports.apiClient;
