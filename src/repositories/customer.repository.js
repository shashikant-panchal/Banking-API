"use strict";

const { GetCommand, PutCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");

/**
 * Customer Repository
 *
 * Encapsulates all DynamoDB operations on the Customers table.
 */
class CustomerRepository {
  constructor(client = docClient, tableName = TABLES.customers) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Find a customer by customerId.
   *
   * @param {string} customerId
   * @returns {Promise<object|null>}
   */
  async findById(customerId) {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { customerId },
      })
    );
    return result.Item || null;
  }

  /**
   * Persist a customer item to DynamoDB.
   *
   * @param {object} customer
   * @returns {Promise<object>}
   */
  async create(customer) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: customer,
      })
    );
    return customer;
  }

  /**
   * Delete a customer by customerId.
   *
   * @param {string} customerId
   * @returns {Promise<boolean>}
   */
  async delete(customerId) {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { customerId },
      })
    );
    return true;
  }
}

module.exports = new CustomerRepository();
module.exports.CustomerRepository = CustomerRepository;
