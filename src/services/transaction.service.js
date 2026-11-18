"use strict";

const accountRepository = require("../repositories/account.repository");
const { notFound, badRequest, conflict } = require("../lib/errors");

/**
 * Transaction Service
 *
 * Implements business logic for financial transactions: deposits, withdrawals, and transfers.
 */
class TransactionService {
  constructor(accountRepo = accountRepository) {
    this.accountRepo = accountRepo;
  }

  /**
   * Deposit funds into an account.
   *
   * @param {object} params
   * @param {string} params.accountId
   * @param {number} params.amount
   * @param {string} params.currency
   * @returns {Promise<object>} Updated account
   * @throws {AppError} 404 if not found, 400 if closed or currency mismatch
   */
  async deposit({ accountId, amount, currency }) {
    const account = await this.accountRepo.findById(accountId);
    if (!account) {
      throw notFound(`Account not found: ${accountId}`);
    }

    if (account.status !== "OPEN") {
      throw badRequest("Account is not open");
    }

    if (account.currency !== currency) {
      throw badRequest(
        `Currency mismatch: account currency is ${account.currency}, but requested ${currency}`
      );
    }

    return this.accountRepo.updateBalance(accountId, amount, { currency });
  }

  /**
   * Withdraw funds from an account.
   *
   * @param {object} params
   * @param {string} params.accountId
   * @param {number} params.amount
   * @param {string} params.currency
   * @returns {Promise<object>} Updated account
   * @throws {AppError} 404 if not found, 400 if closed/mismatch, 409 if insufficient funds
   */
  async withdraw({ accountId, amount, currency }) {
    const account = await this.accountRepo.findById(accountId);
    if (!account) {
      throw notFound(`Account not found: ${accountId}`);
    }

    if (account.status !== "OPEN") {
      throw badRequest("Account is not open");
    }

    if (account.currency !== currency) {
      throw badRequest(
        `Currency mismatch: account currency is ${account.currency}, but requested ${currency}`
      );
    }

    if (account.balance < amount) {
      throw conflict("Insufficient funds");
    }

    try {
      return await this.accountRepo.updateBalance(accountId, -amount, { currency });
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        throw conflict("Insufficient funds or account state modified concurrently");
      }
      throw err;
    }
  }

  /**
   * Transfer funds atomically between two accounts.
   *
   * @param {object} params
   * @param {string} params.fromAccountId
   * @param {string} params.toAccountId
   * @param {number} params.amount
   * @param {string} params.currency
   * @returns {Promise<{ fromAccount: object, toAccount: object }>}
   * @throws {AppError} 404 if account missing, 400 if closed/currency mismatch, 409 if insufficient funds
   */
  async transfer({ fromAccountId, toAccountId, amount, currency }) {
    const [fromAccount, toAccount] = await Promise.all([
      this.accountRepo.findById(fromAccountId),
      this.accountRepo.findById(toAccountId),
    ]);

    if (!fromAccount) {
      throw notFound(`Source account not found: ${fromAccountId}`);
    }

    if (!toAccount) {
      throw notFound(`Destination account not found: ${toAccountId}`);
    }

    if (fromAccount.status !== "OPEN") {
      throw badRequest("Source account is not open");
    }

    if (toAccount.status !== "OPEN") {
      throw badRequest("Destination account is not open");
    }

    if (fromAccount.currency !== currency) {
      throw badRequest(
        `Currency mismatch: source account currency is ${fromAccount.currency}, but requested ${currency}`
      );
    }

    if (toAccount.currency !== currency) {
      throw badRequest(
        `Currency mismatch: destination account currency is ${toAccount.currency}, but requested ${currency}`
      );
    }

    if (fromAccount.balance < amount) {
      throw conflict("Insufficient funds");
    }

    try {
      return await this.accountRepo.executeTransfer(
        fromAccountId,
        toAccountId,
        amount,
        currency
      );
    } catch (err) {
      if (
        err.name === "TransactionCanceledException" ||
        err.name === "ConditionalCheckFailedException"
      ) {
        throw conflict(
          "Transfer failed: insufficient funds or account state changed concurrently"
        );
      }
      throw err;
    }
  }
}

module.exports = new TransactionService();
module.exports.TransactionService = TransactionService;
