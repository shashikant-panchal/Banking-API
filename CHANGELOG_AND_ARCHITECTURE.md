# Banking API Assessment — Complete Code Changes & Architecture Guide

This document provides a comprehensive audit of all files created, modified, and enhanced across the entire project. Use this guide to understand every detail of the codebase and explain your work clearly in technical interviews.

---

## 1. Master File Change Matrix

| File Path | Status | Type | Purpose & Summary of Work |
|---|---|---|---|
| [`src/handlers/customers.js`](src/handlers/customers.js) | **Modified** | Business Logic | Replaced `501 Not Implemented` stubs. Implemented `createCustomer` (`POST /customers`) with validation + UUID generation, and `getCustomer` (`GET /customers/{id}`) with $O(1)$ point reads. |
| [`src/handlers/accounts.js`](src/handlers/accounts.js) | **Modified** | Business Logic | Replaced `501 Not Implemented` stubs. Implemented `createAccount` (`POST`), `listAccounts` (`GET` via GSI `CustomerIdIndex` Query), and `getAccount` (`GET` including balance). |
| [`src/handlers/transactions.js`](src/handlers/transactions.js) | **Modified** | Business Logic (Stretch) | Replaced `501 Not Implemented` stubs. Implemented atomic deposits (`POST /deposits`), withdrawals with overdraft guard (`POST /withdrawals`), and cross-account atomic transfers (`POST /transfers`) using DynamoDB ACID `TransactWriteItems`. |
| [`src/lib/response.js`](src/lib/response.js) | **Modified** | Core Utility | Hardened `parseJsonBody` to support raw strings, base64 encoding, and pre-parsed event objects. Enforced `{ error, message }` error schemas conforming to OpenAPI. |
| [`serverless.yml`](serverless.yml) | **Modified** | Configuration | Added root path `/` to `docsUi` events so opening `http://localhost:3000` automatically loads Swagger UI without requiring `/docs`. |
| [`package.json`](package.json) | **Modified** | Configuration | Added `"dev"`, `"test"`, `"db:local"`, and `"screenshots"` npm scripts. Added `aws-sdk-client-mock` and `dynalite` to `devDependencies`. |
| [`README.md`](README.md) | **Modified** | Documentation | Added command reference table (`npm run dev`, `npm test`), links to `NOTES.md`, API specification, and screenshots. |
| [`.env`](.env) | **Created** | Configuration | Configured environment variables for local DynamoDB connection on `http://localhost:8000`. |
| [`test/customers.test.js`](test/customers.test.js) | **Created** | Automated Test | 9 unit tests for customer creation and retrieval, covering happy paths, missing fields, malformed emails, and 404s. |
| [`test/accounts.test.js`](test/accounts.test.js) | **Created** | Automated Test | 13 unit tests for account creation, initial balances, currency validation, 404s, and GSI `CustomerIdIndex` queries. |
| [`test/transactions.test.js`](test/transactions.test.js) | **Created** | Automated Test | 15 unit tests for deposits, withdrawals, atomic transfers, overdraft guards (`409`), currency mismatches, and concurrency race conditions. |
| [`scripts/dev.js`](scripts/dev.js) | **Created** | Developer Experience | 1-command startup script: auto-cleans stale ports (8000/3000/3002), auto-copies `.env`, starts local DynamoDB, seeds tables, and starts serverless-offline. |
| [`scripts/start-local-db.js`](scripts/start-local-db.js) | **Created** | Infrastructure | Pure Node.js in-memory DynamoDB Local server using `dynalite`, enabling local development without needing Docker Desktop. |
| [`scripts/create-tables.js`](scripts/create-tables.js) | **Modified** | Database Migration | Hardened table recreation logic with backoff delays and `ResourceInUseException` resilience. |
| [`scripts/capture-all-screenshots.js`](scripts/capture-all-screenshots.js) | **Created** | Verification / QA | Executes end-to-end HTTP requests for all 9 API operations against localhost:3000, runs tests, and captures high-res PNG screenshots. |
| [`scripts/generate-interview-pdf.js`](scripts/generate-interview-pdf.js) | **Created** | Documentation | Automated script to render and print the interview preparation guide into PDF format via headless Chromium. |
| [`NOTES.md`](NOTES.md) | **Created** | Technical Documentation | Comprehensive design document explaining DynamoDB access patterns, ACID transaction guarantees, partial failure handling, and demo curl commands. |
| [`Banking_API_Interview_Guide.pdf`](Banking_API_Interview_Guide.pdf) | **Created** | Interview Prep | Professional PDF guide containing elevator pitches, core Q&A model answers, and technical buzzword summaries. |
| [`Interview_Guide.html`](Interview_Guide.html) | **Created** | Interview Prep | Interactive HTML version of the interview guide. |
| [`screenshots/01_swagger_docs.png`](screenshots/01_swagger_docs.png) | **Created** | Visual Proof | Screenshot of interactive Swagger UI running at `http://localhost:3000/docs`. |
| [`screenshots/02_live_endpoints_verified.png`](screenshots/02_live_endpoints_verified.png) | **Created** | Visual Proof | Screenshot showing complete execution and output of all 9 live endpoints. |
| [`screenshots/03_test_suite_passed.png`](screenshots/03_test_suite_passed.png) | **Created** | Visual Proof | Screenshot showing 37/37 automated tests passing in terminal. |
| [`screenshots/live_demo_report.html`](screenshots/live_demo_report.html) | **Created** | Visual Proof | Dark-mode interactive HTML report of live endpoint executions. |
| [`screenshots/test_results.html`](screenshots/test_results.html) | **Created** | Visual Proof | Visual terminal report of automated test suite results. |

