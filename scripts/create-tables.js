"use strict";

const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  DeleteTableCommand,
} = require("@aws-sdk/client-dynamodb");

const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const region = process.env.AWS_REGION || "us-east-1";
const customersTable = process.env.CUSTOMERS_TABLE || "Customers";
const accountsTable = process.env.ACCOUNTS_TABLE || "Accounts";

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
  },
});

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      return false;
    }
    throw err;
  }
}

async function recreateTable(tableName, definition) {
  if (await tableExists(tableName)) {
    console.log(`Deleting existing table: ${tableName}`);
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    // DynamoDB Local is fast; brief wait is enough for in-memory mode
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Creating table: ${tableName}`);
  await client.send(new CreateTableCommand(definition));
}

async function main() {
  await recreateTable(customersTable, {
    TableName: customersTable,
    AttributeDefinitions: [{ AttributeName: "customerId", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "customerId", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  });

  await recreateTable(accountsTable, {
    TableName: accountsTable,
    AttributeDefinitions: [
      { AttributeName: "accountId", AttributeType: "S" },
      { AttributeName: "customerId", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "accountId", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "CustomerIdIndex",
        KeySchema: [{ AttributeName: "customerId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });

  console.log("Tables ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
