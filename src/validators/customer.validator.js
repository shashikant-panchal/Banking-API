"use strict";

const { badRequest, parseJsonBody } = require("../lib/response");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate customer creation payload.
 *
 * @param {object} event - API Gateway event
 * @returns {{ valid: true, data: { fullName: string, email: string } } | { valid: false, response: object }}
 */
function validateCreateCustomer(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return { valid: false, response: parsed.response };
  }

  const { fullName, email } = parsed.data;

  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return {
      valid: false,
      response: badRequest("fullName is required and must not be empty"),
    };
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return {
      valid: false,
      response: badRequest("A valid email address is required"),
    };
  }

  return {
    valid: true,
    data: {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
    },
  };
}

/**
 * Validate customerId from path parameters.
 *
 * @param {object} event - API Gateway event
 * @returns {{ valid: true, customerId: string } | { valid: false, response: object }}
 */
function validateCustomerId(event) {
  const customerId = event?.pathParameters?.customerId;

  if (!customerId || customerId.trim().length === 0) {
    return {
      valid: false,
      response: badRequest("customerId path parameter is required"),
    };
  }

  return {
    valid: true,
    customerId: customerId.trim(),
  };
}

module.exports = {
  validateCreateCustomer,
  validateCustomerId,
  EMAIL_REGEX,
};
