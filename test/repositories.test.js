"use strict";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { mockClient } = require("aws-sdk-client-mock");
const {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");

const { docClient, TABLES } = require("../src/lib/dynamodb");
const customerRepo = require("../src/repositories/customer.repository");
const accountRepo = require("../src/repositories/account.repository");

const ddbMock = mockClient(docClient);

describe("Repository Layer", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("CustomerRepository", () => {
    test("findById calls GetCommand with customerId", async () => {
      const mockCustomer = { customerId: "cust_001", fullName: "Ada" };
      ddbMock.on(GetCommand).resolves({ Item: mockCustomer });

      const res = await customerRepo.findById("cust_001");
      assert.deepEqual(res, mockCustomer);

      const calls = ddbMock.commandCalls(GetCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.TableName, TABLES.customers);
      assert.equal(calls[0].args[0].input.Key.customerId, "cust_001");
    });

    test("create calls PutCommand with item", async () => {
      ddbMock.on(PutCommand).resolves({});
      const newCustomer = { customerId: "cust_123", fullName: "Grace" };

      const res = await customerRepo.create(newCustomer);
      assert.deepEqual(res, newCustomer);

      const calls = ddbMock.commandCalls(PutCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.Item.customerId, "cust_123");
    });
  });

  describe("AccountRepository", () => {
    test("findByCustomerId queries CustomerIdIndex GSI", async () => {
      const accounts = [{ accountId: "acct_001", customerId: "cust_001" }];
      ddbMock.on(QueryCommand).resolves({ Items: accounts });

      const res = await accountRepo.findByCustomerId("cust_001");
      assert.deepEqual(res, accounts);

      const calls = ddbMock.commandCalls(QueryCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.IndexName, "CustomerIdIndex");
      assert.equal(calls[0].args[0].input.ExpressionAttributeValues[":customerId"], "cust_001");
    });

    test("updateBalance issues UpdateCommand with correct expressions", async () => {
      const updated = { accountId: "acct_001", balance: 150 };
      ddbMock.on(UpdateCommand).resolves({ Attributes: updated });

      const res = await accountRepo.updateBalance("acct_001", 50, { currency: "CAD" });
      assert.deepEqual(res, updated);

      const calls = ddbMock.commandCalls(UpdateCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.ExpressionAttributeValues[":amount"], 50);
    });

    test("executeTransfer issues TransactWriteCommand with 2 items", async () => {
      ddbMock.on(TransactWriteCommand).resolves({});
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: { accountId: "acct_001", balance: 50 } })
        .resolvesOnce({ Item: { accountId: "acct_002", balance: 150 } });

      const res = await accountRepo.executeTransfer("acct_001", "acct_002", 50, "CAD");
      assert.equal(res.fromAccount.balance, 50);
      assert.equal(res.toAccount.balance, 150);

      const calls = ddbMock.commandCalls(TransactWriteCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.TransactItems.length, 2);
    });
  });
});
