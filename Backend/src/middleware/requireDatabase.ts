import { RequestHandler } from "express";
import mongoose from "mongoose";

/**
 * Avoid buffered Mongoose queries turning an unavailable database into an
 * opaque 500 response. Database-backed routes can fail fast and tell clients
 * that the API is reachable but its data store is not.
 */
export const requireDatabase: RequestHandler = (_request, response, next) => {
  if (mongoose.connection.readyState === 1) {
    next();
    return;
  }

  response.status(503).json({
    message: "Database unavailable",
    error: "The API server is running, but it is not connected to MongoDB. Check the MongoDB connection settings and Atlas Network Access.",
  });
};
