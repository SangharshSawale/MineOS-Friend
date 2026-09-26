import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env";
import { User, UserRole } from "../models/User";

function createToken(id: string, role: UserRole): string {
  return jwt.sign({ role }, env.jwtSecret, {
    subject: id,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export async function register(request: Request, response: Response): Promise<void> {
  try {
    const { name, email, password } = request.body as {
      name?: string; email?: string; password?: string;
    };
    if (!name || !email || !password || password.length < 8) {
      response.status(400).json({ message: "name, email and a password of at least 8 characters are required" });
      return;
    }
    if (await User.exists({ email: email.toLowerCase() })) {
      response.status(409).json({ message: "Email is already registered" });
      return;
    }

    const requestedRole = (request.body as { role?: UserRole }).role;
    const isFirstUser = !(await User.exists({}));
    const role: UserRole = isFirstUser ? "admin" : (requestedRole && ["admin", "mine_manager", "safety_officer", "corporate_officer", "regulator", "worker", "inspector", "contractor"].includes(requestedRole) ? requestedRole : "worker");
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role });
    response.status(201).json({
      token: createToken(user.id, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error: unknown) {
    console.error("Register Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    response.status(500).json({ message: "Internal server error", error: message });
  }
}

export async function login(request: Request, response: Response): Promise<void> {
  try {
    // Runtime DB guard — requireDatabase middleware already blocks before we
    // reach here, but this acts as a safety net for any in-flight disconnects.
    if (mongoose.connection.readyState !== 1) {
      response.status(503).json({
        message: "Database unavailable",
        error: "The API server is running but is not connected to MongoDB.",
      });
      return;
    }

    // Verify JWT_SECRET is present before attempting token generation.
    if (!env.jwtSecret) {
      console.error("Login Error: JWT_SECRET environment variable is not set.");
      response.status(500).json({
        message: "Internal server error",
        error: "Server misconfiguration: JWT secret is missing.",
      });
      return;
    }

    const { email, password } = request.body as { email?: string; password?: string };
    const user = email
      ? await User.findOne({ email: email.toLowerCase() }).select("+passwordHash")
      : null;

    if (!user || !password || !(await user.comparePassword(password))) {
      response.status(401).json({ message: "Invalid email or password" });
      return;
    }

    response.json({
      token: createToken(user.id, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: unknown) {
    console.error("Login Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    response.status(500).json({ message: "Internal server error", error: message });
  }
}