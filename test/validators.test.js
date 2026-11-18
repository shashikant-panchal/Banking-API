"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  validateCreateCustomer,
  validateCustomerId,
} = require("../src/validators/customer.validator");
const {
  validateCreateAccount,
  validateCustomerIdParam,
  validateAccountIdParam,
} = require("../src/validators/account.validator");
const {
  validateDeposit,
  validateWithdraw,
  validateTransfer,
} = require("../src/validators/transaction.validator");

describe("Validator Layer", () => {
  describe("Customer Validators", () => {
    test("validateCreateCustomer validates valid payload", () => {
      const event = {
        body: JSON.stringify({ fullName: "Ada Lovelace", email: "ada@example.com" }),
      };
      const res = validateCreateCustomer(event);
      assert.equal(res.valid, true);
      assert.equal(res.data.fullName, "Ada Lovelace");
      assert.equal(res.data.email, "ada@example.com");
    });

    test("validateCreateCustomer rejects empty fullName", () => {
      const event = {
        body: JSON.stringify({ fullName: "   ", email: "ada@example.com" }),
      };
      const res = validateCreateCustomer(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });

    test("validateCreateCustomer rejects invalid email", () => {
      const event = {
        body: JSON.stringify({ fullName: "Ada", email: "invalid-email" }),
      };
      const res = validateCreateCustomer(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });

    test("validateCustomerId extracts valid customerId", () => {
      const event = { pathParameters: { customerId: "cust_123" } };
      const res = validateCustomerId(event);
      assert.equal(res.valid, true);
      assert.equal(res.customerId, "cust_123");
    });

    test("validateCustomerId rejects missing customerId", () => {
      const res = validateCustomerId({});
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });
  });

  describe("Account Validators", () => {
    test("validateCreateAccount validates valid checking account", () => {
      const event = {
        pathParameters: { customerId: "cust_123" },
        body: JSON.stringify({ type: "CHECKING", currency: "CAD", initialBalance: 100 }),
      };
      const res = validateCreateAccount(event);
      assert.equal(res.valid, true);
      assert.equal(res.data.type, "CHECKING");
      assert.equal(res.data.currency, "CAD");
      assert.equal(res.data.initialBalance, 100);
    });

    test("validateCreateAccount rejects invalid account type", () => {
      const event = {
        pathParameters: { customerId: "cust_123" },
        body: JSON.stringify({ type: "INVESTMENT", currency: "CAD" }),
      };
      const res = validateCreateAccount(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });

    test("validateCreateAccount rejects invalid currency", () => {
      const event = {
        pathParameters: { customerId: "cust_123" },
        body: JSON.stringify({ type: "SAVINGS", currency: "EUR" }),
      };
      const res = validateCreateAccount(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });

    test("validateCreateAccount rejects fractional cents (>2 decimals)", () => {
      const event = {
        pathParameters: { customerId: "cust_123" },
        body: JSON.stringify({ type: "SAVINGS", currency: "USD", initialBalance: 10.999 }),
      };
      const res = validateCreateAccount(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });
  });

  describe("Transaction Validators", () => {
    test("validateDeposit validates valid deposit", () => {
      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: 50.5, currency: "CAD" }),
      };
      const res = validateDeposit(event);
      assert.equal(res.valid, true);
      assert.equal(res.data.amount, 50.5);
      assert.equal(res.data.currency, "CAD");
    });

    test("validateDeposit rejects negative amount", () => {
      const event = {
        pathParameters: { accountId: "acct_001" },
        body: JSON.stringify({ amount: -10, currency: "CAD" }),
      };
      const res = validateDeposit(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });

    test("validateTransfer validates valid transfer between two accounts", () => {
      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_002",
          amount: 25.0,
          currency: "CAD",
        }),
      };
      const res = validateTransfer(event);
      assert.equal(res.valid, true);
      assert.equal(res.data.fromAccountId, "acct_001");
      assert.equal(res.data.toAccountId, "acct_002");
    });

    test("validateTransfer rejects self-transfer", () => {
      const event = {
        body: JSON.stringify({
          fromAccountId: "acct_001",
          toAccountId: "acct_001",
          amount: 25.0,
          currency: "CAD",
        }),
      };
      const res = validateTransfer(event);
      assert.equal(res.valid, false);
      assert.equal(res.response.statusCode, 400);
    });
  });
});
