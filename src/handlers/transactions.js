"use strict";

const {
  GetCommand,
  UpdateCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");
const {
  ok,
  badRequest,
  notFound,
  conflict,
  serverError,
  parseJsonBody,
} = require("../lib/response");

const VALID_CURRENCIES = new Set(["CAD", "USD"]);

/**
 * POST /accounts/{accountId}/deposits
 *
 * STRETCH (mid-senior): Credit the account balance.
 * - Validates amount > 0 and currency matches account
 * - Updates balance atomically in DynamoDB
 * - Returns 200 with updated Account
 */
async function deposit(event) {
  const accountId = event.pathParameters?.accountId;
  if (!accountId || accountId.trim().length === 0) {
    return badRequest("accountId path parameter is required");
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { amount, currency } = parsed.data;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return badRequest("amount must be a positive number");
  }
  if (Number(amount.toFixed(2)) !== amount) {
    return badRequest("amount cannot have more than 2 decimal places");
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return badRequest("currency must be CAD or USD");
  }

  try {
    // Verify account exists and inspect state
    const accountResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.accounts,
        Key: { accountId },
      })
    );

    if (!accountResult.Item) {
      return notFound(`Account not found: ${accountId}`);
    }

    const account = accountResult.Item;

    if (account.status !== "OPEN") {
      return badRequest("Account is not open");
    }

    if (account.currency !== currency) {
      return badRequest(
        `Currency mismatch: account currency is ${account.currency}, but requested ${currency}`
      );
    }

    // Atomic update with condition check
    const updateResult = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.accounts,
        Key: { accountId },
        UpdateExpression: "SET balance = balance + :amount",
        ConditionExpression:
          "attribute_exists(accountId) AND #status = :openStatus AND currency = :currency",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":amount": amount,
          ":openStatus": "OPEN",
          ":currency": currency,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return ok(updateResult.Attributes);
  } catch (err) {
    console.error(`Error processing deposit for account ${accountId}:`, err);
    return serverError(`Failed to process deposit: ${err.message}`);
  }
}

/**
 * POST /accounts/{accountId}/withdrawals
 *
 * STRETCH (mid-senior): Debit the account balance.
 * - Validates amount > 0 and currency matches account
 * - Rejects with 409 if insufficient funds
 * - Returns 200 with updated Account
 */
async function withdraw(event) {
  const accountId = event.pathParameters?.accountId;
  if (!accountId || accountId.trim().length === 0) {
    return badRequest("accountId path parameter is required");
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { amount, currency } = parsed.data;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return badRequest("amount must be a positive number");
  }
  if (Number(amount.toFixed(2)) !== amount) {
    return badRequest("amount cannot have more than 2 decimal places");
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return badRequest("currency must be CAD or USD");
  }

  try {
    // Verify account exists
    const accountResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.accounts,
        Key: { accountId },
      })
    );

    if (!accountResult.Item) {
      return notFound(`Account not found: ${accountId}`);
    }

    const account = accountResult.Item;

    if (account.status !== "OPEN") {
      return badRequest("Account is not open");
    }

    if (account.currency !== currency) {
      return badRequest(
        `Currency mismatch: account currency is ${account.currency}, but requested ${currency}`
      );
    }

    if (account.balance < amount) {
      return conflict("Insufficient funds");
    }

    try {
      const updateResult = await docClient.send(
        new UpdateCommand({
          TableName: TABLES.accounts,
          Key: { accountId },
          UpdateExpression: "SET balance = balance - :amount",
          ConditionExpression:
            "balance >= :amount AND #status = :openStatus AND currency = :currency",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":amount": amount,
            ":openStatus": "OPEN",
            ":currency": currency,
          },
          ReturnValues: "ALL_NEW",
        })
      );

      return ok(updateResult.Attributes);
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return conflict("Insufficient funds or account state modified concurrently");
      }
      throw err;
    }
  } catch (err) {
    console.error(`Error processing withdrawal for account ${accountId}:`, err);
    return serverError(`Failed to process withdrawal: ${err.message}`);
  }
}

/**
 * POST /transfers
 *
 * STRETCH (mid-senior): Move funds between two accounts.
 * - Same currency required across both accounts
 * - Insufficient funds -> 409
 * - Uses DynamoDB TransactWriteItems for atomic, all-or-nothing consistency
 * - Graceful two-phase conditional fallback for emulators lacking transactions
 * - Returns 200: { fromAccount, toAccount }
 */
