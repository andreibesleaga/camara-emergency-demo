# Security Policy

> This is a proof-of-concept / demo, not a production emergency-response service.

## Supported versions

Only the latest `main` is supported.

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories on this
repository. Do not open public issues for undisclosed vulnerabilities.

We aim to acknowledge reports within 7 days and follow a 90-day coordinated
disclosure window.

## Notes

- Secret-grade configuration (`CAMARA_*`, `ORANGE_*`, OAuth client secrets,
  `CAMARA_CALLBACK_AUTH_HEADER`) is supplied via environment/`.env`, which is
  gitignored. Never commit real credentials.
- The demo defaults to `USE_MOCK=true` so it never touches live telecom APIs
  unless explicitly configured.
- Security middleware (helmet, rate limiting, CORS, sanitization) is enabled by
  default — see the Security Features section of the README.
