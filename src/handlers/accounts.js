"use strict";

const { v4: uuidv4 } = require("uuid");
const { GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");
const {
  ok,
  created,
  badRequest,
  notFound,
  serverError,
  parseJsonBody,
} = require("../lib/response");

const VALID_ACCOUNT_TYPES = new Set(["CHECKING", "SAVINGS"]);
const VALID_CURRENCIES = new Set(["CAD", "USD"]);

/**
 * POST /customers/{customerId}/accounts
 *
 * Creates an account for an existing customer.
 * - Validates customer exists (404 if not found)
 * - Validates type (CHECKING|SAVINGS) and currency (CAD|USD)
 * - initialBalance defaults to 0 and must be >= 0
 * - Persists to Accounts table (includes customerId for CustomerIdIndex GSI)
 * - Returns 201 with Account object
 */
async function create(event) {
  const customerId = event.pathParameters?.customerId;
  if (!customerId || customerId.trim().length === 0) {
    return badRequest("customerId path parameter is required");
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { type, currency, initialBalance } = parsed.data;

  if (!type || !VALID_ACCOUNT_TYPES.has(type)) {
    return badRequest("type must be CHECKING or SAVINGS");
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return badRequest("currency must be CAD or USD");
  }

  let balance = 0;
  if (initialBalance !== undefined) {
    if (
      typeof initialBalance !== "number" ||
      !Number.isFinite(initialBalance) ||
      initialBalance < 0
    ) {
      return badRequest("initialBalance must be a non-negative number");
    }
    if (Number(initialBalance.toFixed(2)) !== initialBalance) {
      return badRequest("initialBalance cannot have more than 2 decimal places");
    }
    balance = initialBalance;
  }

  try {
    // Verify customer exists before creating account
    const customerResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.customers,
        Key: { customerId },
      })
    );

    if (!customerResult.Item) {
      return notFound(`Customer not found: ${customerId}`);
    }

    const accountId = `acct_${uuidv4()}`;
    const now = new Date().toISOString();

    const account = {
      accountId,
      customerId,
      type,
      currency,
      balance,
      status: "OPEN",
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.accounts,
        Item: account,
      })
    );

    return created(account);
  } catch (err) {
    console.error(`Error creating account for customer ${customerId}:`, err);
    return serverError(`Failed to create account: ${err.message}`);
  }
}

/**
 * GET /customers/{customerId}/accounts
 *
 * Lists all accounts for a customer.
 * - Verifies customer exists (404 if not found)
 * - Queries the CustomerIdIndex GSI (avoids Scan)
 * - Returns 200: { items: Account[] }
 */
async function list(event) {
  const customerId = event.pathParameters?.customerId;
  if (!customerId || customerId.trim().length === 0) {
    return badRequest("customerId path parameter is required");
  }

  try {
    // Verify customer exists
    const customerResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.customers,
        Key: { customerId },
      })
    );

    if (!customerResult.Item) {
      return notFound(`Customer not found: ${customerId}`);
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.accounts,
        IndexName: "CustomerIdIndex",
        KeyConditionExpression: "customerId = :customerId",
        ExpressionAttributeValues: {
          ":customerId": customerId,
        },
      })
    );

    return ok({ items: result.Items || [] });
  } catch (err) {
    console.error(`Error listing accounts for customer ${customerId}:`, err);
    return serverError(`Failed to list accounts: ${err.message}`);
  }
}

/**
 * GET /accounts/{accountId}
 *
 * Gets a single account including balance.
 * - Reads accountId from event.pathParameters
 * - Returns 200 with Account, or 404 if missing
 */
async function get(event) {
  const accountId = event.pathParameters?.accountId;
  if (!accountId || accountId.trim().length === 0) {
    return badRequest("accountId path parameter is required");
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.accounts,
        Key: { accountId },
      })
    );

    if (!result.Item) {
      return notFound(`Account not found: ${accountId}`);
    }

    return ok(result.Item);
  } catch (err) {
    console.error(`Error retrieving account ${accountId}:`, err);
    return serverError(`Failed to get account: ${err.message}`);
  }
}

module.exports = {
  create,
  list,
  get,
};
