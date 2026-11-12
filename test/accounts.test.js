"use strict";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { mockClient } = require("aws-sdk-client-mock");
const { GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const { docClient, TABLES } = require("../src/lib/dynamodb");
const accountsHandler = require("../src/handlers/accounts");

const ddbMock = mockClient(docClient);

describe("Accounts Handler", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("POST /customers/{customerId}/accounts (create)", () => {
    test("successfully creates an account with default initialBalance of 0", async () => {
      // Mock customer exists
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.customers,
          Key: { customerId: "cust_001" },
        })
        .resolves({
          Item: { customerId: "cust_001", fullName: "Ada", status: "ACTIVE" },
        });

      ddbMock.on(PutCommand).resolves({});

      const event = {
        pathParameters: { customerId: "cust_001" },
        body: JSON.stringify({
          type: "CHECKING",
          currency: "CAD",
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.accountId.startsWith("acct_"));
      assert.equal(body.customerId, "cust_001");
      assert.equal(body.type, "CHECKING");
      assert.equal(body.currency, "CAD");
      assert.equal(body.balance, 0);
      assert.equal(body.status, "OPEN");
      assert.ok(body.createdAt);

      // Verify PutCommand payload
      const putCalls = ddbMock.commandCalls(PutCommand);
      assert.equal(putCalls.length, 1);
      assert.equal(putCalls[0].args[0].input.TableName, TABLES.accounts);
      assert.equal(putCalls[0].args[0].input.Item.accountId, body.accountId);
      assert.equal(putCalls[0].args[0].input.Item.customerId, "cust_001");
    });

    test("successfully creates an account with custom initialBalance", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.customers,
          Key: { customerId: "cust_001" },
        })
        .resolves({
          Item: { customerId: "cust_001", fullName: "Ada", status: "ACTIVE" },
        });

      ddbMock.on(PutCommand).resolves({});

      const event = {
        pathParameters: { customerId: "cust_001" },
        body: JSON.stringify({
          type: "SAVINGS",
          currency: "USD",
          initialBalance: 250.5,
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.equal(body.balance, 250.5);
      assert.equal(body.type, "SAVINGS");
      assert.equal(body.currency, "USD");
    });

    test("returns 404 when customer does not exist", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.customers,
          Key: { customerId: "cust_nonexistent" },
        })
        .resolves({});

      const event = {
        pathParameters: { customerId: "cust_nonexistent" },
        body: JSON.stringify({
          type: "CHECKING",
          currency: "CAD",
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });

    test("returns 400 for invalid account type", async () => {
      const event = {
        pathParameters: { customerId: "cust_001" },
        body: JSON.stringify({
          type: "INVALID_TYPE",
          currency: "CAD",
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("type"));
    });

    test("returns 400 for invalid currency", async () => {
      const event = {
        pathParameters: { customerId: "cust_001" },
        body: JSON.stringify({
          type: "CHECKING",
          currency: "EUR",
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("currency"));
    });

    test("returns 400 for negative initialBalance", async () => {
      const event = {
        pathParameters: { customerId: "cust_001" },
        body: JSON.stringify({
          type: "CHECKING",
          currency: "CAD",
          initialBalance: -50,
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("initialBalance"));
    });

    test("returns 400 for initialBalance with more than 2 decimal places", async () => {
      const event = {
        pathParameters: { customerId: "cust_001" },
        body: JSON.stringify({
          type: "CHECKING",
          currency: "CAD",
          initialBalance: 50.125,
        }),
      };

      const response = await accountsHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });
  });

  describe("GET /customers/{customerId}/accounts (list)", () => {
    test("successfully queries accounts using CustomerIdIndex GSI", async () => {
      // Customer exists
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.customers,
          Key: { customerId: "cust_001" },
        })
        .resolves({
          Item: { customerId: "cust_001", fullName: "Ada" },
        });

      const accounts = [
        {
          accountId: "acct_001",
          customerId: "cust_001",
          type: "CHECKING",
          currency: "CAD",
          balance: 250,
          status: "OPEN",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          accountId: "acct_002",
          customerId: "cust_001",
          type: "SAVINGS",
          currency: "CAD",
          balance: 1000,
          status: "OPEN",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ];

      ddbMock
        .on(QueryCommand, {
          TableName: TABLES.accounts,
          IndexName: "CustomerIdIndex",
          KeyConditionExpression: "customerId = :customerId",
        })
        .resolves({
          Items: accounts,
        });

      const event = {
        pathParameters: { customerId: "cust_001" },
      };

      const response = await accountsHandler.list(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.deepEqual(body, { items: accounts });

      // Verify QueryCommand parameters (GSI was queried, not Scan)
      const queryCalls = ddbMock.commandCalls(QueryCommand);
      assert.equal(queryCalls.length, 1);
      assert.equal(queryCalls[0].args[0].input.IndexName, "CustomerIdIndex");
      assert.equal(queryCalls[0].args[0].input.ExpressionAttributeValues[":customerId"], "cust_001");
    });

    test("returns empty items array when customer has no accounts", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.customers,
          Key: { customerId: "cust_001" },
        })
        .resolves({
          Item: { customerId: "cust_001", fullName: "Ada" },
        });

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const event = {
        pathParameters: { customerId: "cust_001" },
      };

      const response = await accountsHandler.list(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.deepEqual(body, { items: [] });
    });

    test("returns 404 if customer does not exist when listing accounts", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: TABLES.customers,
          Key: { customerId: "cust_nonexistent" },
        })
        .resolves({});

      const event = {
        pathParameters: { customerId: "cust_nonexistent" },
      };

      const response = await accountsHandler.list(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });
  });

  describe("GET /accounts/{accountId} (get)", () => {
    test("successfully retrieves an account including its balance", async () => {
      const existingAccount = {
        accountId: "acct_001",
        customerId: "cust_001",
        type: "CHECKING",
        currency: "CAD",
        balance: 250.0,
        status: "OPEN",
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      ddbMock
        .on(GetCommand, {
          TableName: TABLES.accounts,
          Key: { accountId: "acct_001" },
        })
        .resolves({
          Item: existingAccount,
        });

      const event = {
        pathParameters: { accountId: "acct_001" },
      };

      const response = await accountsHandler.get(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.deepEqual(body, existingAccount);
      assert.equal(body.balance, 250.0);
    });

    test("returns 404 when account is not found", async () => {
      ddbMock.on(GetCommand).resolves({});

      const event = {
        pathParameters: { accountId: "acct_999" },
      };

      const response = await accountsHandler.get(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });

    test("returns 400 when accountId path param is missing", async () => {
      const event = { pathParameters: {} };
      const response = await accountsHandler.get(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });
  });
});

