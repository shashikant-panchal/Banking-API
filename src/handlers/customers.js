"use strict";

const { v4: uuidv4 } = require("uuid");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");
const {
  ok,
  created,
  badRequest,
  notFound,
  serverError,
  parseJsonBody,
} = require("../lib/response");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /customers
 *
 * Creates a customer in DynamoDB.
 * - Validates fullName and email
 * - Generates a unique customerId
 * - Persists to Customers table
 * - Returns 201 with Customer object
 */
async function create(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { fullName, email } = parsed.data;

  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return badRequest("fullName is required and must not be empty");
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return badRequest("A valid email address is required");
  }

  const customerId = `cust_${uuidv4()}`;
  const now = new Date().toISOString();

  const customer = {
    customerId,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    status: "ACTIVE",
    createdAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLES.customers,
        Item: customer,
      })
    );

    return created(customer);
  } catch (err) {
    console.error("Error creating customer:", err);
    return serverError(`Failed to create customer: ${err.message}`);
  }
}

/**
 * GET /customers/{customerId}
 *
 * Loads a customer by id from DynamoDB.
 * - Reads customerId from event.pathParameters
 * - Returns 200 with Customer, or 404 if missing
 */
async function get(event) {
  const customerId = event.pathParameters?.customerId;

  if (!customerId || customerId.trim().length === 0) {
    return badRequest("customerId path parameter is required");
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.customers,
        Key: { customerId },
      })
    );

    if (!result.Item) {
      return notFound(`Customer not found: ${customerId}`);
    }

    return ok(result.Item);
  } catch (err) {
    console.error(`Error retrieving customer ${customerId}:`, err);
    return serverError(`Failed to get customer: ${err.message}`);
  }
}

module.exports = {
  create,
  get,
};
