"use strict";

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");

console.log("=== Starting Banking API Local Environment ===");

// Auto-create .env from .env.example if missing
const envPath = path.join(__dirname, "..", ".env");
const envExamplePath = path.join(__dirname, "..", ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("✓ Auto-created .env from .env.example");
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start() {
  let dbProcess = null;

  // 1. Check if DynamoDB is already running on port 8000
  const isDbRunning = await checkPort(8000);
  if (isDbRunning) {
    console.log("✓ DynamoDB Local is already running on http://localhost:8000");
  } else {
    dbProcess = spawn(process.execPath, [path.join(__dirname, "start-local-db.js")], {
      stdio: "inherit",
    });
    await sleep(1000);
  }

  // 2. Initialize tables and seed
  console.log("\n=== Initializing Tables & Seeding Data ===");
  try {
    execSync(`"${process.execPath}" "${path.join(__dirname, "create-tables.js")}"`, {
      stdio: "inherit",
    });
    execSync(`"${process.execPath}" "${path.join(__dirname, "seed.js")}"`, {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Table initialization warning:", err.message);
  }

  // 3. Start Serverless Offline
  console.log("\n=== Starting API Server on http://localhost:3000 ===");
  const serverlessBin = path.join(
    __dirname,
    "..",
    "node_modules",
    "serverless",
    "bin",
    "serverless.js"
  );

  const sls = spawn(process.execPath, [serverlessBin, "offline", "start", "--httpPort", "3000"], {
    stdio: "inherit",
  });

  const cleanup = () => {
    try {
      if (dbProcess) dbProcess.kill();
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

start().catch(console.error);
