"use strict";

const { ok, json, serverError } = require("../lib/response");
const { AppError } = require("../lib/errors");
const { withAuth } = require("../middlewares/auth.middleware");
const {
  validateDeposit,
  validateWithdraw,
  validateTransfer,
} = require("../validators/transaction.validator");
const transactionService = require("../services/transaction.service");

function handleError(err, defaultMessage = "Unexpected server error") {
  if (err instanceof AppError) {
    return json(err.statusCode, { error: err.error, message: err.message });
  }
  console.error("Transaction handler error:", err);
  return serverError(`${defaultMessage}: ${err.message}`);
}

/**
 * POST /accounts/{accountId}/deposits
 *
 * Protected endpoint to credit an account balance.
 * - Authenticates via JWT middleware
 * - Validates params & body via transaction.validator
 * - Executes atomic credit via transaction.service
 */
const deposit = withAuth(async (event) => {
  const validation = validateDeposit(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const updatedAccount = await transactionService.deposit(validation.data);
    return ok(updatedAccount);
  } catch (err) {
    return handleError(err, "Failed to process deposit");
  }
});

/**
 * POST /accounts/{accountId}/withdrawals
 *
 * Protected endpoint to debit an account balance.
 * - Authenticates via JWT middleware
 * - Validates params & body via transaction.validator
 * - Checks overdraft and executes atomic debit via transaction.service
 */
const withdraw = withAuth(async (event) => {
  const validation = validateWithdraw(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const updatedAccount = await transactionService.withdraw(validation.data);
    return ok(updatedAccount);
  } catch (err) {
    return handleError(err, "Failed to process withdrawal");
  }
});

/**
 * POST /transfers
 *
 * Protected endpoint to atomically transfer funds between two accounts.
 * - Authenticates via JWT middleware
 * - Validates transfer body via transaction.validator
 * - Executes all-or-nothing ACID transaction via transaction.service
 */
const transfer = withAuth(async (event) => {
  const validation = validateTransfer(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const result = await transactionService.transfer(validation.data);
    return ok(result);
  } catch (err) {
    return handleError(err, "Failed to process transfer");
  }
});

module.exports = {
  deposit,
  withdraw,
  transfer,
  handleError,
};
