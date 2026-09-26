import { ErrorRequestHandler } from "express";
import mongoose from "mongoose";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  const errorName = error instanceof Error ? error.name : "";
  const errorMessage = error instanceof Error ? error.message : String(error);
  const databaseUnavailable =
    mongoose.connection.readyState !== 1 ||
    /(?:Mongoose|Mongo)(?:ServerSelection|Network)Error/.test(errorName) ||
    /(?:buffering timed out|not connected|could not connect to any servers)/i.test(errorMessage);

  if (databaseUnavailable) {
    response.status(503).json({
      message: "Database unavailable",
      error: "The API server is running, but it is not connected to MongoDB. Check the MongoDB connection settings and Atlas Network Access.",
    });
    return;
  }
  response.status(500).json({ message: "Internal server error" });
};
