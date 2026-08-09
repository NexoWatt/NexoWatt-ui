#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/logic.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');

assert.match(html, /<body class="[^"]*nw-page-logic/);
assert.match(html, /<main class="[^"]*nw-logic-page/);
assert.doesNotMatch(html, /nw-page-hero/);
assert.match(css, /body\.nw-page-logic\{[\s\S]*height:100vh;[\s\S]*overflow:hidden;/);
assert.match(css, /body\.nw-page-logic \.nw-logic-page\{[\s\S]*max-width:none !important;[\s\S]*display:flex;/);
assert.match(css, /body\.nw-page-logic \.nw-le\{[\s\S]*flex:1 1 auto;[\s\S]*overflow:hidden;/);
assert.match(css, /@media \(max-width:1199px\)[\s\S]*min-width:1180px/);

console.log('[nexologic-desktop-layout-rc44] OK: NexoLogic uses the full desktop viewport with independently scrollable palette and inspector.');
