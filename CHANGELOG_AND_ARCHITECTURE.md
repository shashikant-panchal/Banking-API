# Banking API Assessment — Complete Code Changes & Layered Architecture Guide

This document provides a comprehensive technical audit of all files created, modified, and enhanced across the entire project. It documents the evolution from initial assessment stubs to a production-grade, 4-tier Clean Architecture with JWT authentication as requested in recruiter feedback.

---

## 1. Recruiter Feedback & Architectural Response

### Recruiter Feedback Received:
> *"Okay. You done good, okay? Thank you. But just you are not mention the business logic on your handler. Why you are not separated, like the services, account service, transaction service, or customer service. And also you have missed it, like make repository, mention all your queries. Like you have mentioned already your DynamoDB commands, get commands, put command, delete command, and also queries. I think it will be help with you, right? Yeah. And also I think you missed the validation. Already you are validated in your handler, right? Yes. You make it a separate folder, or separate file for validation, and mention the functions, and export the function. After that you have called the operations to validate the request body, parameters. I think you got my point, right? Yes. But you, right now, just your explanation is okay, understand. Add the authentication with jwt middleware in every api"*

### Architectural Transformation:
To address this feedback comprehensively, the entire codebase was refactored into a **4-Tier Clean Architecture** adhering to the **Single Responsibility Principle (SRP)** and **Separation of Concerns (SoC)**:

```
                      ┌────────────────────────────────────────┐
                      │             HTTP Request               │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       JWT Authentication Middleware    │
                      │      (src/middlewares/auth.middleware)│
                      │    - Verifies Bearer JWT token          │
                      │    - Attaches decoded user to event     │
                      │    - Rejects with 401 Unauthorized     │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       Controller / Handler Layer       │
                      │          (src/handlers/*.js)           │
                      │    - HTTP envelope parsing             │
                      │    - Coordinates Validator & Service   │
                      │    - Maps results to HTTP 200/201/etc. │
                      └─────────┬────────────────────┬─────────┘
                                │                    │
                1. Validate     │                    │  2. Delegate
                                ▼                    ▼
        ┌─────────────────────────────┐   ┌─────────────────────────────┐
        │       Validator Layer       │   │        Service Layer        │
        │     (src/validators/*.js)   │   │     (src/services/*.js)     │
        │ - Pure validation functions │   │ - Domain business logic     │
        │ - Parameter & body checks   │   │ - Account balance rules     │
        │ - Regex, enums, 2-decimals  │   │ - Currency matching checks  │
        │ - Throws 400 Bad Request    │   │ - Overdraft/conflict checks │
        └─────────────────────────────┘   └──────────────┬──────────────┘
                                                         │
                                                         │ 3. Data Access
                                                         ▼
                                          ┌─────────────────────────────┐
                                          │      Repository Layer       │
                                          │   (src/repositories/*.js)   │
                                          │ - Encapsulates all DynamoDB │
                                          │ - GetCommand, PutCommand    │
                                          │ - UpdateCommand, Delete     │
                                          │ - GSI QueryCommand          │
                                          │ - TransactWriteCommand      │
                                          └──────────────┬──────────────┘
                                                         │
                                                         ▼
                                          ┌─────────────────────────────┐
                                          │      Amazon DynamoDB        │
                                          │     Customers & Accounts    │
                                          └─────────────────────────────┘
```

---

## 2. Master File Change Matrix

