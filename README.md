# Banking API Assessment

Take-home template for a Node.js REST API that mimics **API Gateway → Lambda → DynamoDB**.

Implement banking endpoints (customers / accounts / balances) against the provided OpenAPI contract, using DynamoDB Local and serverless-offline.

## Prerequisites

- Node.js 18+
- npm
- Docker Desktop (for DynamoDB Local)

## Quick start

```bash
cp .env.example .env
npm install
npm run setup
npm start
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Contract: `openapi/openapi.yaml`
- Full instructions: `ASSESSMENT.md`

## Stack

| Concern | Local stand-in |
|---------|----------------|
| API Gateway + Lambda | Serverless Framework + `serverless-offline` |
| DynamoDB | DynamoDB Local via Docker (`docker compose`) |
| SDK | AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`) |

## Project layout

```
openapi/openapi.yaml          API contract (source of truth)
serverless.yml                Function ↔ HTTP route mapping
src/handlers/                 Lambda-style handlers (stubs → implement)
src/lib/                      DynamoDB client + response helpers
scripts/                      Create tables, seed data, wait-for-db
docker-compose.yml            DynamoDB Local
ASSESSMENT.md                 Assessment brief
```

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local in-memory DB + seed + start API in one step |
| `npm test` | Run automated test suite (37 tests across 11 suites) |
| `npm run screenshots` | Execute live API verification and capture high-res screenshots |
| `npm run setup` | Start Docker DB, create tables, seed |
| `npm start` | Run API locally (port 3000) |
| `npm run db:reset` | Recreate tables + reseed |
| `npm run db:down` | Stop DynamoDB Local |

## Documentation & Notes

- **Implementation Notes**: [`NOTES.md`](NOTES.md)
- **Visual Proofs & Screenshots**: [`screenshots/`](screenshots/)
- **API Contract**: [`openapi/openapi.yaml`](openapi/openapi.yaml)
