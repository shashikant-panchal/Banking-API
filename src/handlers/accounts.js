"use strict";

const { ok, created, json, serverError } = require("../lib/response");
const { AppError } = require("../lib/errors");
const { withAuth } = require("../middlewares/auth.middleware");
const {
  validateCreateAccount,
  validateCustomerIdParam,
  validateAccountIdParam,
} = require("../validators/account.validator");
const accountService = require("../services/account.service");

function handleError(err, defaultMessage = "Unexpected server error") {
  if (err instanceof AppError) {
    return json(err.statusCode, { error: err.error, message: err.message });
  }
  console.error("Account handler error:", err);
  return serverError(`${defaultMessage}: ${err.message}`);
}

/**
 * POST /customers/{customerId}/accounts
 *
 * Protected endpoint to create an account for a customer.
 * - Authenticates via JWT middleware
 * - Validates params & body via account.validator
 * - Delegates business logic to account.service
 */
const create = withAuth(async (event) => {
  const validation = validateCreateAccount(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const account = await accountService.createAccount(validation.data);
    return created(account);
  } catch (err) {
    return handleError(err, "Failed to create account");
  }
});

/**
 * GET /customers/{customerId}/accounts
 *
 * Protected endpoint to list accounts for a customer.
 * - Authenticates via JWT middleware
 * - Validates customerId path param
 * - Queries GSI CustomerIdIndex via account.service
 */
const list = withAuth(async (event) => {
  const validation = validateCustomerIdParam(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const result = await accountService.listAccounts(validation.customerId);
    return ok(result);
  } catch (err) {
    return handleError(err, "Failed to list accounts");
  }
});

/**
 * GET /accounts/{accountId}
 *
 * Protected endpoint to retrieve an account with balance.
 * - Authenticates via JWT middleware
 * - Validates accountId path param
 * - Retrieves account via account.service
 */
const get = withAuth(async (event) => {
  const validation = validateAccountIdParam(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const account = await accountService.getAccount(validation.accountId);
    return ok(account);
  } catch (err) {
    return handleError(err, "Failed to retrieve account");
  }
});

module.exports = {
  create,
  list,
  get,
  handleError,
};
