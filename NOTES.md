# Banking API Assessment — Implementation Notes

## Overview

This repository implements the Banking REST API following the **API Gateway → Lambda → DynamoDB** pattern, conforming strictly to the provided [OpenAPI 3.0.3 specification](openapi/openapi.yaml).

All core requirements and stretch goals have been implemented and validated with 37 automated tests:
- **Core CRUD**:
  - `POST /customers` — Create customer (`201`)
  - `GET /customers/{customerId}` — Get customer by id (`200` / `404`)
  - `POST /customers/{customerId}/accounts` — Create customer account (`201` / `400` / `404`)
  - `GET /customers/{customerId}/accounts` — List accounts by customer via GSI Query (`200` / `404`)
  - `GET /accounts/{accountId}` — Get account details including balance (`200` / `404`)
- **Stretch Goals (Mid / Senior)**:
  - `POST /accounts/{accountId}/deposits` — Atomic deposit (`200` / `400` / `404`)
  - `POST /accounts/{accountId}/withdrawals` — Atomic withdrawal with overdraft guard (`200` / `400` / `404` / `409`)
  - `POST /transfers` — Atomic inter-account transfer using DynamoDB ACID transactions (`200` / `400` / `404` / `409`)

---

## Screenshots & Visual Proofs

High-resolution screenshots are provided in the `screenshots/` directory:
- **`screenshots/01_swagger_docs.png`**: Swagger UI documentation rendered from `openapi/openapi.yaml` on `http://localhost:3000/docs`.
- **`screenshots/02_live_endpoints_verified.png`**: Complete end-to-end execution of all 9 operations against the live API on `http://localhost:3000` (Customer CRUD, Account listing via GSI Query, Deposits, Withdrawals, Atomic Transfers, and 409 Conflict overdraft guard).
- **`screenshots/03_test_suite_passed.png`**: Terminal test runner output verifying all 37 unit tests passing across 11 test suites with 0 failures.

---

## DynamoDB Access Patterns

| Entity / Operation | Target | Command | Key Condition / Key | Notes |
|---|---|---|---|---|
| **Create Customer** | `Customers` | `PutCommand` | Partition Key `customerId` | Generates unique `cust_<uuid>`, status `ACTIVE`, ISO timestamp |
| **Get Customer** | `Customers` | `GetCommand` | `customerId` | Direct point read (O(1)) |
| **Create Account** | `Accounts` | `PutCommand` | Partition Key `accountId` | Verifies customer exists first; includes `customerId` attribute for GSI |
| **List Customer Accounts** | `Accounts` | `QueryCommand` | GSI `CustomerIdIndex` (`customerId = :customerId`) | Uses `Query` on the Global Secondary Index (projection ALL), strictly avoiding costly `Scan` operations |
| **Get Account** | `Accounts` | `GetCommand` | `accountId` | Direct point read (O(1)) returning current balance and status |
| **Deposit** | `Accounts` | `UpdateCommand` | `accountId` | Atomic `SET balance = balance + :amount` conditioned on account existence, `OPEN` status, and matching currency |
| **Withdrawal** | `Accounts` | `UpdateCommand` | `accountId` | Atomic `SET balance = balance - :amount` conditioned on `balance >= :amount`, `OPEN` status, and currency |
| **Transfer** | `Accounts` | `TransactWriteCommand` | `fromAccountId`, `toAccountId` | Atomic multi-item transaction executing debit and credit together |

---

## Consistency and Partial Failure Approach (Transfers)

In a distributed financial system, handling partial failure during fund transfers is critical. If debit succeeds but credit fails (network timeout, system crash, or validation failure), money vanishes. Conversely, if credit succeeds but debit fails, money is created.

### Approach: DynamoDB `TransactWriteItems`

We use DynamoDB's native ACID transaction mechanism via `TransactWriteCommand`:

1. **Pre-flight Checks**:
   - Both source and destination accounts are fetched and validated (must exist, must be in `OPEN` status, and both must match the transfer currency).
   - Rejects transfer to the same account (`400 BAD_REQUEST`).
   - Preliminary check that `fromAccount.balance >= amount` (`409 CONFLICT`).

2. **All-or-Nothing Atomic Execution**:
   - Both balance operations (debiting `fromAccountId` and crediting `toAccountId`) are bundled into a single `TransactWriteItems` request.
   - The debit operation includes `ConditionExpression: "balance >= :amount AND #status = :openStatus AND currency = :currency"`.
   - The credit operation includes `ConditionExpression: "attribute_exists(accountId) AND #status = :openStatus AND currency = :currency"`.
   - If either condition fails, the entire transaction is cancelled and rolled back automatically by DynamoDB. No partial state is ever written.

