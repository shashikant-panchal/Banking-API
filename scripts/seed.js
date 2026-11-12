"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const region = process.env.AWS_REGION || "us-east-1";
const customersTable = process.env.CUSTOMERS_TABLE || "Customers";
const accountsTable = process.env.ACCOUNTS_TABLE || "Accounts";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
    },
  })
);

const now = new Date().toISOString();

const customers = [
  {
    customerId: "cust_001",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    status: "ACTIVE",
    createdAt: now,
  },
  {
    customerId: "cust_002",
    fullName: "Alan Turing",
    email: "alan@example.com",
    status: "ACTIVE",
    createdAt: now,
  },
];

const accounts = [
  {
    accountId: "acct_001",
    customerId: "cust_001",
    type: "CHECKING",
    currency: "CAD",
    balance: 250.0,
    status: "OPEN",
    createdAt: now,
  },
  {
    accountId: "acct_002",
    customerId: "cust_001",
    type: "SAVINGS",
    currency: "CAD",
    balance: 1000.0,
    status: "OPEN",
    createdAt: now,
  },
  {
    accountId: "acct_003",
    customerId: "cust_002",
    type: "CHECKING",
    currency: "USD",
    balance: 75.5,
    status: "OPEN",
    createdAt: now,
  },
];

async function main() {
  for (const customer of customers) {
    await client.send(
      new PutCommand({ TableName: customersTable, Item: customer })
    );
    console.log(`Seeded customer ${customer.customerId}`);
  }

  for (const account of accounts) {
    await client.send(
      new PutCommand({ TableName: accountsTable, Item: account })
    );
    console.log(`Seeded account ${account.accountId}`);
  }

  console.log("Seed complete.");
  console.log("Try: GET http://localhost:3000/customers/cust_001");
  console.log("     GET http://localhost:3000/accounts/acct_001");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
