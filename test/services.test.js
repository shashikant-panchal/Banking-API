"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { CustomerService } = require("../src/services/customer.service");
const { AccountService } = require("../src/services/account.service");
const { TransactionService } = require("../src/services/transaction.service");

describe("Service Layer", () => {
  describe("CustomerService", () => {
    test("createCustomer builds customer and calls repo create", async () => {
      let createdItem = null;
      const mockRepo = {
        create: async (item) => {
          createdItem = item;
          return item;
        },
      };

      const service = new CustomerService(mockRepo);
      const res = await service.createCustomer({
        fullName: "Alan Turing",
        email: "alan@example.com",
      });

      assert.equal(res.fullName, "Alan Turing");
      assert.equal(res.email, "alan@example.com");
      assert.ok(res.customerId.startsWith("cust_"));
      assert.equal(res.status, "ACTIVE");
      assert.deepEqual(createdItem, res);
    });

    test("getCustomer throws 404 if customer not found", async () => {
      const mockRepo = {
        findById: async () => null,
      };

      const service = new CustomerService(mockRepo);
      await assert.rejects(
        () => service.getCustomer("cust_missing"),
        (err) => err.statusCode === 404 && err.error === "NOT_FOUND"
      );
    });
  });

  describe("AccountService", () => {
    test("createAccount throws 404 if parent customer does not exist", async () => {
      const mockCustomerRepo = { findById: async () => null };
      const mockAccountRepo = { create: async (item) => item };

      const service = new AccountService(mockAccountRepo, mockCustomerRepo);
      await assert.rejects(
        () => service.createAccount({ customerId: "cust_999", type: "CHECKING", currency: "CAD" }),
        (err) => err.statusCode === 404
      );
    });

    test("createAccount creates account if customer exists", async () => {
      const mockCustomerRepo = { findById: async () => ({ customerId: "cust_001" }) };
      const mockAccountRepo = { create: async (item) => item };

      const service = new AccountService(mockAccountRepo, mockCustomerRepo);
      const account = await service.createAccount({
        customerId: "cust_001",
        type: "SAVINGS",
        currency: "USD",
        initialBalance: 200,
      });

      assert.ok(account.accountId.startsWith("acct_"));
      assert.equal(account.customerId, "cust_001");
      assert.equal(account.balance, 200);
      assert.equal(account.status, "OPEN");
    });

    test("listAccounts throws 404 if customer does not exist", async () => {
      const mockCustomerRepo = { findById: async () => null };
      const mockAccountRepo = { findByCustomerId: async () => [] };

      const service = new AccountService(mockAccountRepo, mockCustomerRepo);
      await assert.rejects(
        () => service.listAccounts("cust_nonexistent"),
        (err) => err.statusCode === 404
      );
    });
  });

  describe("TransactionService", () => {
    test("deposit throws 404 if account not found", async () => {
      const mockRepo = { findById: async () => null };
      const service = new TransactionService(mockRepo);

      await assert.rejects(
        () => service.deposit({ accountId: "acct_999", amount: 50, currency: "CAD" }),
        (err) => err.statusCode === 404
      );
    });

    test("deposit throws 400 if currency mismatch", async () => {
      const mockRepo = {
        findById: async () => ({ accountId: "acct_001", currency: "CAD", status: "OPEN" }),
      };
      const service = new TransactionService(mockRepo);

      await assert.rejects(
        () => service.deposit({ accountId: "acct_001", amount: 50, currency: "USD" }),
        (err) => err.statusCode === 400 && err.message.includes("Currency mismatch")
      );
    });

    test("withdraw throws 409 on insufficient funds", async () => {
      const mockRepo = {
        findById: async () => ({
          accountId: "acct_001",
          currency: "CAD",
          status: "OPEN",
          balance: 10,
        }),
      };
      const service = new TransactionService(mockRepo);

      await assert.rejects(
        () => service.withdraw({ accountId: "acct_001", amount: 50, currency: "CAD" }),
        (err) => err.statusCode === 409 && err.message.includes("Insufficient funds")
      );
    });

    test("transfer throws 409 if source account has insufficient funds", async () => {
      const mockRepo = {
        findById: async (id) => {
          if (id === "acct_001") return { accountId: "acct_001", currency: "CAD", status: "OPEN", balance: 10 };
          if (id === "acct_002") return { accountId: "acct_002", currency: "CAD", status: "OPEN", balance: 50 };
          return null;
        },
      };
      const service = new TransactionService(mockRepo);

      await assert.rejects(
        () => service.transfer({ fromAccountId: "acct_001", toAccountId: "acct_002", amount: 50, currency: "CAD" }),
        (err) => err.statusCode === 409
      );
    });
  });
});
