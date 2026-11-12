"use strict";

const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb");

const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const region = process.env.AWS_REGION || "us-east-1";
const maxAttempts = 30;
const delayMs = 500;

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
  },
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await client.send(new ListTablesCommand({}));
      console.log(`DynamoDB Local is ready at ${endpoint}`);
      return;
    } catch (err) {
      console.log(
        `Waiting for DynamoDB Local (${attempt}/${maxAttempts}): ${err.message}`
      );
      await sleep(delayMs);
    }
  }

  console.error(`DynamoDB Local did not become ready at ${endpoint}`);
  process.exit(1);
}

main();
