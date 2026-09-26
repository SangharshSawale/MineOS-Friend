import { Response } from "express";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth";
import { Mine } from "../models/Mine";

export async function listMines(_request: AuthenticatedRequest, response: Response): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database connection is not established");
    }

    const mines = await Mine.find({}).sort({ createdAt: -1 });
    response.json(mines);
  } catch (error: unknown) {
    const requestError = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to list mines:", requestError);
    response.status(500).json({
      message: "Internal server error",
      error: requestError.message,
      stack: requestError.stack,
    });
  }
}

export async function getMine(request: AuthenticatedRequest, response: Response): Promise<void> {
  const mine = await Mine.findById(request.params.id);
  if (!mine) {
    response.status(404).json({ message: "Mine not found" });
    return;
  }
  response.json(mine);
}

export async function createMine(request: AuthenticatedRequest, response: Response): Promise<void> {
  const { name, code, location, operator, coordinates } = request.body as Record<string, any>;
  if (!name || !code || !location || !operator) {
    response.status(400).json({ message: "name, code, location and operator are required" });
    return;
  }
  try {
    let parsedCoordinates: { latitude: number; longitude: number } | undefined;
    if (coordinates && coordinates.latitude != null && coordinates.longitude != null) {
      const lat = Number(coordinates.latitude);
      const lng = Number(coordinates.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        parsedCoordinates = { latitude: lat, longitude: lng };
      }
    }

    const mine = await Mine.create({
      name,
      code,
      location,
      operator,
      coordinates: parsedCoordinates,
      createdBy: request.user!.id
    });
    response.status(201).json(mine);
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      response.status(409).json({ message: "Mine code is already registered" });
      return;
    }
    throw error;
  }
}

export async function updateMine(request: AuthenticatedRequest, response: Response): Promise<void> {
  const updateData: Record<string, any> = { ...request.body };
  if (updateData.coordinates) {
    const lat = Number(updateData.coordinates.latitude);
    const lng = Number(updateData.coordinates.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      updateData.coordinates = { latitude: lat, longitude: lng };
    } else {
      delete updateData.coordinates;
    }
  }

  const mine = await Mine.findByIdAndUpdate(request.params.id, updateData, { new: true, runValidators: true });
  if (!mine) {
    response.status(404).json({ message: "Mine not found" });
    return;
  }
  response.json(mine);
}

export async function deleteMine(request: AuthenticatedRequest, response: Response): Promise<void> {
  const mine = await Mine.findByIdAndDelete(request.params.id);
  if (!mine) {
    response.status(404).json({ message: "Mine not found" });
    return;
  }
  response.status(204).send();
}
