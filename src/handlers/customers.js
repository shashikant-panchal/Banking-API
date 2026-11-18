"use strict";

const { ok, created, json, serverError } = require("../lib/response");
const { AppError } = require("../lib/errors");
const { withAuth } = require("../middlewares/auth.middleware");
const {
  validateCreateCustomer,
  validateCustomerId,
} = require("../validators/customer.validator");
const customerService = require("../services/customer.service");

/**
 * Handle domain / application errors thrown by services or repositories.
 */
function handleError(err, defaultMessage = "Unexpected server error") {
  if (err instanceof AppError) {
    return json(err.statusCode, { error: err.error, message: err.message });
  }
  console.error("Handler error:", err);
  return serverError(`${defaultMessage}: ${err.message}`);
}

/**
 * POST /customers
 *
 * Protected endpoint to create a customer.
 * - Authenticates via JWT middleware
 * - Validates input via customer.validator
 * - Delegates business logic to customer.service
 */
const create = withAuth(async (event) => {
  const validation = validateCreateCustomer(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const customer = await customerService.createCustomer(validation.data);
    return created(customer);
  } catch (err) {
    return handleError(err, "Failed to create customer");
  }
});

/**
 * GET /customers/{customerId}
 *
 * Protected endpoint to retrieve a customer by ID.
 * - Authenticates via JWT middleware
 * - Validates customerId path param via customer.validator
 * - Delegates to customer.service
 */
const get = withAuth(async (event) => {
  const validation = validateCustomerId(event);
  if (!validation.valid) {
    return validation.response;
  }

  try {
    const customer = await customerService.getCustomer(validation.customerId);
    return ok(customer);
  } catch (err) {
    return handleError(err, "Failed to retrieve customer");
  }
});

module.exports = {
  create,
  get,
  handleError,
};
