"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  authenticate,
  withAuth,
  generateToken,
} = require("../src/middlewares/auth.middleware");

describe("Auth Middleware", () => {
  test("generates a valid JWT token that can be authenticated", () => {
    const token = generateToken({ sub: "user_123", role: "customer" });
    assert.ok(typeof token === "string");

    const event = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const result = authenticate(event);
    assert.equal(result.ok, true);
    assert.equal(result.user.sub, "user_123");
    assert.equal(result.user.role, "customer");
  });

  test("handles lowercase authorization header", () => {
    const token = generateToken({ sub: "user_456" });
    const event = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const result = authenticate(event);
    assert.equal(result.ok, true);
    assert.equal(result.user.sub, "user_456");
  });

  test("returns 401 if headers are missing", () => {
    const event = {};
    const result = authenticate(event);
    assert.equal(result.ok, false);
    assert.equal(result.response.statusCode, 401);

    const body = JSON.parse(result.response.body);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  test("returns 401 if Authorization header is missing", () => {
    const event = { headers: {} };
    const result = authenticate(event);
    assert.equal(result.ok, false);
    assert.equal(result.response.statusCode, 401);

    const body = JSON.parse(result.response.body);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  test("returns 401 if format is not Bearer token", () => {
    const event = {
      headers: {
        Authorization: "Basic dXNlcjpwYXNz",
      },
    };
    const result = authenticate(event);
    assert.equal(result.ok, false);
    assert.equal(result.response.statusCode, 401);

    const body = JSON.parse(result.response.body);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  test("returns 401 if token is invalid or tampered", () => {
    const event = {
      headers: {
        Authorization: "Bearer invalid-tampered-token",
      },
    };
    const result = authenticate(event);
    assert.equal(result.ok, false);
    assert.equal(result.response.statusCode, 401);

    const body = JSON.parse(result.response.body);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  test("withAuth decorator blocks unauthenticated requests and executes authenticated ones", async () => {
    let executed = false;
    const mockHandler = async (event) => {
      executed = true;
      return { statusCode: 200, body: JSON.stringify({ user: event.user }) };
    };

    const protectedHandler = withAuth(mockHandler);

    // Unauthenticated call
    const unauthRes = await protectedHandler({});
    assert.equal(unauthRes.statusCode, 401);
    assert.equal(executed, false);

    // Authenticated call
    const token = generateToken({ sub: "test_user" });
    const authRes = await protectedHandler({
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(authRes.statusCode, 200);
    assert.equal(executed, true);

    const body = JSON.parse(authRes.body);
    assert.equal(body.user.sub, "test_user");
  });
});