async function transfer(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { fromAccountId, toAccountId, amount, currency } = parsed.data;

  if (!fromAccountId || typeof fromAccountId !== "string" || fromAccountId.trim().length === 0) {
    return badRequest("fromAccountId is required");
  }

  if (!toAccountId || typeof toAccountId !== "string" || toAccountId.trim().length === 0) {
    return badRequest("toAccountId is required");
  }

  if (fromAccountId === toAccountId) {
    return badRequest("Cannot transfer to the same account");
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return badRequest("amount must be a positive number");
  }
  if (Number(amount.toFixed(2)) !== amount) {
    return badRequest("amount cannot have more than 2 decimal places");
  }

  if (!currency || !VALID_CURRENCIES.has(currency)) {
    return badRequest("currency must be CAD or USD");
  }

  try {
    // Read both accounts
    const [fromRes, toRes] = await Promise.all([
      docClient.send(
        new GetCommand({
          TableName: TABLES.accounts,
          Key: { accountId: fromAccountId },
        })
      ),
      docClient.send(
        new GetCommand({
          TableName: TABLES.accounts,
          Key: { accountId: toAccountId },
        })
      ),
    ]);

    if (!fromRes.Item) {
      return notFound(`Source account not found: ${fromAccountId}`);
    }

    if (!toRes.Item) {
      return notFound(`Destination account not found: ${toAccountId}`);
    }

    const fromAccount = fromRes.Item;
    const toAccount = toRes.Item;

    if (fromAccount.status !== "OPEN") {
      return badRequest("Source account is not open");
    }

    if (toAccount.status !== "OPEN") {
      return badRequest("Destination account is not open");
    }

    if (fromAccount.currency !== currency) {
      return badRequest(
        `Currency mismatch: source account currency is ${fromAccount.currency}, but requested ${currency}`
      );
    }

    if (toAccount.currency !== currency) {
      return badRequest(
        `Currency mismatch: destination account currency is ${toAccount.currency}, but requested ${currency}`
      );
    }

    if (fromAccount.balance < amount) {
      return conflict("Insufficient funds");
    }

    // Atomic ACID transaction: debit source and credit destination together
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: TABLES.accounts,
                Key: { accountId: fromAccountId },
                UpdateExpression: "SET balance = balance - :amount",
                ConditionExpression:
                  "balance >= :amount AND #status = :openStatus AND currency = :currency",
                ExpressionAttributeNames: {
                  "#status": "status",
                },
                ExpressionAttributeValues: {
                  ":amount": amount,
                  ":openStatus": "OPEN",
                  ":currency": currency,
                },
              },
            },
            {
              Update: {
                TableName: TABLES.accounts,
                Key: { accountId: toAccountId },
                UpdateExpression: "SET balance = balance + :amount",
                ConditionExpression:
                  "attribute_exists(accountId) AND #status = :openStatus AND currency = :currency",
                ExpressionAttributeNames: {
                  "#status": "status",
                },
                ExpressionAttributeValues: {
                  ":amount": amount,
                  ":openStatus": "OPEN",
                  ":currency": currency,
                },
              },
            },
          ],
        })
      );
    } catch (err) {
      if (
        err.name === "TransactionCanceledException" ||
        err.name === "ConditionalCheckFailedException"
      ) {
        return conflict(
          "Transfer failed: insufficient funds or account state changed concurrently"
        );
      }
      // If emulator (like dynalite) does not support TransactWriteItems, fallback to 2-phase conditional update
      if (err.name === "UnknownOperationException") {
        try {
          await docClient.send(
            new UpdateCommand({
              TableName: TABLES.accounts,
              Key: { accountId: fromAccountId },
              UpdateExpression: "SET balance = balance - :amount",
              ConditionExpression:
                "balance >= :amount AND #status = :openStatus AND currency = :currency",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":amount": amount,
                ":openStatus": "OPEN",
                ":currency": currency,
              },
            })
          );
        } catch (debitErr) {
          if (debitErr.name === "ConditionalCheckFailedException") {
            return conflict("Transfer failed: insufficient funds or account state changed concurrently");
          }
          throw debitErr;
        }

        try {
          await docClient.send(
            new UpdateCommand({
              TableName: TABLES.accounts,
              Key: { accountId: toAccountId },
              UpdateExpression: "SET balance = balance + :amount",
              ConditionExpression:
                "attribute_exists(accountId) AND #status = :openStatus AND currency = :currency",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":amount": amount,
                ":openStatus": "OPEN",
                ":currency": currency,
              },
            })
          );
        } catch (creditErr) {
          // Compensating rollback
          await docClient.send(
            new UpdateCommand({
              TableName: TABLES.accounts,
              Key: { accountId: fromAccountId },
              UpdateExpression: "SET balance = balance + :amount",
              ExpressionAttributeValues: {
                ":amount": amount,
              },
            })
          );
          return conflict("Transfer failed: destination account rejected update; source refunded");
        }
      } else {
        throw err;
      }
    }

    // Fetch updated accounts for response
    const [updatedFrom, updatedTo] = await Promise.all([
      docClient.send(
        new GetCommand({
          TableName: TABLES.accounts,
          Key: { accountId: fromAccountId },
        })
      ),
      docClient.send(
        new GetCommand({
          TableName: TABLES.accounts,
          Key: { accountId: toAccountId },
        })
      ),
    ]);

    return ok({
      fromAccount: updatedFrom.Item,
      toAccount: updatedTo.Item,
    });
  } catch (err) {
    console.error("Error processing transfer:", err);
    return serverError(`Failed to process transfer: ${err.message}`);
  }
}

module.exports = {
  deposit,
  withdraw,
  transfer,
};
