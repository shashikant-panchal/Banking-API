"use strict";

const { ok, badRequest, parseJsonBody } = require("../lib/response");
const { generateToken } = require("../middlewares/auth.middleware");

/**
 * POST /auth/token
 *
 * Public endpoint to generate a valid JWT token for testing and authentication.
 * Request body (optional): { "username": "admin", "role": "admin" }
 */
async function createToken(event) {
  let payload = { sub: "admin", role: "admin" };

  if (event && event.body) {
    const parsed = parseJsonBody(event);
    if (parsed.ok && parsed.data) {
      const { username, role } = parsed.data;
      if (username) payload.sub = String(username);
      if (role) payload.role = String(role);
    }
  }

  const token = generateToken(payload);

  return ok({
    token,
    tokenType: "Bearer",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    user: payload,
  });
}

module.exports = {
  createToken,
};
