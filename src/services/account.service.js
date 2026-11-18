"use strict";

const { v4: uuidv4 } = require("uuid");
const accountRepository = require("../repositories/account.repository");
const customerRepository = require("../repositories/customer.repository");
const { notFound } = require("../lib/errors");

/**
 * Account Service
 *
 * Implements business logic for Account operations.
 */
class AccountService {
  constructor(accountRepo = accountRepository, customerRepo = customerRepository) {
    this.accountRepo = accountRepo;
    this.customerRepo = customerRepo;
  }

  /**
   * Create an account for an existing customer.
   *
   * @param {object} params
   * @param {string} params.customerId
   * @param {string} params.type
   * @param {string} params.currency
   * @param {number} [params.initialBalance=0]
   * @returns {Promise<object>} Account
   * @throws {AppError} 404 if customer not found
   */
  async createAccount({ customerId, type, currency, initialBalance = 0 }) {
    // Business rule: Verify parent customer exists
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw notFound(`Customer not found: ${customerId}`);
    }

    const accountId = `acct_${uuidv4()}`;
    const now = new Date().toISOString();

    const account = {
      accountId,
      customerId,
      type,
      currency,
      balance: initialBalance,
      status: "OPEN",
      createdAt: now,
    };

    return this.accountRepo.create(account);
  }

  /**
   * List all accounts for a customer.
   *
   * @param {string} customerId
   * @returns {Promise<{ items: Array<object> }>}
   * @throws {AppError} 404 if customer not found
   */
  async listAccounts(customerId) {
    // Business rule: Verify customer exists before listing
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw notFound(`Customer not found: ${customerId}`);
    }

    const items = await this.accountRepo.findByCustomerId(customerId);
    return { items };
  }

  /**
   * Get an account by accountId including balance.
   *
   * @param {string} accountId
   * @returns {Promise<object>} Account
   * @throws {AppError} 404 if account not found
   */
  async getAccount(accountId) {
    const account = await this.accountRepo.findById(accountId);
    if (!account) {
      throw notFound(`Account not found: ${accountId}`);
    }
    return account;
  }
}

module.exports = new AccountService();
module.exports.AccountService = AccountService;