| File Path | Status | Layer | Technical Purpose & Summary of Work |
|---|---|---|---|
| [`src/middlewares/auth.middleware.js`](src/middlewares/auth.middleware.js) | **Created** | Middleware | JWT authentication middleware (`withAuth`, `authenticate`, `generateToken`). Validates `Authorization: Bearer <token>` against `JWT_SECRET`. Rejects missing/expired/invalid tokens with `401 Unauthorized`. |
| [`src/handlers/auth.js`](src/handlers/auth.js) | **Created** | Controller | Token issuance endpoint (`POST /auth/token`). Accepts username and role, generates signed HS256 JWT tokens for API consumers and test suites. |
| [`src/validators/customer.validator.js`](src/validators/customer.validator.js) | **Created** | Validator | Dedicated validation functions: `validateCreateCustomer` (`fullName`, RFC 5322 regex `email`) and `validateCustomerId` parameter. |
| [`src/validators/account.validator.js`](src/validators/account.validator.js) | **Created** | Validator | Dedicated validation functions: `validateCreateAccount` (`type` enum, `currency` enum, non-negative 2-decimal `initialBalance`), `validateCustomerIdParam`, `validateAccountIdParam`. |
| [`src/validators/transaction.validator.js`](src/validators/transaction.validator.js) | **Created** | Validator | Dedicated validation functions: `validateDeposit`, `validateWithdraw`, and `validateTransfer` (finite positive amounts, 2-decimal limits, currency enums, self-transfer prevention). |
| [`src/repositories/customer.repository.js`](src/repositories/customer.repository.js) | **Created** | Repository | Encapsulates all customer DynamoDB operations: `findById` (`GetCommand`), `create` (`PutCommand`), and `delete` (`DeleteCommand`). |
| [`src/repositories/account.repository.js`](src/repositories/account.repository.js) | **Created** | Repository | Encapsulates all account DynamoDB operations: `findById` (`GetCommand`), `create` (`PutCommand`), `findByCustomerId` (GSI `CustomerIdIndex` `QueryCommand`), `updateBalance` (atomic `UpdateCommand`), and `executeTransfer` (ACID `TransactWriteCommand` with emulator fallback). |
| [`src/services/customer.service.js`](src/services/customer.service.js) | **Created** | Service | Core customer business logic: generates unique IDs (`cust_${uuidv4()}`), assigns default `ACTIVE` status and timestamps, orchestrates repository calls. |
| [`src/services/account.service.js`](src/services/account.service.js) | **Created** | Service | Core account business logic: validates parent customer existence before creation/listing, generates unique account IDs (`acct_${uuidv4()}`), sets `OPEN` status. |
| [`src/services/transaction.service.js`](src/services/transaction.service.js) | **Created** | Service | Financial transaction business rules: verifies accounts exist and are `OPEN`, checks currency matching, enforces overdraft prevention, coordinates atomic transfers. |
| [`src/handlers/customers.js`](src/handlers/customers.js) | **Modified** | Controller | Refactored into a pure controller wrapped with `withAuth`. Delegates body validation to `customer.validator.js` and execution to `customer.service.js`. |
| [`src/handlers/accounts.js`](src/handlers/accounts.js) | **Modified** | Controller | Refactored into a pure controller wrapped with `withAuth`. Delegates validation to `account.validator.js` and execution to `account.service.js`. |
| [`src/handlers/transactions.js`](src/handlers/transactions.js) | **Modified** | Controller | Refactored into a pure controller wrapped with `withAuth`. Delegates validation to `transaction.validator.js` and execution to `transaction.service.js`. |
| [`src/lib/response.js`](src/lib/response.js) | **Modified** | Core Utility | Added `unauthorized` (401) and `forbidden` (403) response helpers. Hardened `parseJsonBody` for strings, base64, and pre-parsed objects. |
| [`src/lib/errors.js`](src/lib/errors.js) | **Modified** | Core Utility | Added `unauthorized(message)` factory for standardized 401 error instances. |
| [`serverless.yml`](serverless.yml) | **Modified** | Configuration | Added `JWT_SECRET` environment variable, added `POST /auth/token` route, and mapped root `/` to Swagger UI (`docsUi`). |
| [`openapi/openapi.yaml`](openapi/openapi.yaml) | **Modified** | API Specification | Documented `bearerAuth` security scheme (HTTP Bearer JWT), added `/auth/token` endpoint, and secured all banking endpoints with `security: [bearerAuth: []]`. |
| [`package.json`](package.json) | **Modified** | Configuration | Added `jsonwebtoken` dependency. Configured test scripts and dev scripts. |
| [`test/auth.middleware.test.js`](test/auth.middleware.test.js) | **Created** | Automated Test | 6 unit tests covering token generation, valid verification, expired/tampered tokens, and missing Authorization headers. |
| [`test/validators.test.js`](test/validators.test.js) | **Created** | Automated Test | 18 unit tests covering all customer, account, and transaction validator functions. |
| [`test/services.test.js`](test/services.test.js) | **Created** | Automated Test | 10 unit tests covering domain business logic for customers, accounts, and transactions. |
| [`test/repositories.test.js`](test/repositories.test.js) | **Created** | Automated Test | 8 unit tests covering DynamoDB repository queries, point reads, updates, and transactions. |
| [`test/customers.test.js`](test/customers.test.js) | **Modified** | Automated Test | 9 unit tests updated with JWT authentication headers. |
| [`test/accounts.test.js`](test/accounts.test.js) | **Modified** | Automated Test | 13 unit tests updated with JWT authentication headers. |
| [`test/transactions.test.js`](test/transactions.test.js) | **Modified** | Automated Test | 15 unit tests updated with JWT authentication headers. |
| [`scripts/dev.js`](scripts/dev.js) | **Created** | Dev Experience | 1-command startup: auto-cleans stale ports (8000/3000/3002), starts local DynamoDB, seeds tables, and starts serverless-offline. |
| [`scripts/start-local-db.js`](scripts/start-local-db.js) | **Created** | Infrastructure | In-memory DynamoDB Local server powered by `dynalite` (no Docker required). |
| [`scripts/capture-all-screenshots.js`](scripts/capture-all-screenshots.js) | **Modified** | Verification / QA | Tests live unauthenticated 401 guards, fetches JWT token from `/auth/token`, tests all endpoints with Bearer token, and captures PNG screenshots. |
| [`scripts/generate-architecture-pdf.js`](scripts/generate-architecture-pdf.js) | **Updated** | Documentation | Automated PDF generator for this document via headless Edge/Chromium. |
| [`scripts/generate-interview-pdf.js`](scripts/generate-interview-pdf.js) | **Updated** | Interview Prep | Generates the candidate interview preparation PDF guide with detailed Q&A on the layered architecture. |
| [`screenshots/01_swagger_docs.png`](screenshots/01_swagger_docs.png) | **Updated** | Visual Proof | Screenshot of interactive Swagger UI showing all endpoints including `/auth/token` and Bearer auth. |
| [`screenshots/02_live_endpoints_verified.png`](screenshots/02_live_endpoints_verified.png) | **Updated** | Visual Proof | Screenshot of live test suite showing 401 unauthenticated guard, JWT token generation, and live execution. |
| [`screenshots/03_test_suite_passed.png`](screenshots/03_test_suite_passed.png) | **Updated** | Visual Proof | Screenshot of terminal showing all **79 automated tests passing across 26 test suites**. |

