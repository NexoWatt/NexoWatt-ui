'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/index.ts
 * Quell-Hash: sha256:255bd52b7e947749abfabf9a41a6f4d9149b7f1e94cf7311adda18bb3b1f7049
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
/**
 * Datei: src-ts/adapter/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die TypeScript-Vorbereitung der Adapter-API-Schicht.
 *
 * Zusammenhang:
 * Alles unter `src-ts/adapter/*` gehört fachlich zu `main.js`: StateCache, HTTP-API,
 * Schreibpläne und `info.connection`. Produktive Runtime bleibt in 0.7.63 weiterhin JS.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsWrites = exports.connectionState = exports.apiSet = exports.apiState = exports.stateCache = void 0;
/**
 * Code-Teil: Adapter-API-Exportpunkt
 *
 * Zweck:
 * Bündelt die vorbereiteten TypeScript-Helfer für `main.js`, damit spätere Runtime-
 * Auslagerungen nur noch einen stabilen Importpfad benötigen.
 *
 * Zusammenhang:
 * Produktiv bleibt `main.js`; diese Datei definiert nur die spätere modulare Grenze.
 */
exports.stateCache = __importStar(require("./state-cache"));
exports.apiState = __importStar(require("./api-state"));
exports.apiSet = __importStar(require("./api-set"));
exports.connectionState = __importStar(require("./connection-state"));
exports.settingsWrites = __importStar(require("./settings-writes"));
