"use strict";

const { spawn, execSync } = require("child_process");
const path = require("path");

console.log("=== Starting Banking API Local Environment ===");

// 1. Start local DynamoDB process
const dbProcess = spawn("node", [path.join(__dirname, "start-local-db.js")], {
  stdio: "inherit",
  shell: true,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start() {
  await sleep(1200);

  console.log("\n=== Initializing Tables & Seeding Data ===");
  try {
    execSync("node scripts/create-tables.js", { stdio: "inherit" });
    execSync("node scripts/seed.js", { stdio: "inherit" });
  } catch (err) {
    console.error("Table initialization notice:", err.message);
  }

  console.log("\n=== Starting API Gateway / Serverless Server ===");
  const sls = spawn("node", [path.join(__dirname, "..", "node_modules", "serverless", "bin", "serverless.js"), "offline", "start", "--httpPort", "3000"], {
    stdio: "inherit",
    shell: true,
  });

  const cleanup = () => {
    try {
      dbProcess.kill();
    } catch {}
    try {
      sls.kill();
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  sls.on("close", cleanup);
}

start();

