"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_HTML = path.join(__dirname, "..", "Interview_Guide.html");
const OUTPUT_PDF = path.join(__dirname, "..", "Banking_API_Interview_Guide.pdf");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Banking API Assessment — Technical Interview Preparation Guide</title>
  <style>
    @page {
      margin: 14mm 16mm;
      size: A4 portrait;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      line-height: 1.5;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 13px;
      color: #4b5563;
      margin: 0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }

    h2 {
      color: #1e40af;
      font-size: 16px;
      border-left: 4px solid #2563eb;
      padding-left: 8px;
      margin: 20px 0 10px 0;
      page-break-after: avoid;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    .q-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .q-title span.number {
      background: #2563eb;
      color: #fff;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
    }

    .answer-box {
      background: #ffffff;
      border-left: 3px solid #10b981;
      padding: 8px 12px;
      margin-top: 6px;
      border-radius: 0 4px 4px 0;
    }
    .answer-box .label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #059669;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .answer-box p {
      margin: 4px 0;
      color: #334155;
    }

    ul {
      margin: 4px 0 6px 18px;
      padding: 0;
    }
    li {
      margin-bottom: 3px;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 12px;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      color: #0f172a;
    }

    .cheat-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12.5px;
    }
    .cheat-table th, .cheat-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .cheat-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
    }

    .callout {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 10px;
      font-size: 12.5px;
      page-break-inside: avoid;
    }
    .callout strong {
      color: #1e40af;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Banking API Assessment — Technical Interview Guide</h1>
    <div class="subtitle">
      <span><strong>Candidate Interview Preparation Sheet</strong> &bull; Node.js, Lambda, DynamoDB</span>
      <span><span class="badge badge-green">37 Tests Passing</span> <span class="badge badge-blue">OpenAPI 3.0 Conforming</span> <span class="badge badge-purple">Stretch Goals Completed</span></span>
    </div>
  </div>

  <h2>1. The 60-Second Elevator Pitch</h2>
  <div class="card">
    <div class="answer-box">
      <div class="label">What to say when asked: "Walk me through what you built"</div>
      <p><em>"I built a production-grade retail banking REST API following the <strong>API Gateway &rarr; Lambda &rarr; DynamoDB</strong> pattern, conforming strictly to the OpenAPI 3.0 specification.</em></p>
      <p><em>I completed all <strong>Core CRUD endpoints</strong> for Customers and Accounts, plus all <strong>Stretch Goal Transaction endpoints</strong> (Deposits, Withdrawals, and atomic Transfers).</em></p>
      <p><em>My design focused on three engineering priorities:</em></p>
      <ul>
        <li><strong>Efficient Access Patterns:</strong> Used a Global Secondary Index (GSI) with <code>Query</code> instead of expensive table <code>Scan</code>s for customer account listings.</li>
        <li><strong>Financial Consistency & ACID Transactions:</strong> Implemented DynamoDB <code>TransactWriteItems</code> for cross-account transfers to guarantee all-or-nothing execution with zero risk of partial failure.</li>
        <li><strong>Rigorous Verification:</strong> Built a 37-test automated test suite using <code>node:test</code> and <code>aws-sdk-client-mock</code> covering happy paths, input validation, and concurrency collisions with 0 failures."</em></li>
      </ul>
    </div>
  </div>

  <h2>2. Core Technical Questions & How to Answer</h2>

  <div class="card">
    <div class="q-title"><span class="number">Q1</span> How did you design your DynamoDB access patterns, especially for listing customer accounts?</div>
    <div class="answer-box">
      <div class="label">Answer Script</div>
      <p><strong>Point Reads (O(1)):</strong> Customers (<code>customerId</code>) and Accounts (<code>accountId</code>) use direct <code>GetCommand</code> by partition key.</p>
      <p><strong>Listing Accounts by Customer (<code>GET /customers/{id}/accounts</code>):</strong></p>
      <ul>
        <li>In DynamoDB, the <code>Accounts</code> primary key is <code>accountId</code>. A naive approach would use a <code>Scan</code> with a filter expression. However, <strong>Scan is an anti-pattern in production</strong> because it scans the entire dataset ($O(N)$), consuming unbounded Read Capacity Units (RCUs) and increasing latency.</li>
        <li>Instead, I queried the <strong><code>CustomerIdIndex</code> Global Secondary Index (GSI)</strong> using <code>QueryCommand</code> with <code>KeyConditionExpression: "customerId = :customerId"</code>. This targets only the relevant partition, achieving $O(1)$ partition lookup with minimal RCU consumption.</li>
        <li>I also verify that the customer exists beforehand so that invalid IDs return a proper <code>404 Not Found</code> rather than an ambiguous empty list.</li>
      </ul>
    </div>
  </div>

  <div class="card">
    <div class="q-title"><span class="number">Q2</span> How did you implement transfers and handle partial failures or concurrency?</div>
    <div class="answer-box">
      <div class="label">Answer Script</div>
      <p><strong>The Partial Failure Risk:</strong> In financial transfers, if a debit succeeds but the subsequent credit fails (network timeout or system crash), customer funds vanish. If credit succeeds but debit fails, money is created.</p>
      <p><strong>My Solution — DynamoDB ACID Transactions (<code>TransactWriteItems</code>):</strong></p>
      <ul>
        <li>I bundled the debit (<code>SET balance = balance - :amount</code>) and credit (<code>SET balance = balance + :amount</code>) into a single <code>TransactWriteCommand</code>. Both operations execute atomically across DynamoDB items—either both commit or both roll back.</li>
        <li><strong>Optimistic Concurrency Guards:</strong> On the debit item, I added <code>ConditionExpression: "balance >= :amount AND #status = :openStatus AND currency = :currency"</code>.</li>
        <li><strong>Race Condition Handling:</strong> If two transfers hit concurrently and deplete the balance, DynamoDB aborts the transaction with <code>TransactionCanceledException</code>. My handler catches this and returns a clean <code>409 Conflict</code>.</li>
        <li><strong>Production Idempotency:</strong> In production, I would accept a <code>ClientRequestToken</code> / <code>Idempotency-Key</code> header to prevent duplicate execution upon client retries.</li>
      </ul>
    </div>
  </div>

  <div class="page-break"></div>

  <h2>2. Core Technical Questions & How to Answer (Continued)</h2>

  <div class="card">
    <div class="q-title"><span class="number">Q3</span> How did you handle deposits and withdrawals?</div>
    <div class="answer-box">
      <div class="label">Answer Script</div>
      <ul>
        <li><strong>Atomic Balance Updates:</strong> Rather than performing a vulnerable read-modify-write in Node.js, I used DynamoDB's native <code>UpdateCommand</code> with <code>SET balance = balance + :amount</code> (deposit) and <code>SET balance = balance - :amount</code> (withdraw).</li>
        <li><strong>Overdraft Prevention:</strong> Withdrawals enforce <code>ConditionExpression: "balance >= :amount"</code>. This guarantees that balance can never drop below zero even under concurrent requests. If the condition fails, it returns <code>409 Conflict</code>.</li>
        <li><strong>Account State & Currency Validation:</strong> Both operations verify that the account is <code>OPEN</code> and that the deposit/withdrawal currency strictly matches the account currency.</li>
      </ul>
    </div>
  </div>

  <div class="card">
    <div class="q-title"><span class="number">Q4</span> How did you handle input validation and financial precision?</div>
    <div class="answer-box">
      <div class="label">Answer Script</div>
      <ul>
        <li><strong>Schema Conformance:</strong> Matched all OpenAPI schemas. Malformed bodies, missing fields, or invalid types return <code>400 Bad Request</code> with <code>{ error: "BAD_REQUEST", message: "..." }</code>.</li>
        <li><strong>Floating-Point Precision:</strong> IEEE-754 floating-point arithmetic can introduce fractional-cent artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004). To prevent exploits and rounding issues, I enforced that all amounts must be finite numbers with at most <strong>2 decimal places</strong> (cents).</li>
        <li><strong>Status Rules:</strong> Closed accounts are blocked from receiving funds or originating transactions. Self-transfers (same from and to account) are explicitly rejected with <code>400 Bad Request</code>.</li>
      </ul>
    </div>
  </div>

  <div class="card">
    <div class="q-title"><span class="number">Q5</span> How did you test your implementation?</div>
    <div class="answer-box">
      <div class="label">Answer Script</div>
      <ul>
        <li>I implemented a dedicated unit test suite using Node's built-in <code>node:test</code> framework and <code>aws-sdk-client-mock</code>.</li>
        <li>Mocking the DynamoDB Document Client allows the entire suite of <strong>37 tests across 11 suites</strong> to execute in under 300ms without needing live Docker infrastructure.</li>
        <li>Tests verify happy paths (200/201), bad requests (400), not found (404), insufficient funds (409), GSI index query parameters, and transaction rollback handling.</li>
      </ul>
    </div>
  </div>

  <h2>3. Live Demo Quick Reference</h2>
  <div class="card">
    <table class="cheat-table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Command / URL</th>
          <th>What to Point Out</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Launch Server</strong></td>
          <td><code>npm run dev</code></td>
          <td>1-command startup: auto-cleans ports, starts DynamoDB Local, seeds data, starts serverless.</td>
        </tr>
        <tr>
          <td><strong>2. Open Swagger UI</strong></td>
          <td><code>http://localhost:3000/docs</code></td>
          <td>Show interactive OpenAPI documentation with all schemas and try-it-out controls.</td>
        </tr>
        <tr>
          <td><strong>3. Run Tests</strong></td>
          <td><code>npm test</code></td>
          <td>Show 37 tests passing with 0 failures in terminal.</td>
        </tr>
        <tr>
          <td><strong>4. Point to Code</strong></td>
          <td><code>src/handlers/</code></td>
          <td>Highlight clean file separation, GSI query in <code>accounts.js</code>, and <code>TransactWriteCommand</code> in <code>transactions.js</code>.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>4. Technical Buzzword & Concept Summary</h2>
  <div class="callout">
    <strong>Key concepts to mention during the interview:</strong><br />
    &bull; <strong>GSI vs. Scan:</strong> Explain that GSI provides $O(1)$ partition isolation, whereas Scan is an $O(N)$ anti-pattern.<br />
    &bull; <strong>DynamoDB ACID Transactions:</strong> Emphasize all-or-nothing atomicity via <code>TransactWriteItems</code>.<br />
    &bull; <strong>Optimistic Concurrency Control:</strong> Use of <code>ConditionExpression</code> to prevent race conditions without table locks.<br />
    &bull; <strong>Idempotency:</strong> Mention <code>ClientRequestToken</code> for safe client retries in production distributed systems.<br />
    &bull; <strong>Financial Precision:</strong> Validation of 2-decimal place limits to prevent IEEE-754 precision issues.
  </div>

</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, "utf8");
console.log("HTML guide created at:", OUTPUT_HTML);

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