3. **Concurrency & Race Conditions**:
   - If a concurrent withdrawal or transfer reduces the source account balance before this transaction executes, DynamoDB throws `TransactionCanceledException` (or `ConditionalCheckFailedException`).
   - The handler intercepts this exception and returns a clean `409 CONFLICT` (`Transfer failed: insufficient funds or account state changed concurrently`).

4. **Production Idempotency Note**:
   - In a production environment with public API consumers, an `Idempotency-Key` header or `ClientRequestToken` can be passed to `TransactWriteItems` to prevent duplicate transfers on retried HTTP requests.

---

## Input Validation & Precision Design

- **Status Code & Error Shape Contract**: All errors strictly follow `{ error, message }` conforming to `BadRequest`, `NotFound`, and `Conflict` schemas.
- **Monetary Precision**: All transaction amounts and initial balances are validated to be positive finite numbers with at most 2 decimal places (`cents`), preventing IEEE-754 floating-point irregularities and fractional-cent exploits.
- **Status Checks**: Inactive or closed accounts are barred from deposits, withdrawals, and transfers.

---

## Automated Test Suite

A comprehensive test suite was implemented using Node's native `node:test` and `node:assert` modules alongside `aws-sdk-client-mock`:

```bash
npm test
```

### Test Coverage Summary:
- **`test/customers.test.js`**:
  - Customer creation with valid payload
  - Rejection of missing / whitespace-only fullName (`400`)
  - Rejection of missing / malformed email (`400`)
  - Rejection of missing / non-JSON bodies (`400`)
  - Retrieval of customer by ID (`200`)
  - Non-existent customer handling (`404`)
  - Missing path parameter validation (`400`)
- **`test/accounts.test.js`**:
  - Account creation with default `initialBalance = 0` (`201`)
  - Account creation with explicit `initialBalance` (`201`)
  - Non-existent customer rejection (`404`)
  - Invalid account type / currency validation (`400`)
  - Negative and fractional-cent initialBalance validation (`400`)
  - Listing accounts via GSI `CustomerIdIndex` (`200`)
  - Non-existent customer handling on list (`404`)
  - Direct account retrieval by ID (`200` / `404`)
- **`test/transactions.test.js`**:
  - Deposit with balance increment (`200`)
  - Non-existent account deposit (`404`)
  - Currency mismatch deposit rejection (`400`)
  - Closed account deposit rejection (`400`)
  - Withdrawal with balance decrement (`200`)
  - Insufficient funds withdrawal rejection (`409`)
  - Concurrent withdrawal collision handling (`409`)
  - Atomic transfer execution (`200`)
  - Self-transfer rejection (`400`)
  - Non-existent source/destination handling (`404`)
  - Insufficient funds transfer rejection (`409`)
  - Currency mismatch transfer rejection (`400`)
  - Transaction cancellation / concurrency race collision (`409`)

**Result**: 37 tests, 11 test suites, 0 failures.

---

## Demo & Verification Commands

Once running (`npm run setup` and `npm start`):

### 1. Customers
```bash
# Create customer
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Katherine Johnson", "email": "katherine@nasa.gov"}'

# Get customer
curl http://localhost:3000/customers/cust_001
```

### 2. Accounts
```bash
# Create account for cust_001
curl -X POST http://localhost:3000/customers/cust_001/accounts \
  -H "Content-Type: application/json" \
  -d '{"type": "CHECKING", "currency": "CAD", "initialBalance": 100.0}'

# List accounts for cust_001
curl http://localhost:3000/customers/cust_001/accounts

# Get specific account
curl http://localhost:3000/accounts/acct_001
```

### 3. Deposits & Withdrawals
```bash
# Deposit 50 CAD into acct_001
curl -X POST http://localhost:3000/accounts/acct_001/deposits \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.0, "currency": "CAD"}'

# Withdraw 25 CAD from acct_001
curl -X POST http://localhost:3000/accounts/acct_001/withdrawals \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.0, "currency": "CAD"}'
```

### 4. Transfers
```bash
# Transfer 20 CAD from acct_001 to acct_002
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{"fromAccountId": "acct_001", "toAccountId": "acct_002", "amount": 20.0, "currency": "CAD"}'
```

