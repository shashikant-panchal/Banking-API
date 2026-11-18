"use strict";

const { badRequest, parseJsonBody } = require("../lib/response");

const VALID_ACCOUNT_TYPES = new Set(["CHECKING", "SAVINGS"]);
const VALID_CURRENCIES = new Set(["CAD", "USD"]);

/**
 * Validate customerId path parameter for account operations.
 *
 * @param {object} event
 * @returns {{ valid: true, customerId: string } | { valid: false, response: object }}
 */
function validateCustomerIdParam(event) {
  const customerId = event?.pathParameters?.customerId;
  if (!customerId || customerId.trim().length === 0) {
    return {
      valid: false,
      response: badRequest("customerId path parameter is required"),
    };
  }
  return { valid: true, customerId: customerId.trim() };
}

/**
 * Validate accountId path parameter.
 *
 * @param {object} event
 * @returns {{ valid: true, accountId: string } | { valid: false, response: object }}
 */
function validateAccountIdParam(event) {
  const accountId = event?.pathParameters?.accountId;
  if (!accountId || accountId.trim().length === 0) {
    return {
      valid: false,
      response: badRequest("accountId path parameter is required"),
    };
  }
  return { valid: true, accountId: accountId.trim() };
}

/**
 * Validate create account request body and path parameter.
 *
 * @param {object} event
 * @returns {{ valid: true, data: object } | { valid: false, response: object }}
 */
function validateCreateAccount(event) {
  const customerCheck = validateCustomerIdParam(event);
  if (!customerCheck.valid) {
    return customerCheck;
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return { valid: false, response: parsed.response };
  }

  const { type, currency, initialBalance } = parsed.data;

  if (!type || !VALID_ACCOUNT_TYPES.has(type)) {
    return {
      valid: false,
      response: badRequest("type must be CHECKING or SAVINGS"),
    };
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return {
      valid: false,
      response: badRequest("currency must be CAD or USD"),
    };
  }

  let balance = 0;
  if (initialBalance !== undefined) {
    if (
      typeof initialBalance !== "number" ||
      !Number.isFinite(initialBalance) ||
      initialBalance < 0
    ) {
      return {
        valid: false,
        response: badRequest("initialBalance must be a non-negative number"),
      };
    }
    if (Number(initialBalance.toFixed(2)) !== initialBalance) {
      return {
        valid: false,
        response: badRequest("initialBalance cannot have more than 2 decimal places"),
      };
    }
    balance = initialBalance;
  }

  return {
    valid: true,
    data: {
      customerId: customerCheck.customerId,
      type,
      currency,
      initialBalance: balance,
    },
  };
}

module.exports = {
  validateCustomerIdParam,
  validateAccountIdParam,
  validateCreateAccount,
  VALID_ACCOUNT_TYPES,
  VALID_CURRENCIES,
};
