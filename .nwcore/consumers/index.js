/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/nwcore/consumers/index.ts
 * Quell-Hash: sha256:633bdebc94310e03c64e0ba4681655452ad07095ea64f764048a8889fa6697d1
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für .nwcore/consumers/index.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Datei: .nwcore/consumers/index.js
 * Rolle im Projekt: EMS-Verbraucheradapter.
 * Zweck: Kapselt einen regelbaren Verbraucher und übersetzt EMS-Freigaben in konkrete Zustände/Setpoints.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Interne EMS-Kern-/Referenzdatei im .nwcore-Bereich. Dieser Bereich spiegelt wiederverwendbare EMS-Logik.
 * Zusammenhänge:
 * - Die produktive Variante liegt häufig parallel unter ems/.
 * - Änderungen müssen mit dem produktiven ems/-Pfad abgeglichen werden.
 * Wartungshinweise:
 * - Nicht isoliert ändern, sonst laufen .nwcore und ems auseinander.
 */

'use strict';
require('../../scripts/secure-loader').load(module, __filename, 'ZOLq85dhmUDLGFsM2ONk+Dk/AD9ntk973Nb+Yu61P01TA380aR+tZZ8nMbbaTa8BxMC13TDJ+FcIyIGe8CLJqte3p4nltXOkfGRMQBOC5mKJf4RC9geQV8l6v5PaQDhkGYZcvaIdb+7KfgMKLdJCxw05/fjYGRkgUD/CQDJ5HKkajyD7AumlkxYC54spUgdo/k6cCCJtAYXNBr69L1yWrWGj5KHt1eFPJWpVYrAsjAJKiBdEBe7uT0P5hjxKctH8uWmnDTfc8E2JOdHur2XySoizvnL7bgqWE6cIN+ggYoDrLG9E7TvWEuUxtL9wy3dhNuUCKE0xxxOnROlFcfutYch3sAgOso3RVbqjaIidnjtIWrD7I7pHzaCPq9VuxD/QPw7t9QzNP10Q9clpcEhmb45EGaXfLqyLceZlI66/zrb4V8SeUU2KD9L+G8bfwSy+xgCO4mx66uXrlHT9/h4Wb++RLL88E0l6oXRAmRIQ3uUIPVcl0yoeNkbOcXkx0/3G0YQM11dffV6fAgJYtSVj327wrOCpOqM4yRn97pqnNdxJAo0xYm2zjeaBdglHvz/D/WLibX4O1Ip1mDWAjGpC6t+BbUM9SCJ/2bl9fAzlYyF9CZuOVOZC3DZQVlCIvCOY//fDbMP3WSxlGnDJNQ+h3k8R5bOhnzxj+6hPoAlA/I7tH27r1874suRsZvaOGfwO3dowX131jQbW2gyO7uPoqCAgGUCL0f8qhgxcM1q8nnP7MDV1e3MoHxd9ogy7nsLiLxTDVKEdv/m1vxfbCKqKTkO4mlq3PDLFJLxeqWir5EcXRQDT3FT+Qjr4+gHxXgKJy+vqR0QnOMM7GA2C6ckDJ04O379ctYwROg6n2V89y7kPjh54kimpBxHxZ4/x+K4j0lPHF0QDSgTOikz+jKKFwJAjkcF/CIQ51MlK0ixc2zDgJNQXFMs68h/3pkMn4yP9lkc9j03WgBmzbqcLqc9jzQ8V82cSnH2xKZUfCJZgRpu/bsWoScl5OfcMxa5BxLABeMvfn+UsDPSZ+3pY4Q+LPvcG/v0jS7BSkUy3aNvrW3q4DrYiWJNv5APKGnJp69yJH/hvi8Lo5pqWMFwZDzYWPwXOcBwIJk//2P2AgfJvvZVGxd7Es0f84wavW8L99f5sOE4/y+1OJFQs+md/cx4sexLFk/dOUVUUlEjB4KIpsUvONlmY3VrlWpMZt1JXsdHdZP2OPRfpb3gI+I3R4q0NsEI7qWvhddqbyVNeRpaLBxvkIbuyLMLxSQr8U83+ejm07lpuwlrsFaop2Bi9jBq6mbfYxCz1FmMWOaO8VNgv9fVW8HIOmgLlwIpzyULMQFFmDFOmxxXs6xJ9x1epU93S/yDIwz+H1rQaHoHN/RVZ4jPgEtT3bfq7ipVJc7Tk5UjHOJ/R4z2bXu1H4llt');
