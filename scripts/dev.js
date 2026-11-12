"use strict";

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("=== Starting Banking API Local Environment ===");

// Auto-create .env from .env.example if missing
const envPath = path.join(__dirname, "..", ".env");
const envExamplePath = path.join(__dirname, "..", ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("✓ Auto-created .env from .env.example");
}

function freePort(port) {
  try {
    const cmd = process.platform === "win32"
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} -t`;
    const output = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    if (!output) return;

    if (process.platform === "win32") {
      const lines = output.trim().split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== process.pid.toString()) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
            console.log(`✓ Cleaned up process ${pid} on port ${port}`);
          } catch {}
        }
      }
    } else {
      const pids = output.trim().split("\n");
      for (const pid of pids) {
        if (pid) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          } catch {}
        }
      }
    }
  } catch {}
}

// Clean up any stale processes from previous runs
freePort(8000);
freePort(3000);
freePort(3002);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start() {
  // 1. Start local DynamoDB
  const dbProcess = spawn(process.execPath, [path.join(__dirname, "start-local-db.js")], {
    stdio: "inherit",
  });
  await sleep(1500);

  // 2. Initialize tables & seed
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
      dbProcess.kill();
    } catch {}
    try {
      sls.kill();
    } catch {}
    freePort(8000);
    freePort(3000);
    freePort(3002);
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  sls.on("close", cleanup);
}

start().catch(console.error);
