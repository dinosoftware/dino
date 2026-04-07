"use strict";
/**
 * Dino Music App - OpenSubsonic Extensions API
 * Check server capabilities and extensions
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
exports.supportsSongLyrics = exports.supportsApiKeyAuth = exports.supportsFormPost = exports.hasExtension = exports.getOpenSubsonicExtensions = void 0;
var axios_1 = require("axios");
var client_1 = require("../client");
var constants_1 = require("../../config/constants");
/**
 * Get OpenSubsonic extensions supported by the server
 * Returns null if server doesn't support OpenSubsonic extensions
 *
 * NOTE: This endpoint MUST be publicly accessible (no auth required per OpenSubsonic spec)
 */
var getOpenSubsonicExtensions = function () { return __awaiter(void 0, void 0, void 0, function () {
    var baseURL, url, params, response, subsonicResponse, extensions, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                console.log('[Extensions] 🔍 Fetching OpenSubsonic extensions...');
                baseURL = client_1.apiClient['axiosInstance'].defaults.baseURL;
                if (!baseURL) {
                    console.error('[Extensions] ❌ No baseURL set in API client');
                    return [2 /*return*/, null];
                }
                console.log('[Extensions] 🔍 Server URL:', baseURL);
                url = "".concat(baseURL, "/getOpenSubsonicExtensions.view");
                params = {
                    v: constants_1.API_VERSION,
                    c: constants_1.CLIENT_NAME,
                    f: constants_1.API_FORMAT,
                };
                console.log('[Extensions] 🔍 Making unauthenticated request to:', url);
                console.log('[Extensions] 🔍 Params:', params);
                return [4 /*yield*/, axios_1.default.get(url, { params: params })];
            case 1:
                response = _c.sent();
                console.log('[Extensions] ✅ Response received:', response.status);
                console.log('[Extensions] 🔍 Full response data:', JSON.stringify(response.data, null, 2));
                subsonicResponse = response.data['subsonic-response'];
                console.log('[Extensions] 🔍 Subsonic response:', subsonicResponse);
                if (subsonicResponse.status !== 'ok') {
                    console.error('[Extensions] ❌ Server returned error:', subsonicResponse.error);
                    return [2 /*return*/, null];
                }
                extensions = subsonicResponse.openSubsonicExtensions || [];
                console.log('[Extensions] ✅ Parsed extensions count:', extensions.length);
                console.log('[Extensions] ✅ Extensions:', JSON.stringify(extensions, null, 2));
                return [2 /*return*/, extensions];
            case 2:
                error_1 = _c.sent();
                console.log('[Extensions] ⚠️  Server does not support OpenSubsonic extensions:', error_1);
                if (axios_1.default.isAxiosError(error_1)) {
                    console.log('[Extensions] ⚠️  Error details:', {
                        message: error_1.message,
                        status: (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.status,
                        data: (_b = error_1.response) === null || _b === void 0 ? void 0 : _b.data,
                    });
                }
                return [2 /*return*/, null];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getOpenSubsonicExtensions = getOpenSubsonicExtensions;
/**
 * Check if server supports a specific extension
 */
var hasExtension = function (extensions, name) {
    if (!extensions)
        return false;
    return extensions.some(function (ext) { return ext.name === name; });
};
exports.hasExtension = hasExtension;
/**
 * Check if server supports formPost extension
 */
var supportsFormPost = function (extensions) {
    return (0, exports.hasExtension)(extensions, 'formPost');
};
exports.supportsFormPost = supportsFormPost;
/**
 * Check if server supports apiKeyAuthentication extension
 */
var supportsApiKeyAuth = function (extensions) {
    return (0, exports.hasExtension)(extensions, 'apiKeyAuthentication');
};
exports.supportsApiKeyAuth = supportsApiKeyAuth;
/**
 * Check if server supports songLyrics extension
 */
var supportsSongLyrics = function (extensions) {
    return (0, exports.hasExtension)(extensions, 'songLyrics');
};
exports.supportsSongLyrics = supportsSongLyrics;
