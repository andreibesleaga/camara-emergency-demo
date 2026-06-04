# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/) and [SemVer](https://semver.org/).

## [Unreleased]

### Added
- `GET /healthz` (liveness) and `GET /readyz` (readiness, reports mock/live mode).
- End-to-end test suite (Vitest + supertest) covering every REST endpoint in mock
  mode, validation errors, and the `x-correlator` guard (`npm test`).
- CI workflow, Dependabot, and governance files (SECURITY, CODE_OF_CONDUCT, CONTRIBUTING).
- `engines.node >= 20.17` to document the runtime requirement.

### Changed
- Express app extracted to `backend/app.ts` (exported); `backend/server.ts` only
  starts the listener. Runtime behavior and the entry point are unchanged.

### Security
- `npm audit fix` applied — 0 known vulnerabilities (no breaking upgrades).
