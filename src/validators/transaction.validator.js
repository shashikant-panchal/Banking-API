"use strict";

const { badRequest, parseJsonBody } = require("../lib/response");
const { validateAccountIdParam, VALID_CURRENCIES } = require("./account.validator");

/**
 * Validate amount and currency for deposits.
 *
 * @param {object} event
 * @returns {{ valid: true, data: object } | { valid: false, response: object }}
 */
function validateDeposit(event) {
  const accountCheck = validateAccountIdParam(event);
  if (!accountCheck.valid) {
    return accountCheck;
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return { valid: false, response: parsed.response };
  }

  const { amount, currency } = parsed.data;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      response: badRequest("amount must be a positive number"),
    };
  }
  if (Number(amount.toFixed(2)) !== amount) {
    return {
      valid: false,
      response: badRequest("amount cannot have more than 2 decimal places"),
    };
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return {
      valid: false,
      response: badRequest("currency must be CAD or USD"),
    };
  }

  return {
    valid: true,
    data: {
      accountId: accountCheck.accountId,
      amount,
      currency,
    },
  };
}

/**
 * Validate amount and currency for withdrawals.
 *
 * @param {object} event
 * @returns {{ valid: true, data: object } | { valid: false, response: object }}
 */
function validateWithdraw(event) {
  return validateDeposit(event); // Same schema: accountId in path, { amount, currency } in body
}

/**
 * Validate transfer payload.
 *
 * @param {object} event
 * @returns {{ valid: true, data: object } | { valid: false, response: object }}
 */
function validateTransfer(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return { valid: false, response: parsed.response };
  }

  const { fromAccountId, toAccountId, amount, currency } = parsed.data;

  if (
    !fromAccountId ||
    typeof fromAccountId !== "string" ||
    fromAccountId.trim().length === 0
  ) {
    return {
      valid: false,
      response: badRequest("fromAccountId is required"),
    };
  }

  if (
    !toAccountId ||
    typeof toAccountId !== "string" ||
    toAccountId.trim().length === 0
  ) {
    return {
      valid: false,
      response: badRequest("toAccountId is required"),
    };
  }

  if (fromAccountId.trim() === toAccountId.trim()) {
    return {
      valid: false,
      response: badRequest("Cannot transfer to the same account"),
    };
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      response: badRequest("amount must be a positive number"),
    };
  }
  if (Number(amount.toFixed(2)) !== amount) {
    return {
      valid: false,
      response: badRequest("amount cannot have more than 2 decimal places"),
    };
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return {
      valid: false,
      response: badRequest("currency must be CAD or USD"),
    };
  }

  return {
    valid: true,
    data: {
      fromAccountId: fromAccountId.trim(),
      toAccountId: toAccountId.trim(),
      amount,
      currency,
    },
  };
}

module.exports = {
  validateDeposit,
  validateWithdraw,
  validateTransfer,
};
