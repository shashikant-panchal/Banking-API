"use strict";

class AppError extends Error {
  constructor(statusCode, error, message) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.error = error;
  }
}

function badRequest(message) {
  return new AppError(400, "BAD_REQUEST", message);
}

function unauthorized(message = "Unauthorized: Missing or invalid token") {
  return new AppError(401, "UNAUTHORIZED", message);
}

function notFound(message) {
  return new AppError(404, "NOT_FOUND", message);
}

function conflict(message) {
  return new AppError(409, "CONFLICT", message);
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  notFound,
  conflict,
};
