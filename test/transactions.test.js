"use strict";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { mockClient } = require("aws-sdk-client-mock");
const {
  GetCommand,
  UpdateCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");

const { docClient, TABLES } = require("../src/lib/dynamodb");
const transactionsHandler = require("../src/handlers/transactions");

const ddbMock = mockClient(docClient);

describe("Transactions Handler", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("POST /accounts/{accountId}/deposits (deposit)", () => {
    test("successfully deposits into account and returns updated account", async () => {
      const existing = {
        accountId: "acct_001",
        customerId: "cust_001",
        type: "CHECKING",
        currency: "CAD",
        balance: 100.0,
        status: "OPEN",
      };

      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({ Item: existing });

      const updated = { ...existing, balance: 150.0 };
      ddbMock.on(UpdateCommand).resolves({ Attributes: updated });

      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 50.0, currency: "CAD" }),
      };

      const response = await transactionsHandler.deposit(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.equal(body.balance, 150.0);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      assert.equal(updateCalls.length, 1);
      assert.equal(updateCalls[0].args[0].input.ExpressionAttributeValues[":amount"], 50.0);
    });

    test("returns 404 if account not found", async () => {
      ddbMock.on(GetCommand).resolves({});

      const event = {
        pathParameters: { accountId: "acct_999" },
        body: JSON.stringify({ amount: 50.0, currency: "CAD" }),
      };

      const response = await transactionsHandler.deposit(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });

    test("returns 400 if amount <= 0", async () => {
      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: -10, currency: "CAD" }),
      };

      const response = await transactionsHandler.deposit(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });

    test("returns 400 if currency does not match account currency", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({
          Item: {
            accountId: "acct_001",
            currency: "CAD",
            balance: 100,
            status: "OPEN",
          },
        });

      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 50, currency: "USD" }),
      };

      const response = await transactionsHandler.deposit(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("Currency mismatch"));
    });

    test("returns 400 if account is not OPEN", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({
          Item: {
            accountId: "acct_001",
            currency: "CAD",
            balance: 100,
            status: "CLOSED",
          },
        });

      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 50, currency: "CAD" }),
      };

      const response = await transactionsHandler.deposit(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("not open"));
    });
  });

  describe("POST /accounts/{accountId}/withdrawals (withdraw)", () => {
    test("successfully withdraws and returns updated account", async () => {
      const existing = {
        accountId: "acct_001",
        currency: "CAD",
        balance: 100.0,
        status: "OPEN",
      };

      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({ Item: existing });

      const updated = { ...existing, balance: 75.0 };
      ddbMock.on(UpdateCommand).resolves({ Attributes: updated });

      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 25.0, currency: "CAD" }),
      };

      const response = await transactionsHandler.withdraw(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.equal(body.balance, 75.0);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      assert.equal(updateCalls.length, 1);
      assert.equal(updateCalls[0].args[0].input.ExpressionAttributeValues[":amount"], 25.0);
    });

    test("returns 409 on insufficient funds", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({
          Item: {
            accountId: "acct_001",
            currency: "CAD",
            balance: 20.0,
            status: "OPEN",
          },
        });

      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 50.0, currency: "CAD" }),
      };

      const response = await transactionsHandler.withdraw(event);
      assert.equal(response.statusCode, 409);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "CONFLICT");
      assert.ok(body.message.includes("Insufficient funds"));
    });

    test("returns 409 when ConditionalCheckFailedException is thrown (race condition)", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({
          Item: {
            accountId: "acct_001",
            currency: "CAD",
            balance: 100.0,
            status: "OPEN",
          },
        });

      const err = new Error("Condition check failed");
      err.name = "ConditionalCheckFailedException";
      ddbMock.on(UpdateCommand).rejects(err);

      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 50.0, currency: "CAD" }),
      };

      const response = await transactionsHandler.withdraw(event);
      assert.equal(response.statusCode, 409);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "CONFLICT");
    });

    test("returns 404 if account not found", async () => {
      ddbMock.on(GetCommand).resolves({});

      const event = {
        pathParameters: { accountId: "acct_999" },
        body: JSON.stringify({ amount: 25.0, currency: "CAD" }),
      };

      const response = await transactionsHandler.withdraw(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });
  });

  describe("POST /transfers (transfer)", () => {
    test("successfully transfers funds atomically between accounts", async () => {
      const fromAcct = {
        accountId: "acct_001",
        customerId: "cust_001",
        type: "CHECKING",
        currency: "CAD",
        balance: 200.0,
        status: "OPEN",
      };

      const toAcct = {
        accountId: "acct_002",
        customerId: "cust_001",
        type: "SAVINGS",
        currency: "CAD",
        balance: 50.0,
        status: "OPEN",
      };

      // Mock initial read
      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_001" } })
        .resolvesOnce({ Item: fromAcct })
        .resolvesOnce({ Item: { ...fromAcct, balance: 150.0 } }); // Post-tx read

      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_002" } })
        .resolvesOnce({ Item: toAcct })
        .resolvesOnce({ Item: { ...toAcct, balance: 100.0 } }); // Post-tx read

      ddbMock.on(TransactWriteCommand).resolves({});

      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_002",
          amount: 50.0,
          currency: "CAD",
        }),
      };

      const response = await transactionsHandler.transfer(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.equal(body.fromAccount.balance, 150.0);
      assert.equal(body.toAccount.balance, 100.0);

      // Verify TransactWriteCommand was called with two updates
      const txCalls = ddbMock.commandCalls(TransactWriteCommand);
      assert.equal(txCalls.length, 1);
      const items = txCalls[0].args[0].input.TransactItems;
      assert.equal(items.length, 2);
      assert.equal(items[0].Update.Key.accountId, "acct_001");
      assert.equal(items[1].Update.Key.accountId, "acct_002");
    });

    test("returns 400 when transferring to the same account", async () => {
      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_001",
          amount: 50.0,
          currency: "CAD",
        }),
      };

      const response = await transactionsHandler.transfer(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("same account"));
    });

    test("returns 404 when source account not found", async () => {
      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_001" } })
        .resolves({});
      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_002" } })
        .resolves({ Item: { accountId: "acct_002", status: "OPEN", currency: "CAD" } });

      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_002",
          amount: 50.0,
          currency: "CAD",
        }),
      };

      const response = await transactionsHandler.transfer(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });

    test("returns 409 when source account has insufficient funds", async () => {
      const fromAcct = {
        accountId: "acct_001",
        currency: "CAD",
        balance: 20.0,
        status: "OPEN",
      };

      const toAcct = {
        accountId: "acct_002",
        currency: "CAD",
        balance: 50.0,
        status: "OPEN",
      };

      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_001" } })
        .resolves({ Item: fromAcct });
      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_002" } })
        .resolves({ Item: toAcct });

      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_002",
          amount: 50.0,
          currency: "CAD",
        }),
      };

      const response = await transactionsHandler.transfer(event);
      assert.equal(response.statusCode, 409);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "CONFLICT");
      assert.ok(body.message.includes("Insufficient funds"));
    });

    test("returns 400 when currencies do not match", async () => {
      const fromAcct = {
        accountId: "acct_001",
        currency: "CAD",
        balance: 200.0,
        status: "OPEN",
      };

      const toAcct = {
        accountId: "acct_002",
        currency: "USD",
        balance: 50.0,
        status: "OPEN",
      };

      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_001" } })
        .resolves({ Item: fromAcct });
      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_002" } })
        .resolves({ Item: toAcct });

      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_002",
          amount: 50.0,
          currency: "CAD",
        }),
      };

      const response = await transactionsHandler.transfer(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("Currency mismatch"));
    });

    test("returns 409 when TransactionCanceledException occurs (concurrency collision)", async () => {
      const fromAcct = {
        accountId: "acct_001",
        currency: "CAD",
        balance: 200.0,
        status: "OPEN",
      };

      const toAcct = {
        accountId: "acct_002",
        currency: "CAD",
        balance: 50.0,
        status: "OPEN",
      };

      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_001" } })
        .resolves({ Item: fromAcct });
      ddbMock
        .on(GetCommand, { TableName: TABLES.accounts, Key: { accountId: "acct_002" } })
        .resolves({ Item: toAcct });

      const txError = new Error("Transaction cancelled");
      txError.name = "TransactionCanceledException";
      ddbMock.on(TransactWriteCommand).rejects(txError);

      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_002",
          amount: 50.0,
          currency: "CAD",
        }),
      };

      const response = await transactionsHandler.transfer(event);
      assert.equal(response.statusCode, 409);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "CONFLICT");
    });
  });
});

