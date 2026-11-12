"use strict";

const fs = require("fs");
const path = require("path");

const OPENAPI_PATH = path.join(__dirname, "..", "..", "openapi", "openapi.yaml");

/**
 * GET /docs — Swagger UI (CDN) pointed at /openapi.yaml
 */
async function ui() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Banking API Assessment — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/openapi.yaml",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: html,
  };
}

/**
 * GET /openapi.yaml — raw OpenAPI document for Swagger UI / tooling
 */
async function openapi() {
  try {
    const body = fs.readFileSync(OPENAPI_PATH, "utf8");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        message: `Unable to load OpenAPI file: ${err.message}`,
      }),
    };
  }
}

module.exports = {
  ui,
  openapi,
};