---

## 3. Deep Dive into the 4 Architecture Layers

### Layer 1: Middleware & Authentication (`src/middlewares/`)
- **`src/middlewares/auth.middleware.js`**:
  - `generateToken(payload)`: Signs JWT using `jsonwebtoken` with 2-hour expiration and `JWT_SECRET`.
  - `authenticate(event)`: Extracts `Authorization: Bearer <token>` from HTTP headers. Verifies token cryptographically. Throws `HttpError.unauthorized` on missing, malformed, or expired tokens.
  - `withAuth(handler)`: Higher-order function wrapping Lambda handlers. Handles auth rejection automatically, attaching `event.user` to the request context.
- **`src/handlers/auth.js`**:
  - `createToken(event)`: Public endpoint `POST /auth/token` for testing and API consumers to acquire valid tokens.

### Layer 2: Handlers / Controllers (`src/handlers/`)
Handlers act as thin controllers. They have zero direct database access and zero domain business rules:
1. Parse HTTP event headers and body (`parseJsonBody`).
2. Call validator functions (`validateCreateCustomer`, etc.).
3. Pass validated DTOs (Data Transfer Objects) to the corresponding Service (`customerService.createCustomer`, etc.).
4. Format service return values into HTTP response envelopes (`ok`, `created`).

### Layer 3: Validators (`src/validators/`)
Pure, exported validator functions that fail fast with descriptive 400 Bad Request errors:
- **`src/validators/customer.validator.js`**:
  - `validateCreateCustomer(body)`: Validates `fullName` (non-empty string) and `email` (RFC 5322 regex).
  - `validateCustomerId(id)`: Ensures `customerId` path parameter is non-empty.
- **`src/validators/account.validator.js`**:
  - `validateCreateAccount(body)`: Validates `type` (`CHECKING`, `SAVINGS`), `currency` (`CAD`, `USD`), and `initialBalance` ($\ge 0$, finite, $\le 2$ decimal places).
  - `validateCustomerIdParam(id)` & `validateAccountIdParam(id)`.
- **`src/validators/transaction.validator.js`**:
  - `validateDeposit(body)` & `validateWithdraw(body)`: Ensures `amount > 0`, $\le 2$ decimal places, and valid `currency`.
  - `validateTransfer(body)`: Validates `fromAccountId`, `toAccountId`, distinct accounts (`from !== to`), valid currency, and positive amount.

### Layer 4: Services (`src/services/`)
Houses domain business logic, orchestration, and business invariant checks:
- **`src/services/customer.service.js`**:
  - `createCustomer(dto)`: Assigns unique ID `cust_${uuidv4()}`, initial status `ACTIVE`, timestamp, and calls `customerRepository.create`.
  - `getCustomer(customerId)`: Calls repository; throws `HttpError.notFound` if null.
- **`src/services/account.service.js`**:
  - `createAccount(customerId, dto)`: Verifies customer exists first via `customerRepository.findById`, sets `OPEN` status and initial balance, and saves via `accountRepository.create`.
  - `listAccounts(customerId)`: Verifies customer existence first (returns 404 if missing, preventing silent empty lists for invalid IDs), then calls `accountRepository.findByCustomerId`.
  - `getAccount(accountId)`: Retrieves account with current balance; throws 404 if missing.
- **`src/services/transaction.service.js`**:
  - `deposit(accountId, dto)`: Verifies account exists, is `OPEN`, and currency matches. Calls repository `updateBalance(+amount)`.
  - `withdraw(accountId, dto)`: Verifies account exists, is `OPEN`, currency matches, and `balance >= amount` (throws 409 Conflict if insufficient). Calls repository `updateBalance(-amount)` with condition check.
  - `transfer(dto)`: Verifies both accounts exist, both are `OPEN`, currency matches between accounts and transfer payload, and source balance is sufficient. Calls repository `executeTransfer`.

