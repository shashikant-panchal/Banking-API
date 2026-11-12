# Banking API Assessment

Build a small REST API that manages customers, accounts, and balances.

This exercise mirrors a common production pattern: **API Gateway → Lambda → DynamoDB**.
Locally you use:

- **serverless-offline** — HTTP routing that mimics API Gateway invoking Lambda handlers
- **DynamoDB Local** (Docker) — in-memory DynamoDB-compatible store
- **AWS SDK v3** — same client libraries used against real DynamoDB

## Timebox

| Level | Suggested time | Scope |
|-------|----------------|-------|
| Junior | 2–4 hours | Core CRUD endpoints |
| Mid / Senior | 4–6 hours | Core + stretch transaction endpoints |

You do **not** need to finish every stretch item. Clear, working core endpoints score higher than incomplete stretch work.

## Prerequisites

- Node.js 18+
- Docker Desktop (for DynamoDB Local)
- npm

## Setup

```bash
cp .env.example .env
npm install
npm run setup          # starts DynamoDB Local, creates tables, seeds data
npm start              # serverless-offline on http://localhost:3000
```

Seeded ids you can use while implementing:

- Customers: `cust_001`, `cust_002`
- Accounts: `acct_001`, `acct_002`, `acct_003`

API contract: [`openapi/openapi.yaml`](openapi/openapi.yaml)  
Interactive docs: http://localhost:3000/docs

## What you must implement (core)

Replace the `501 Not Implemented` stubs in:

- `src/handlers/customers.js`
- `src/handlers/accounts.js`

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/customers` | Create customer → `201` |
| `GET` | `/customers/{customerId}` | Get customer → `200` / `404` |
| `POST` | `/customers/{customerId}/accounts` | Create account → `201` |
| `GET` | `/customers/{customerId}/accounts` | List accounts → `200` `{ items: [...] }` |
| `GET` | `/accounts/{accountId}` | Get account **including balance** → `200` / `404` |

Follow the OpenAPI schemas for request/response shapes and status codes.

### DynamoDB tables (already created by scripts)

**Customers**

- Partition key: `customerId` (S)

**Accounts**

- Partition key: `accountId` (S)
- GSI `CustomerIdIndex`: partition key `customerId` (S)

Use `Query` on the GSI for listing a customer's accounts (prefer that over `Scan`).

Helpers available:

- `src/lib/dynamodb.js` — Document Client + table names
- `src/lib/response.js` — API Gateway-style JSON responses + body parsing

Handlers should keep the Lambda shape:

```js
exports.handlerStyle = async (event) => {
  // read event.pathParameters / event.body
  // call DynamoDB
  return { statusCode, headers, body: JSON.stringify(...) };
};
```

## Stretch goals (mid / senior)

In `src/handlers/transactions.js`:

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/accounts/{accountId}/deposits` | amount > 0; currency must match |
| `POST` | `/accounts/{accountId}/withdrawals` | `409` on insufficient funds |
| `POST` | `/transfers` | move funds between accounts; document consistency approach |

## Expectations

- Match the OpenAPI contract (fields, status codes, error shape `{ error, message }`)
- Validate inputs; return `400` for bad requests
- Prefer readable structure over cleverness
- Optional but valued: a few automated tests for happy path + one error case
- Do not commit secrets; `.env` is gitignored

## Out of scope

- Real AWS deploy, Cognito, IAM policies beyond the sample YAML
- Frontend UI
- Full banking compliance / KYC / PCI

## How to demo your work

1. Leave the API running on port 3000
2. Show working curl/Postman calls for each core endpoint
3. Briefly explain your DynamoDB access patterns (especially list-by-customer)
4. If you did transfers: explain how you handled (or would handle) partial failure

## Submission

Follow the instructions from your recruiter (zip, private repo link, etc.).
Include any notes in a short `NOTES.md` if you made design trade-offs worth calling out.
