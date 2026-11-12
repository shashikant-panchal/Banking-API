"use strict";

const dynalite = require("dynalite");

const port = parseInt(process.env.DYNAMODB_PORT || "8000", 10);
const server = dynalite({ createTableMs: 0 });

server.listen(port, (err) => {
  if (err) {
    console.error(`Failed to start DynamoDB Local on port ${port}:`, err);
    process.exit(1);
  }
  console.log(`DynamoDB Local (in-memory) listening at http://localhost:${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