### Layer 5: Repositories (`src/repositories/`)
Encapsulates all DynamoDB SDK commands and query execution:
- **`src/repositories/customer.repository.js`**:
  - `findById(customerId)` &rarr; `GetCommand`
  - `create(customerItem)` &rarr; `PutCommand`
  - `delete(customerId)` &rarr; `DeleteCommand`
- **`src/repositories/account.repository.js`**:
  - `findById(accountId)` &rarr; `GetCommand`
  - `create(accountItem)` &rarr; `PutCommand`
  - `findByCustomerId(customerId)` &rarr; `QueryCommand` targeting GSI `CustomerIdIndex` (`KeyConditionExpression: "customerId = :customerId"`)
  - `updateBalance(accountId, amount, ...)` &rarr; `UpdateCommand` (`SET balance = balance + :amount`)
  - `executeTransfer(...)` &rarr; `TransactWriteCommand` (`TransactWriteItems`) for cross-account atomicity, with resilient fallback.

---

## 4. Automated Testing Verification (79 Tests Passing)

The test suite was expanded from 37 to **79 tests across 26 test suites**, testing each architectural layer in isolation using `aws-sdk-client-mock`:

```
✔ Auth Middleware > generateToken & authenticate > generates a valid JWT token (0.7ms)
✔ Auth Middleware > generateToken & authenticate > successfully authenticates event with valid Bearer token (0.4ms)
✔ Auth Middleware > generateToken & authenticate > rejects event with missing Authorization header (0.7ms)
✔ Auth Middleware > generateToken & authenticate > rejects event with malformed Authorization header (0.3ms)
✔ Auth Middleware > generateToken & authenticate > rejects event with invalid token (0.3ms)
✔ Auth Middleware > withAuth wrapper > attaches decoded user to event and calls wrapped handler (0.4ms)
✔ Customer Validators > validateCreateCustomer > succeeds with valid payload (0.2ms)
✔ Customer Validators > validateCreateCustomer > rejects missing or empty fullName (0.2ms)
✔ Customer Validators > validateCreateCustomer > rejects invalid email formats (0.3ms)
✔ Account Validators > validateCreateAccount > succeeds with valid checking account (0.2ms)
✔ Account Validators > validateCreateAccount > rejects invalid account type (0.2ms)
✔ Account Validators > validateCreateAccount > rejects negative balance or fractional cents (0.3ms)
✔ Transaction Validators > validateTransfer > rejects self-transfers (0.2ms)
✔ Customer Service > createCustomer & getCustomer > generates customer with cust_ prefix (0.3ms)
✔ Account Service > listAccounts > queries customer accounts (0.3ms)
✔ Transaction Service > transfer > throws 409 when insufficient funds (0.3ms)
✔ Customer Repository > findById > sends GetCommand (0.4ms)
✔ Account Repository > findByCustomerId > queries CustomerIdIndex GSI (0.3ms)
✔ Customers Handlers > create > returns 201 Created (1.5ms)
✔ Accounts Handlers > list > returns 200 with accounts from GSI (1.2ms)
✔ Transactions Handlers > transfer > returns 200 with TransactWriteItems (1.5ms)
...
ℹ tests 79
ℹ suites 26
ℹ pass 79
ℹ fail 0
ℹ duration_ms 592
```

---

## 5. Summary Checklist of All Requirements Satisfied

- [x] **Service Layer Created**: `src/services/customer.service.js`, `src/services/account.service.js`, `src/services/transaction.service.js`.
- [x] **Repository Layer Created**: `src/repositories/customer.repository.js`, `src/repositories/account.repository.js` encapsulating all DynamoDB commands (`GetCommand`, `PutCommand`, `DeleteCommand`, `QueryCommand`, `UpdateCommand`, `TransactWriteCommand`).
- [x] **Validator Layer Created**: `src/validators/customer.validator.js`, `src/validators/account.validator.js`, `src/validators/transaction.validator.js` with pure exported validation functions.
- [x] **Handlers Refactored**: Handlers are pure controllers delegating HTTP requests to validators and services.
- [x] **JWT Middleware Implemented**: `src/middlewares/auth.middleware.js` with `withAuth` guarding every endpoint and checking Bearer tokens.
- [x] **Token Endpoint Added**: `POST /auth/token` implemented in `src/handlers/auth.js` and registered in `serverless.yml` and `openapi/openapi.yaml`.
- [x] **Automated Tests**: 79 tests passing across 26 test suites with 0 failures.
- [x] **Documentation & PDFs**: Architecture document and technical interview guide generated in Markdown, HTML, and high-resolution PDF formats.
