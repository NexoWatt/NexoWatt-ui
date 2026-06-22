"use strict";
/**
 * Datei: src-ts/contracts/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die ersten TypeScript-Verträge.
 * Neue TS-Dateien sollen bevorzugt von hier importieren, damit die Migration geordnet bleibt.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.apiStateContracts = void 0;
__exportStar(require("./units"), exports);
__exportStar(require("./energy-flow"), exports);
__exportStar(require("./features"), exports);
__exportStar(require("./ai-advisor"), exports);
__exportStar(require("./license"), exports);
__exportStar(require("./datapoints"), exports);
__exportStar(require("./iobroker-states"), exports);
__exportStar(require("./api"), exports);
__exportStar(require("./adapter-api"), exports);
__exportStar(require("./testing"), exports);
__exportStar(require("./ems-budget"), exports);
__exportStar(require("./heating-rod"), exports);
exports.apiStateContracts = __importStar(require("./api-state"));
/**
 * Code-Teil: History-Verträge exportieren
 *
 * Zweck:
 * Macht die History-/Report-Datenverträge für spätere Migrationen zentral verfügbar.
 */
__exportStar(require("./history"), exports);
