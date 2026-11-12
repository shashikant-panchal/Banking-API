"use strict";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}

function ok(body) {
  return json(200, body);
}

function created(body) {
  return json(201, body);
}

function badRequest(message, error = "BAD_REQUEST") {
  return json(400, { error, message });
}

function notFound(message, error = "NOT_FOUND") {
  return json(404, { error, message });
}

function conflict(message, error = "CONFLICT") {
  return json(409, { error, message });
}

function notImplemented(message = "Not implemented — replace this stub") {
  return json(501, { error: "NOT_IMPLEMENTED", message });
}

function serverError(message = "Unexpected server error") {
  return json(500, { error: "INTERNAL_SERVER_ERROR", message });
}

/**
 * Parse JSON body from an API Gateway / serverless-offline event.
 * Returns { ok: true, data } or { ok: false, response } with a 400 response.
 */
function parseJsonBody(event) {
  if (!event || event.body === undefined || event.body === null || event.body === "") {
    return { ok: false, response: badRequest("Request body is required") };
  }

  if (typeof event.body === "object") {
    if (Array.isArray(event.body) || event.body === null) {
      return { ok: false, response: badRequest("Request body must be a JSON object") };
    }
    return { ok: true, data: event.body };
  }

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, response: badRequest("Request body must be a JSON object") };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, response: badRequest("Request body must be valid JSON") };
  }
}

module.exports = {
  json,
  ok,
  created,
  badRequest,
  notFound,
  conflict,
  notImplemented,
  serverError,
  parseJsonBody,
};
