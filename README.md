# CAMARA Location Services Emergency Demo

Minimal full-stack demo: Node.js backend + React/Leaflet frontend + MCP bridge + mock generator,
using camara-sdk and camara-mcp libraries.

Quick start

1. Copy .env.example to .env and set USE_MOCK=true
2. npm install
3. npm run build:full
4. npm run start -> open [http://localhost:8080](http://localhost:8080)

## Configuration

The `.env.example` file now documents all the inputs required to switch from mock data to live CAMARA Network APIs:

- **Global CAMARA settings** (`CAMARA_BASE_URL`, `CAMARA_SANDBOX_CONTRACT_ID`, `CAMARA_OPERATOR_NAME`, `CAMARA_SCOPE`, `CAMARA_SCOPES`).
- **OAuth/OpenID Connect** endpoints and credentials (`CAMARA_OAUTH_*`) to support client-credential exchanges against an operator sandbox.
- **Per product overrides** (`CAMARA_POPULATION_DENSITY_*`, `CAMARA_REGION_DEVICE_COUNT_*`, `CAMARA_DEVICE_LOCATION_*`, `CAMARA_ALERTS_*`) including usage mode flags (`synchronous`, `asynchronous`, `subscription`) and callback endpoints when a webhook is required.
- **Callback defaults** (`CAMARA_CALLBACK_BASE_URL`, `CAMARA_CALLBACK_AUTH_HEADER`) for operators that push events to the application.
- **Orange developer placeholders** (`ORANGE_APPLICATION_ID`, `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET`, `ORANGE_TOKEN_URL`, `ORANGE_SCOPES`) matching the Network APIs Playground documentation.

> ℹ️ Population density uses `ngeohash` cells returned by CAMARA to build the heatmap. Device location remains subscription-driven in live mode; the backend surfaces instructive errors until a webhook sink is configured.

Leave `USE_MOCK=true` until valid sandbox credentials are supplied; once all required variables are filled, set `USE_MOCK=false` to start wiring the live CAMARA flows.

Railway

- Build: npm run build:full
- Start: npm run start
- Vars: from .env.example

Endpoints

- GET /api/location/device/:deviceId
- POST /api/density/snapshot
- GET /api/density/flow/:areaId
- POST /api/alerts/rules
- GET /api/alerts/rules
- DELETE /api/alerts/rules/:id
- GET /api/alerts/stream (SSE)
- POST /api/routing/plan
- POST /api/mcp/invoke
