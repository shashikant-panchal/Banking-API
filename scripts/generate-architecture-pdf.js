"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_HTML = path.join(__dirname, "..", "Code_Changes_and_Architecture.html");
const OUTPUT_PDF = path.join(__dirname, "..", "Banking_API_Code_Changes_and_Architecture.pdf");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Banking API Assessment — Complete Code Changes & Architecture Guide</title>
  <style>
    @page {
      margin: 12mm 14mm;
      size: A4 portrait;
    }
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 12.5px;
      color: #4b5563;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }

    h2 {
      color: #1e40af;
      font-size: 15px;
      border-left: 4px solid #2563eb;
      padding-left: 8px;
      margin: 18px 0 8px 0;
      page-break-after: avoid;
    }
    h3 {
      color: #0f172a;
      font-size: 13.5px;
      margin: 12px 0 6px 0;
      page-break-after: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 14px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    ul {
      margin: 4px 0 6px 16px;
      padding: 0;
    }
    li {
      margin-bottom: 2px;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11.5px;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      color: #0f172a;
    }

    .quote-box {
      background: #eff6ff;
      border-left: 3px solid #2563eb;
      padding: 8px 12px;
      margin-top: 6px;
      font-style: italic;
      color: #1e3a8a;
      border-radius: 0 4px 4px 0;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Banking API Assessment — Complete Code Changes & Architecture Guide</h1>
    <div class="subtitle">
      <span><strong>Technical Audit & Interview Presentation Document</strong></span>
      <span><span class="badge badge-green">37 / 37 Tests Passing</span> <span class="badge badge-blue">Complete Core + Stretch</span></span>
    </div>
  </div>

  <h2>1. Master File Change Matrix</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">File Path</th>
        <th style="width: 12%;">Status</th>
        <th style="width: 15%;">Layer</th>
        <th>Work Performed & Technical Purpose</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>src/handlers/customers.js</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Business Logic</td>
        <td>Replaced 501 stubs. Implemented <code>POST /customers</code> (validation, UUID, status ACTIVE) and <code>GET /customers/{id}</code> (O(1) point read).</td>
      </tr>
      <tr>
        <td><code>src/handlers/accounts.js</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Business Logic</td>
        <td>Replaced 501 stubs. Implemented <code>POST /accounts</code> (parent customer check, currency/type validation), <code>GET /accounts</code> via <strong>GSI CustomerIdIndex Query</strong>, and <code>GET /accounts/{id}</code>.</td>
      </tr>
      <tr>
        <td><code>src/handlers/transactions.js</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Business Logic (Stretch)</td>
        <td>Replaced 501 stubs. Implemented atomic deposits, overdraft-protected withdrawals, and atomic cross-account transfers using <strong>DynamoDB ACID TransactWriteItems</strong>.</td>
      </tr>
      <tr>
        <td><code>src/lib/response.js</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Core Utility</td>
        <td>Hardened <code>parseJsonBody</code> to support strings, base64, and pre-parsed objects. Enforced <code>{ error, message }</code> OpenAPI error schemas.</td>
      </tr>
      <tr>
        <td><code>serverless.yml</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Configuration</td>
        <td>Added root <code>/</code> route mapping to <code>docsUi</code> so opening <code>http://localhost:3000</code> loads Swagger UI directly.</td>
      </tr>
      <tr>
        <td><code>package.json</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Configuration</td>
        <td>Added <code>dev</code>, <code>test</code>, <code>db:local</code>, and <code>screenshots</code> scripts. Added <code>aws-sdk-client-mock</code> and <code>dynalite</code> devDependencies.</td>
      </tr>
      <tr>
        <td><code>README.md</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Documentation</td>
        <td>Added command quick-reference table, architecture diagrams, and documentation links.</td>
      </tr>
      <tr>
        <td><code>.env</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Configuration</td>
        <td>Configured environment variables for local DynamoDB connection on <code>http://localhost:8000</code>.</td>
      </tr>
      <tr>
        <td><code>test/customers.test.js</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Automated Test</td>
        <td>9 tests covering customer creation, missing fields, email regex validation, and 404 not found handling.</td>
      </tr>
      <tr>
        <td><code>test/accounts.test.js</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Automated Test</td>
        <td>13 tests covering account creation, initial balance precision, currency validation, 404s, and GSI queries.</td>
      </tr>
      <tr>
        <td><code>test/transactions.test.js</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Automated Test</td>
        <td>15 tests covering deposits, withdrawals, overdraft protection (409), atomic transfers, and concurrency collisions.</td>
      </tr>
      <tr>
        <td><code>scripts/dev.js</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Dev Experience</td>
        <td>1-command startup: auto-cleans stale ports (8000/3000/3002), auto-copies <code>.env</code>, starts local DB, seeds data, and starts API.</td>
      </tr>
      <tr>
        <td><code>scripts/start-local-db.js</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Infrastructure</td>
        <td>Pure Node.js in-memory DynamoDB Local server using <code>dynalite</code> (eliminates Docker Desktop requirement).</td>
      </tr>
      <tr>
        <td><code>scripts/create-tables.js</code></td>
        <td><span class="badge badge-blue">Modified</span></td>
        <td>Migration</td>
        <td>Hardened table recreation logic with backoff delays and <code>ResourceInUseException</code> resilience.</td>
      </tr>
      <tr>
        <td><code>scripts/capture-all-screenshots.js</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>QA / Verification</td>
        <td>Runs end-to-end tests for all 9 API operations against localhost:3000 and captures high-res PNG screenshots.</td>
      </tr>
      <tr>
        <td><code>NOTES.md</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Documentation</td>
        <td>Complete technical documentation on DynamoDB access patterns, ACID transactions, and curl demo commands.</td>
      </tr>
      <tr>
        <td><code>Banking_API_Interview_Guide.pdf</code></td>
        <td><span class="badge badge-green">Created</span></td>
        <td>Interview Prep</td>
        <td>Printable PDF guide with elevator pitches, model answers to interviewer questions, and cheat sheets.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>2. Detailed Architecture & Code Implementation</h2>

  <div class="card">
    <div class="card-title">1. Customers Handlers (<code>src/handlers/customers.js</code>)</div>
    <p>Replaced initial 501 stubs with production handlers:</p>
    <ul>
      <li><code>create(event)</code>:
        <ul>
          <li>Parses request body via <code>parseJsonBody</code>.</li>
          <li>Validates <code>fullName</code> (non-empty string) and <code>email</code> (RFC 5322 regex pattern).</li>
          <li>Generates unique ID with <code>uuidv4()</code> prefixed as <code>cust_&lt;uuid&gt;</code>.</li>
          <li>Sets status <code>ACTIVE</code> and ISO timestamp <code>createdAt</code>.</li>
          <li>Persists to <code>Customers</code> table with <code>PutCommand</code> and returns <code>201 Created</code>.</li>
        </ul>
      </li>
      <li><code>get(event)</code>:
        <ul>
          <li>Performs direct $O(1)$ point lookup using <code>GetCommand</code> by partition key <code>customerId</code>.</li>
          <li>Returns <code>200 OK</code> with customer item or <code>404 Not Found</code> with <code>{ error: "NOT_FOUND", message: "..." }</code>.</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="card">
    <div class="card-title">2. Accounts Handlers (<code>src/handlers/accounts.js</code>)</div>
    <p>Implements customer account lifecycle and optimized query patterns:</p>
    <ul>
      <li><code>create(event)</code>:
        <ul>
          <li>Validates parent customer exists via <code>GetCommand</code> (returns <code>404</code> if not found).</li>
          <li>Validates <code>type</code> (<code>CHECKING</code> or <code>SAVINGS</code>) and <code>currency</code> (<code>CAD</code> or <code>USD</code>).</li>
          <li>Validates <code>initialBalance</code>: must be a non-negative finite number with at most 2 decimal places.</li>
          <li>Persists to <code>Accounts</code> table with partition key <code>accountId</code> and indexed attribute <code>customerId</code>. Returns <code>201 Created</code>.</li>
        </ul>
      </li>
      <li><code>list(event)</code> &mdash; <em>Crucial Optimization</em>:
        <ul>
          <li>Verifies customer exists first (returns <code>404</code> if not).</li>
          <li><strong>Query vs Scan:</strong> Instead of executing a table-wide Scan with a filter, uses <code>QueryCommand</code> on the <strong><code>CustomerIdIndex</code> GSI</strong>.</li>
          <li>Targets only that customer's partition in $O(1)$ time, saving read capacity units and scaling sub-linearly. Returns <code>200 OK</code> with <code>{ items: Account[] }</code>.</li>
        </ul>
      </li>
      <li><code>get(event)</code>: Point read by <code>accountId</code> returning current account data including balance (200 / 404).</li>
    </ul>
  </div>

  <div class="card">
    <div class="card-title">3. Transactions Handlers (<code>src/handlers/transactions.js</code>) &mdash; Stretch Goals</div>
    <p>Provides atomic balance operations and ACID fund transfers:</p>
    <ul>
      <li><code>deposit(event)</code>:
        <ul>
          <li>Validates amount (&gt; 0, max 2 decimals) and matching currency. Verifies account is <code>OPEN</code>.</li>
          <li>Atomic balance increment via <code>UpdateCommand</code> with <code>SET balance = balance + :amount</code>.</li>
          <li>Condition guard: <code>attribute_exists(accountId) AND #status = :openStatus AND currency = :currency</code>. Returns <code>200 OK</code>.</li>
        </ul>
      </li>
      <li><code>withdraw(event)</code>:
        <ul>
          <li>Validates amount, currency match, and <code>OPEN</code> status. Rejects if balance &lt; amount with <code>409 Conflict</code>.</li>
          <li>Atomic debit via <code>UpdateCommand</code>: <code>SET balance = balance - :amount</code>.</li>
          <li>Concurrency guard: <code>ConditionExpression: "balance &gt;= :amount AND #status = :openStatus AND currency = :currency"</code>.</li>
          <li>Catches <code>ConditionalCheckFailedException</code> to safely reject concurrent race collisions with <code>409 Conflict</code>.</li>
        </ul>
      </li>
      <li><code>transfer(event)</code>:
        <ul>
          <li>Validates both accounts exist, are <code>OPEN</code>, share currency, and <code>fromAccountId !== toAccountId</code>.</li>
          <li><strong>ACID Atomicity:</strong> Executes debit and credit together in a single <code>TransactWriteCommand</code> (<code>TransactWriteItems</code>). Either both operations commit or both roll back.</li>
          <li>Debit condition: <code>balance &gt;= :amount</code>. If concurrent withdrawals deplete the balance, DynamoDB aborts the transaction with <code>TransactionCanceledException</code>, caught and returned as <code>409 Conflict</code>.</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="page-break"></div>

  <h2>3. Automated Test Suite (37 Tests Across 11 Suites)</h2>
  <div class="card">
    <table style="margin: 0;">
      <thead>
        <tr>
          <th>Test Suite File</th>
          <th>Tests</th>
          <th>What is Tested</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>test/customers.test.js</code></td>
          <td><strong>9 Tests</strong></td>
          <td>Happy path customer creation, UUID generation, status ACTIVE, missing fullName (400), whitespace fullName (400), invalid email regex (400), missing body (400), malformed JSON (400), point retrieval (200), missing customer (404), missing path param (400).</td>
        </tr>
        <tr>
          <td><code>test/accounts.test.js</code></td>
          <td><strong>13 Tests</strong></td>
          <td>Creation with default initialBalance=0 (201), custom initialBalance (201), non-existent customer rejection (404), invalid type (400), invalid currency (400), negative balance (400), fractional cents &gt;2 decimals (400), GSI query execution (200), empty items array (200), listing non-existent customer (404), account retrieval by ID (200), missing account (404), missing path param (400).</td>
        </tr>
        <tr>
          <td><code>test/transactions.test.js</code></td>
          <td><strong>15 Tests</strong></td>
          <td>Deposit happy path (200), deposit non-existent account (404), non-positive amount (400), currency mismatch (400), closed account (400), withdrawal happy path (200), insufficient funds (409), race condition simulation (409), missing account (404), atomic transfer happy path (200), self-transfer rejection (400), missing source/dest (404), insufficient funds transfer (409), currency mismatch (400), transaction collision rollback (409).</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>4. Developer Experience & Local Infrastructure Scripts</h2>
  <div class="card">
    <ul>
      <li><strong><code>scripts/dev.js</code> (Unified Dev Startup):</strong>
        <ul>
          <li>Allows the entire environment to run via <code>npm run dev</code> in a single command.</li>
          <li>Auto-frees ports 8000, 3000, and 3002 before launch, completely eliminating <code>EADDRINUSE</code> errors.</li>
          <li>Auto-creates <code>.env</code> from <code>.env.example</code> if missing.</li>
          <li>Spawns local DynamoDB, seeds tables, and starts serverless-offline.</li>
        </ul>
      </li>
      <li><strong><code>scripts/start-local-db.js</code> (In-Memory DynamoDB):</strong>
        <ul>
          <li>Runs an in-memory DynamoDB server using <code>dynalite</code>, meaning reviewers don't even need Docker Desktop installed.</li>
        </ul>
      </li>
      <li><strong><code>scripts/capture-all-screenshots.js</code> (Automated Visual QA):</strong>
        <ul>
          <li>Runs all 9 endpoints against localhost:3000, generates visual HTML reports, and captures PNG screenshots via headless Microsoft Edge.</li>
        </ul>
      </li>
    </ul>
  </div>

  <h2>5. How to Explain Your Changes in an Interview</h2>
  <div class="card">
    <div class="quote-box">
      <strong>Elevator Summary to Give the Interviewer:</strong><br />
      "I replaced the initial 501 stubs across all three handlers—customers, accounts, and transactions—with production-ready logic.
      I ensured strict compliance with the OpenAPI 3.0 specification for all status codes and error shapes.<br /><br />
      For data access, I optimized customer account queries by using a Global Secondary Index (GSI) rather than table Scans. For financial transfers, I used DynamoDB TransactWriteItems to guarantee ACID atomicity across accounts, combined with optimistic concurrency condition expressions to prevent overdrafts and race conditions.<br /><br />
      Finally, I verified the entire implementation with a 37-test automated test suite using Node's native test runner and aws-sdk-client-mock, and built a unified 1-command startup script for seamless local execution."
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, "utf8");
console.log("HTML created at:", OUTPUT_HTML);

const fileUrl = "file:///" + OUTPUT_HTML.replace(/\\/g, "/");

console.log("Generating PDF via Edge headless...");
const res = spawnSync(EDGE_PATH, [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  "--print-to-pdf-no-header",
  `--print-to-pdf=${OUTPUT_PDF}`,
  fileUrl,
]);

if (fs.existsSync(OUTPUT_PDF)) {
  const size = fs.statSync(OUTPUT_PDF).size;
  console.log(`✓ PDF successfully generated: ${OUTPUT_PDF} (${size} bytes)`);
} else {
  console.error("Failed to generate PDF");
  process.exit(1);
}
