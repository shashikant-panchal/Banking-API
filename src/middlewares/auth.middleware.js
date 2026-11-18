"use strict";

const jwt = require("jsonwebtoken");
const { unauthorized } = require("../lib/response");

const JWT_SECRET = process.env.JWT_SECRET || "banking-api-assessment-super-secret-key-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

/**
 * Generate a JWT token for a given user or payload.
 *
 * @param {object} payload - Data to embed in the JWT (e.g. { sub: 'cust_001', role: 'customer' })
 * @param {object} [options] - Optional JWT options override
 * @returns {string} - Signed JWT string
 */
function generateToken(payload = { sub: "admin", role: "admin" }, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options,
  });
}

/**
 * Extract and verify the JWT Bearer token from the incoming API Gateway event.
 *
 * @param {object} event - API Gateway / Serverless event
 * @returns {{ ok: true, user: object } | { ok: false, response: object }}
 */
function authenticate(event) {
  if (!event || !event.headers) {
    return {
      ok: false,
      response: unauthorized("Authorization header with Bearer token is required"),
    };
  }

  // Handle case-insensitive header keys in API Gateway / proxies
  const authHeader =
    event.headers.Authorization ||
    event.headers.authorization ||
    event.headers["AUTHORIZATION"];

  if (!authHeader) {
    return {
      ok: false,
      response: unauthorized("Authorization header with Bearer token is required"),
    };
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return {
      ok: false,
      response: unauthorized(
        "Invalid authorization format. Format must be 'Bearer <token>'"
      ),
    };
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      ok: true,
      user: decoded,
    };
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return {
        ok: false,
        response: unauthorized("Token has expired"),
      };
    }
    return {
      ok: false,
      response: unauthorized("Invalid authentication token"),
    };
  }
}

/**
 * Higher-order middleware wrapper that guards any Lambda handler with JWT authentication.
 *
 * @param {Function} handler - The async (event, context) handler to protect
 * @returns {Function} - Protected Lambda handler
 */
function withAuth(handler) {
  return async (event, context) => {
    const authResult = authenticate(event);
    if (!authResult.ok) {
      return authResult.response;
    }
    event.user = authResult.user;
    return handler(event, context);
  };
}

module.exports = {
  authenticate,
  withAuth,
  generateToken,
  JWT_SECRET,
};
