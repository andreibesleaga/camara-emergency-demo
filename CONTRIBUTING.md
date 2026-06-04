# Contributing

Thanks for your interest in this demo project.

## Development

Requires Node.js >= 20.17.

```bash
npm install
npm run build:full   # build frontend + backend
npm run start        # run at http://localhost:8080 (USE_MOCK=true)
npm test             # run the Vitest e2e suite
```

## Guidelines

- Keep changes small, simple, and backward compatible — this is a demo.
- Preserve the `USE_MOCK` default and the CAMARA-compliant response shapes.
- Run `npm test` and `npm audit` before opening a PR.

## Reporting issues

Use GitHub issues for bugs and feature ideas. For security reports, see
[SECURITY.md](SECURITY.md).
