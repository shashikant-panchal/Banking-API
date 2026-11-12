"use strict";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const { docClient, TABLES } = require("../src/lib/dynamodb");
const customersHandler = require("../src/handlers/customers");

const ddbMock = mockClient(docClient);

describe("Customers Handler", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("POST /customers (create)", () => {
    test("successfully creates a customer with valid input", async () => {
      ddbMock.on(PutCommand).resolves({});

      const event = {
        body: JSON.stringify({
          fullName: "Grace Hopper",
          email: "grace@example.com",
        }),
      };

      const response = await customersHandler.create(event);
      assert.equal(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.customerId.startsWith("cust_"));
      assert.equal(body.fullName, "Grace Hopper");
      assert.equal(body.email, "grace@example.com");
      assert.equal(body.status, "ACTIVE");
      assert.ok(body.createdAt);

      // Verify DynamoDB PutCommand was invoked with correct TableName and Item
      const calls = ddbMock.commandCalls(PutCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.TableName, TABLES.customers);
      assert.equal(calls[0].args[0].input.Item.customerId, body.customerId);
    });

    test("returns 400 if fullName is missing", async () => {
      const event = {
        body: JSON.stringify({
          email: "grace@example.com",
        }),
      };

      const response = await customersHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("fullName"));
    });

    test("returns 400 if fullName is empty string", async () => {
      const event = {
        body: JSON.stringify({
          fullName: "   ",
          email: "grace@example.com",
        }),
      };

      const response = await customersHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });

    test("returns 400 if email is missing or invalid", async () => {
      const event = {
        body: JSON.stringify({
          fullName: "Grace Hopper",
          email: "not-an-email",
        }),
      };

      const response = await customersHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
      assert.ok(body.message.includes("email"));
    });

    test("returns 400 if body is missing", async () => {
      const event = {};
      const response = await customersHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });

    test("returns 400 if body is not valid JSON", async () => {
      const event = { body: "not-json" };
      const response = await customersHandler.create(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });
  });

  describe("GET /customers/{customerId} (get)", () => {
    test("successfully retrieves an existing customer", async () => {
      const existingCustomer = {
        customerId: "cust_001",
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      ddbMock.on(GetCommand, {
        TableName: TABLES.customers,
        Key: { customerId: "cust_001" },
      }).resolves({
        Item: existingCustomer,
      });

      const event = {
        pathParameters: { customerId: "cust_001" },
      };

      const response = await customersHandler.get(event);
      assert.equal(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.deepEqual(body, existingCustomer);
    });

    test("returns 404 when customer is not found", async () => {
      ddbMock.on(GetCommand).resolves({});

      const event = {
        pathParameters: { customerId: "cust_999" },
      };

      const response = await customersHandler.get(event);
      assert.equal(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "NOT_FOUND");
    });

    test("returns 400 when customerId path param is missing", async () => {
      const event = { pathParameters: {} };
      const response = await customersHandler.get(event);
      assert.equal(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "BAD_REQUEST");
    });
  });
});

