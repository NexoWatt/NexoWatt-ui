# Repository Guidelines

## Project Structure & Module Organization
`main.js` is the adapter entry point. EMS logic lives in `ems/`, with reusable control modules in `ems/modules/` and consumer integrations in `ems/consumers/`. Static UI pages and assets are in `www/`. ioBroker admin resources are split between legacy/static files in `admin/` and the React admin tab source in `src-admin-tab/`; the built output lands in `admin/react/`. Maintenance scripts such as version bumping and hook installation live in `scripts/`.

## Build, Test, and Development Commands
Use Node.js locally; the package declares `>=22`; release validation must use Node.js 22 or newer.

- `npm install`: install root dependencies.
- `npm run start` or `npm run dev`: run the adapter locally via `node main.js`.
- `npm run admin:install`: install the React admin tab dependencies in `src-admin-tab/`.
- `npm run admin:build`: build the Vite admin tab into `admin/react/`.
- `npm run build`: alias for the admin build.
- `npm run githooks:install`: enable the repo pre-commit hook.
- `npm run bump:patch` / `bump:minor` / `bump:major`: update version files before release work.

## Coding Style & Naming Conventions
Follow the existing style in the repository: 2-space indentation, semicolons, and single quotes in JavaScript and JSX. Use `PascalCase` for React components (`InstallerPage.jsx`), `camelCase` for functions and variables, and kebab-case for module filenames such as `storage-control.js`. Keep new admin UI work in React under `src-admin-tab/`; do not introduce new Materialize-based admin screens.

## Testing Guidelines
The repository contains automated release, runtime, type, UI-contract, EMS and regression checks. Before any release, run `npm run test:all`, `npm run build:ts`, `npm run publish:check`, and `npm pack --dry-run --json --ignore-scripts`. Hardware-facing changes additionally require project-specific commissioning in diagnostic mode before activation.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `feat:` and `chore:`. Keep messages imperative and scoped to one change. After `npm run githooks:install`, the pre-commit hook auto-bumps the patch version for non-version-file changes. PRs should include a short description, linked issue if applicable, affected UI screenshots for visual changes, and a note confirming manual validation steps.

## Security & Configuration Tips
Treat `io-package.json` and `admin/jsonConfig.json` as contract files for adapter configuration. Avoid committing secrets, customer-specific endpoints, or generated artifacts outside the expected build output in `admin/react/`.
