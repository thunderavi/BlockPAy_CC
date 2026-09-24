import { ZodError } from "zod";

export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Invalid request data",
      details: error.flatten()
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "Duplicate value already exists",
      details: error.keyValue
    });
  }

  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Something went wrong",
    details: process.env.NODE_ENV === "production" ? undefined : error.details
  });
}
