"use strict";

const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");

/**
 * Account Repository
 *
 * Encapsulates all DynamoDB operations on the Accounts table.
 */
class AccountRepository {
  constructor(client = docClient, tableName = TABLES.accounts) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Find an account by accountId.
   *
   * @param {string} accountId
   * @returns {Promise<object|null>}
   */
  async findById(accountId) {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { accountId },
      })
    );
    return result.Item || null;
  }

  /**
   * Persist a new account item.
   *
   * @param {object} account
   * @returns {Promise<object>}
   */
  async create(account) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: account,
      })
    );
    return account;
  }

  /**
   * Query all accounts for a customer using the CustomerIdIndex GSI.
   * Avoids expensive table Scans by directly targeting the customer's partition in the GSI.
   *
   * @param {string} customerId
   * @returns {Promise<Array<object>>}
   */
  async findByCustomerId(customerId) {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "CustomerIdIndex",
        KeyConditionExpression: "customerId = :customerId",
        ExpressionAttributeValues: {
          ":customerId": customerId,
        },
      })
    );
    return result.Items || [];
  }

  /**
   * Atomically credit or debit an account balance.
   *
   * @param {string} accountId
   * @param {number} delta - Positive to credit, negative to debit
   * @param {object} [conditions]
   * @returns {Promise<object>} - Updated account attributes
   */
  async updateBalance(accountId, delta, conditions = {}) {
    const isCredit = delta >= 0;
    const absAmount = Math.abs(delta);

    const updateExpression = isCredit
      ? "SET balance = balance + :amount"
      : "SET balance = balance - :amount";

    const conditionExpression = conditions.conditionExpression ||
      (isCredit
        ? "attribute_exists(accountId) AND #status = :openStatus AND currency = :currency"
        : "balance >= :amount AND #status = :openStatus AND currency = :currency");

    const expressionAttributeNames = {
      "#status": "status",
      ...(conditions.expressionAttributeNames || {}),
    };

    const expressionAttributeValues = {
      ":amount": absAmount,
      ":openStatus": "OPEN",
      ":currency": conditions.currency,
      ...(conditions.expressionAttributeValues || {}),
    };

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { accountId },
        UpdateExpression: updateExpression,
        ConditionExpression: conditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes;
  }

  /**
   * Atomically transfer funds between two accounts using DynamoDB TransactWriteItems.
   * Guarantees all-or-nothing execution across both accounts.
   *
   * @param {string} fromAccountId
   * @param {string} toAccountId
   * @param {number} amount
   * @param {string} currency
   * @returns {Promise<object>} { fromAccount, toAccount }
   */
  async executeTransfer(fromAccountId, toAccountId, amount, currency) {
    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: this.tableName,
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
                TableName: this.tableName,
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
      // If local emulator lacks TransactWriteItems, fallback to 2-phase conditional update
      if (err.name === "UnknownOperationException") {
        await this.updateBalance(fromAccountId, -amount, { currency });
        try {
          await this.updateBalance(toAccountId, amount, { currency });
        } catch (creditErr) {
          // Compensating rollback
          await this.updateBalance(fromAccountId, amount, { currency });
          throw creditErr;
        }
      } else {
        throw err;
      }
    }

    const [updatedFrom, updatedTo] = await Promise.all([
      this.findById(fromAccountId),
      this.findById(toAccountId),
    ]);

    return {
      fromAccount: updatedFrom,
      toAccount: updatedTo,
    };
  }

  /**
   * Delete an account by accountId.
   *
   * @param {string} accountId
   * @returns {Promise<boolean>}
   */
  async delete(accountId) {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { accountId },
      })
    );
    return true;
  }
}

module.exports = new AccountRepository();
module.exports.AccountRepository = AccountRepository;
