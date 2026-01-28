#!/usr/bin/env node
/*
  Enables repo-local git hooks stored in ./.githooks

  This sets:
    git config core.hooksPath .githooks

  Usage:
    npm run githooks:install
*/

const { execSync } = require('child_process');

function main() {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (_e) {
    console.error('[githooks] git not found in PATH. Please install Git first.');
    process.exit(1);
  }

  try {
    execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
    console.log('[githooks] Installed: core.hooksPath=.githooks');
  } catch (e) {
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
