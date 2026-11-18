# Banking API Assessment

Take-home assessment for a Node.js REST API that mimics **API Gateway → Lambda → DynamoDB**.

Features a **clean multi-tiered architecture**:
`Handler (Controller)` → `JWT Middleware` → `Validator Layer` → `Service Layer` → `Repository Layer` → `DynamoDB`.

Protected with **JWT Bearer Authentication** on all API endpoints.

---

## Prerequisites

- Node.js 18+
- npm
- (Optional) Docker Desktop for DynamoDB Local (or use `npm run dev` for 1-step in-memory startup)

---

## Quick Start (Recommended — No Docker Needed)

```bash
npm install
npm run dev
```

> **What `npm run dev` does automatically:**
> 1. Cleans up any stale processes on ports 8000, 3000, and 3002.
> 2. Auto-copies `.env.example` to `.env` if missing.
> 3. Starts local in-memory DynamoDB on `http://localhost:8000`.
> 4. Creates `Customers` and `Accounts` tables and seeds initial test data.
> 5. Starts Serverless Offline on `http://localhost:3000`.

- **API & Docs**: [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/docs](http://localhost:3000/docs)
- **Contract**: [`openapi/openapi.yaml`](openapi/openapi.yaml)
- **Get JWT Token**: `POST http://localhost:3000/auth/token`

---

## Running with Docker Desktop (Alternative)

```bash
cp .env.example .env
npm install
npm run setup    # Starts Docker DynamoDB, creates tables, seeds data
npm start        # Starts serverless-offline on port 3000
```

---

## Architectural Layers

```
Client / Swagger / Curl
       │
       ▼
[ API Gateway / Serverless-Offline ] (port 3000)
       │
       ▼
[ Handlers Layer ] (src/handlers/)
  - auth.js               POST /auth/token
  - customers.js          POST /customers, GET /customers/{customerId}
  - accounts.js           POST /customers/{id}/accounts, GET /customers/{id}/accounts, GET /accounts/{id}
  - transactions.js       POST /deposits, POST /withdrawals, POST /transfers
       │
       ├──► [ Middleware Layer ] (src/middlewares/auth.middleware.js)
       │      - Verifies `Authorization: Bearer <token>`
       │      - Injects decoded user into `event.user`
       │      - Rejects unauthenticated requests with 401 Unauthorized
       │
       ├──► [ Validator Layer ] (src/validators/)
       │      - customer.validator.js (body, email regex, customerId)
       │      - account.validator.js (type, currency, 2-decimal balance)
       │      - transaction.validator.js (positive amount, matching currency, self-transfer guard)
       │
       ▼
[ Service Layer ] (src/services/)
  - customer.service.js   (UUID generation, status, points)
  - account.service.js    (parent customer check, default balance, GSI listing)
  - transaction.service.js(status OPEN check, currency match, overdraft guard, ACID transfer)
       │
       ▼
[ Repository Layer ] (src/repositories/)
  - customer.repository.js (DynamoDB GetCommand, PutCommand, DeleteCommand)
  - account.repository.js  (DynamoDB GetCommand, PutCommand, GSI CustomerIdIndex Query, UpdateCommand, TransactWriteCommand)
       │
       ▼
[ DynamoDB / DynamoDB Local ] (port 8000)
```

---

## Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | 1-command startup: auto-cleans ports, starts local DB, seeds tables, and starts API |
| `npm test` | Run full automated test suite (**79 tests across 26 test suites**) |
| `npm run screenshots` | Execute live API verification and capture high-res screenshots |
| `npm run setup` | Start Docker DB, create tables, seed data |
| `npm start` | Run API locally on port 3000 |
| `npm run db:reset` | Recreate tables + reseed |
| `npm run db:down` | Stop DynamoDB Local container |

---

## Documentation & Deliverables

- **Complete Code Changes & Architecture Guide**: [`CHANGELOG_AND_ARCHITECTURE.md`](CHANGELOG_AND_ARCHITECTURE.md)
- **Printable Architecture PDF**: [`Banking_API_Code_Changes_and_Architecture.pdf`](Banking_API_Code_Changes_and_Architecture.pdf)
- **Technical Interview Prep Guide (PDF)**: [`Banking_API_Interview_Guide.pdf`](Banking_API_Interview_Guide.pdf)
- **Implementation & Consistency Notes**: [`NOTES.md`](NOTES.md)
- **Visual Proofs & Screenshots**: [`screenshots/`](screenshots/)
  - `01_swagger_docs.png`: Swagger UI with JWT Bearer Authorize button
  - `02_live_endpoints_verified.png`: Complete live execution of all 10 operations
  - `03_test_suite_passed.png`: 79/79 passing tests report