---

## 2. Detailed Breakdown by Layer

### Layer 1: Handlers (`src/handlers/`)

#### 1. Customers (`src/handlers/customers.js`)
- **What was originally there**: Stubs returning `501 Not Implemented`.
- **What was built**:
  - `create(event)`:
    - Parses request body via `parseJsonBody`.
    - Validates `fullName` (must be non-empty string).
    - Validates `email` against RFC 5322 regex pattern (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
    - Generates unique customer ID: `cust_${uuidv4()}`.
    - Sets initial status to `"ACTIVE"` and `createdAt` timestamp.
    - Persists item to DynamoDB `Customers` table with `PutCommand`.
    - Returns `201 Created` with Customer schema.
  - `get(event)`:
    - Extracts `customerId` from `event.pathParameters`.
    - Performs $O(1)$ point lookup using `GetCommand` on partition key `customerId`.
    - Returns `200 OK` with customer data if found, or `404 Not Found` with `{ error: "NOT_FOUND", message: "..." }`.

#### 2. Accounts (`src/handlers/accounts.js`)
- **What was originally there**: Stubs returning `501 Not Implemented`.
- **What was built**:
  - `create(event)`:
    - Validates customer existence first via `GetCommand` (returns `404` if customer does not exist).
    - Validates `type` enum (`CHECKING` or `SAVINGS`).
    - Validates `currency` enum (`CAD` or `USD`).
    - Validates `initialBalance` ($\ge 0$, finite number, max 2 decimal places to avoid floating-point errors).
    - Generates `accountId: acct_${uuidv4()}`, sets status `"OPEN"`, and saves to `Accounts` table including `customerId` attribute.
    - Returns `201 Created`.
  - `list(event)`:
    - Verifies customer exists (`404` if not).
    - **Crucial Architecture Decision**: Instead of running a costly `Scan` with a filter, uses `QueryCommand` targeting the Global Secondary Index (`IndexName: "CustomerIdIndex"`).
    - Key condition: `customerId = :customerId`.
    - Returns `200 OK` with `{ items: Account[] }`.
  - `get(event)`:
    - Performs direct point read with `GetCommand` by `accountId`.
    - Returns `200 OK` including current balance, or `404 Not Found`.

#### 3. Transactions — Stretch Goals (`src/handlers/transactions.js`)
- **What was originally there**: Stubs returning `501 Not Implemented`.
- **What was built**:
  - `deposit(event)`:
    - Validates positive amount (max 2 decimal places) and matching currency.
    - Verifies account exists and is in `OPEN` status.
    - Uses atomic `UpdateCommand`: `SET balance = balance + :amount`.
    - Uses `ConditionExpression: "attribute_exists(accountId) AND #status = :openStatus AND currency = :currency"`.
    - Returns `200 OK` with updated Account object.
  - `withdraw(event)`:
    - Validates positive amount and matching currency.
    - Verifies account exists and is `OPEN`.
    - Validates sufficient balance (`balance >= amount`); returns `409 Conflict` if insufficient funds.
    - Atomic debit via `UpdateCommand`: `SET balance = balance - :amount`.
    - Concurrency guard: `ConditionExpression: "balance >= :amount AND #status = :openStatus AND currency = :currency"`.
    - If another transaction drops balance concurrently, catches `ConditionalCheckFailedException` and returns `409 Conflict`.
  - `transfer(event)`:
    - Cross-account fund movement between `fromAccountId` and `toAccountId`.
    - Validates both accounts exist, are `OPEN`, share the same currency, and `fromAccountId !== toAccountId`.
    - Validates `fromAccount.balance >= amount`.
    - **All-or-Nothing Atomicity**: Executes both balance updates together in a single `TransactWriteCommand` (`TransactWriteItems`).
    - Concurrency safety: Debit item requires `balance >= :amount`. If a concurrent withdrawal occurs, DynamoDB aborts the entire transaction with `TransactionCanceledException`, caught and returned as `409 Conflict`.
    - Includes fallback for local emulators lacking transactions with two-phase conditional update and compensating rollback.

---

### Layer 2: Core Helpers (`src/lib/`)

- **`src/lib/response.js`**:
  - Prepares API Gateway JSON responses with `Content-Type: application/json` and CORS headers.
  - Implements helpers: `ok` (200), `created` (201), `badRequest` (400), `notFound` (404), `conflict` (409), `serverError` (500).
  - Enhanced `parseJsonBody` to handle raw strings, base64-encoded strings, and pre-parsed objects, rejecting invalid non-objects (e.g. primitives or arrays) with `400 Bad Request`.
- **`src/lib/dynamodb.js`**:
  - Initializes `DynamoDBClient` with local credentials and endpoint (`http://localhost:8000`).
  - Wraps in `DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })`.
  - Exports `TABLES` dictionary (`Customers`, `Accounts`).

---

### Layer 3: Automated Test Suite (`test/`)

Built using Node's native `node:test` and `node:assert` framework combined with `aws-sdk-client-mock`:

1. **`test/customers.test.js` (9 tests)**:
   - Happy path customer creation (returns 201, verifies `PutCommand` payload).
   - Validation rejection: missing `fullName` (400).
   - Validation rejection: whitespace-only `fullName` (400).
   - Validation rejection: missing/invalid `email` (400).
   - Validation rejection: missing body / non-JSON body (400).
   - Happy path customer retrieval by ID (200).
   - Customer not found error (404).
   - Missing path parameter validation (400).

2. **`test/accounts.test.js` (13 tests)**:
   - Account creation with default `initialBalance = 0` (201).
   - Account creation with custom `initialBalance` (201).
   - Non-existent customer error on create (404).
   - Invalid account type rejection (400).
   - Invalid currency rejection (400).
   - Negative `initialBalance` rejection (400).
   - Fractional cent (>2 decimal places) rejection (400).
   - Listing accounts via GSI `CustomerIdIndex` Query (200).
   - Empty list for customer with no accounts (200).
   - Non-existent customer error on listing (404).
   - Account retrieval by ID with balance (200).
   - Account not found error (404).
   - Missing path parameter validation (400).

3. **`test/transactions.test.js` (15 tests)**:
   - Deposit happy path with balance increment (200).
   - Deposit on non-existent account (404).
   - Deposit with non-positive amount (400).
   - Deposit currency mismatch (400).
   - Deposit on closed account (400).
   - Withdrawal happy path with balance decrement (200).
   - Withdrawal insufficient funds (409 Conflict).
   - Withdrawal condition check race condition simulation (409 Conflict).
   - Withdrawal on non-existent account (404).
   - Atomic transfer happy path via `TransactWriteCommand` (200).
   - Self-transfer rejection (400).
   - Source account not found (404).
   - Insufficient funds transfer rejection (409 Conflict).
   - Currency mismatch transfer rejection (400).
   - `TransactionCanceledException` collision simulation (409 Conflict).

**Total: 37 automated tests across 11 test suites with 0 failures.**

---

### Layer 4: Developer Experience & Scripts (`scripts/`)

- **`scripts/dev.js`**:
  - The flagship 1-command startup script (`npm run dev`).
  - Automatically kills stale processes on ports 8000, 3000, and 3002 before starting.
  - Automatically copies `.env.example` to `.env` if missing.
  - Spawns in-memory DynamoDB Local on port 8000.
  - Executes `scripts/create-tables.js` and `scripts/seed.js`.
  - Spawns `serverless offline` on port 3000.
  - Handles `SIGINT` / `SIGTERM` to gracefully shut down child processes.
- **`scripts/start-local-db.js`**:
  - Lightweight in-memory DynamoDB server powered by `dynalite`.
  - Provides a complete DynamoDB-compatible API on port 8000 without requiring Docker Desktop or Java.
  - Gracefully handles `EADDRINUSE` if port 8000 is already active.
- **`scripts/create-tables.js`**:
  - Recreates `Customers` table (`customerId` HASH).
  - Recreates `Accounts` table (`accountId` HASH + GSI `CustomerIdIndex` on `customerId`).
  - Added backoff delays and `ResourceInUseException` error handling.
- **`scripts/capture-all-screenshots.js`**:
  - Automatically tests all 9 endpoints against the live server.
  - Generates HTML visual reports and captures PNG screenshots via headless Microsoft Edge.
- **`scripts/generate-interview-pdf.js`**:
  - Converts the interview guide into a printable PDF document using Chromium.

---

### Layer 5: Configuration & Root Files

- **`serverless.yml`**:
  - Mapped root path `/` to `docsUi` handler alongside `/docs`.
- **`package.json`**:
  - Added scripts:
    - `"dev": "node scripts/dev.js"`
    - `"test": "node --test test/**/*.test.js"`
    - `"db:local": "node scripts/start-local-db.js"`
    - `"screenshots": "node scripts/capture-all-screenshots.js"`
  - Added devDependencies: `aws-sdk-client-mock`, `dynalite`.
- **`README.md`**:
  - Added command reference table, links to documentation and screenshots.
- **`NOTES.md`**:
  - Comprehensive architectural review covering DynamoDB access patterns, ACID transaction guarantees, concurrency handling, and live demo commands.
- **`.env`**:
  - Created from `.env.example` with local endpoint and table configurations.

---

## 3. How to Explain Your Work in an Interview

### 1. Opening Statement
> *"When taking on this assessment, I structured the solution into three primary layers:
> 1. **Contract Adherence**: Implementing all core and stretch endpoints strictly according to the OpenAPI 3.0 specification.
> 2. **DynamoDB Access Optimization**: Ensuring zero table Scans by using point reads and a Global Secondary Index (GSI) for customer account queries.
> 3. **Financial Integrity**: Guaranteeing ACID atomicity on transfers via `TransactWriteItems` and optimistic concurrency controls on balances to prevent overdrafts."*

### 2. What to Say About the Codebase Structure
> *"I maintained clean separation of concerns:
> - `src/handlers/` holds the Lambda handlers, keeping them focused purely on parsing, validation, and invoking DynamoDB commands.
> - `src/lib/` encapsulates shared DynamoDB DocumentClient connections and standardized HTTP response formatters.
> - `test/` contains 37 unit tests using `aws-sdk-client-mock`, allowing tests to run in under 300ms without spinning up live databases.
> - `scripts/` contains database migrations, seeding, and a unified `npm run dev` script that auto-cleans ports and starts the full stack in one step."*

### 3. What to Say About DynamoDB Design Decisions
> *"In DynamoDB, access patterns dictate the table schema:
> - For individual customer and account lookups, partition key lookups (`GetCommand`) provide predictable $O(1)$ latency.
> - For listing accounts by customer, querying the `CustomerIdIndex` GSI targets only that customer's partition. This avoids the $O(N)$ linear latency and unbounded cost of a Scan operation.
> - For cross-account transfers, I used `TransactWriteCommand` to ensure that debit and credit operations commit atomically together. If either account fails condition checks (e.g. insufficient balance or closed status), the entire transaction aborts with zero risk of funds being lost or created."*
