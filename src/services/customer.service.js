"use strict";

const { v4: uuidv4 } = require("uuid");
const customerRepository = require("../repositories/customer.repository");
const { notFound } = require("../lib/errors");

/**
 * Customer Service
 *
 * Implements business logic for Customer operations.
 */
class CustomerService {
  constructor(customerRepo = customerRepository) {
    this.customerRepo = customerRepo;
  }

  /**
   * Create a new customer.
   *
   * @param {object} params
   * @param {string} params.fullName
   * @param {string} params.email
   * @returns {Promise<object>} Customer
   */
  async createCustomer({ fullName, email }) {
    const customerId = `cust_${uuidv4()}`;
    const now = new Date().toISOString();

    const customer = {
      customerId,
      fullName,
      email,
      status: "ACTIVE",
      createdAt: now,
    };

    return this.customerRepo.create(customer);
  }

  /**
   * Get a customer by customerId.
   *
   * @param {string} customerId
   * @returns {Promise<object>} Customer
   * @throws {AppError} 404 if not found
   */
  async getCustomer(customerId) {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw notFound(`Customer not found: ${customerId}`);
    }
    return customer;
  }
}

module.exports = new CustomerService();
module.exports.CustomerService = CustomerService;
