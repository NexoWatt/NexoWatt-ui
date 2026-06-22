"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMainApiSetShadowSummary = exports.buildMainApiStateShadowSummary = void 0;
/**
 * Datei: src-ts/main/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die ersten echten TypeScript-Helfer aus main.js.
 *
 * Zusammenhang:
 * Diese Helfer werden in 0.7.98 noch nicht produktiv von main.js genutzt. Sie sind aber
 * echte, kompilierbare TS-Module mit CommonJS-Spiegeln unter `lib/ts-mirrors/main/`.
 */
/**
 * Code-Teil: Main-Helfer exportieren
 *
 * Zweck:
 * Bündelt die einzelnen TypeScript-Helfer für StateCache, /api/state, /api/set,
 * info.connection und Lizenz. Später kann main.ts über diesen Exportpunkt gezielt
 * Teile aus main.js übernehmen, ohne direkte Querimporte zu verteilen.
 */
__exportStar(require("./state-cache"), exports);
__exportStar(require("./api-state"), exports);
__exportStar(require("./api-set"), exports);
__exportStar(require("./info-connection"), exports);
__exportStar(require("./license-key"), exports);
var api_shadow_1 = require("./api-shadow");
Object.defineProperty(exports, "buildMainApiStateShadowSummary", { enumerable: true, get: function () { return api_shadow_1.buildMainApiStateShadowSummary; } });
Object.defineProperty(exports, "buildMainApiSetShadowSummary", { enumerable: true, get: function () { return api_shadow_1.buildMainApiSetShadowSummary; } });
