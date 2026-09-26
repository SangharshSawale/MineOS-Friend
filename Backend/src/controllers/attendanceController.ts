import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { GEO_ATTENDANCE_STATUSES, WorkerAttendance } from "../models/WorkerAttendance";
import { Mine } from "../models/Mine";
import { Worker } from "../models/Worker";
import { configureCloudinary, cloudinary } from "../config/cloudinary";
import { validId } from "../services/workflowService";

// === Haversine Formula ===
// Calculates the great-circle distance between two GPS points in metres.
function haversineDistanceMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GPS accuracy threshold — if the device reports accuracy worse than this,
// we cannot reliably verify geofence and flag MANUAL_REVIEW.
const GPS_ACCURACY_THRESHOLD_METRES = 200;

function isValidCoordinate(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isValidImageUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function checkInAttendance(request: AuthenticatedRequest, response: Response): Promise<void> {
  const body = request.body as {
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    mineId?: string;
    timestamp?: string;
  };

  if (!isValidImageUrl(body.imageUrl)) {
    response.status(400).json({ message: "A valid imageUrl is required" });
    return;
  }

  if (!isValidCoordinate(body.latitude, -90, 90) || !isValidCoordinate(body.longitude, -180, 180)) {
    response.status(400).json({ message: "Valid latitude and longitude are required" });
    return;
  }

  const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    response.status(400).json({ message: "Invalid timestamp" });
    return;
  }

  const workerId = request.user!.id;
  const today = todayDateString();

  try {
    // === Prevent duplicate same-day check-in ===
    const existing = await WorkerAttendance.findOne({
      workerId,
      date: today,
      status: { $in: ["AUTO_VERIFIED", "Present", "MANUAL_REVIEW"] }
    });
    if (existing) {
      response.status(409).json({
        message: "You have already checked in today. Duplicate attendance records are not permitted."
      });
      return;
    }

    // === Resolve the worker's mine ===
    let resolvedMineId: string | undefined;
    let mine: InstanceType<typeof Mine> | null = null;

    if (body.mineId && validId(body.mineId)) {
      mine = await Mine.findById(body.mineId);
      if (mine) resolvedMineId = String(mine._id);
    }

    // Fall back: look up mine from Worker record
    if (!mine) {
      const workerRecord = await Worker.findOne({ $or: [{ userId: workerId }, { _id: workerId }] });
      if (workerRecord?.mineId) {
        mine = await Mine.findById(workerRecord.mineId);
        if (mine) resolvedMineId = String(mine._id);
      }
    }

    // Fall back further: use any single active mine
    if (!mine) {
      mine = await Mine.findOne({ status: "active" });
      if (mine) resolvedMineId = String(mine._id);
    }

    // === Geofence + GPS accuracy verification ===
    let distanceFromMine: number | undefined;
    let verificationStatus: string = "MANUAL_REVIEW";
    let verificationMethod: "GPS_PHOTO" | "MANUAL" = "GPS_PHOTO";

    if (mine?.coordinates?.latitude != null && mine?.coordinates?.longitude != null) {
      distanceFromMine = Math.round(
        haversineDistanceMetres(
          mine.coordinates.latitude,
          mine.coordinates.longitude,
          body.latitude!,
          body.longitude!
        )
      );

      const radius = mine.attendanceRadius ?? 100;
      const accuracy = body.accuracyMeters;
      const hasGoodAccuracy = accuracy == null || accuracy <= GPS_ACCURACY_THRESHOLD_METRES;

      if (!hasGoodAccuracy) {
        verificationStatus = "MANUAL_REVIEW"; // poor GPS accuracy
      } else if (distanceFromMine <= radius) {
        verificationStatus = "AUTO_VERIFIED"; // inside geofence
      } else {
        verificationStatus = "REJECTED"; // outside geofence
      }
    } else {
      // Mine has no GPS configured — needs manual review
      verificationStatus = "MANUAL_REVIEW";
    }

    const record = await WorkerAttendance.create({
      workerId,
      mineId: resolvedMineId,
      imageUrl: body.imageUrl.trim(),
      location: {
        latitude: body.latitude,
        longitude: body.longitude
      },
      distanceFromMine,
      gpsAccuracy: typeof body.accuracyMeters === "number" ? body.accuracyMeters : undefined,
      verificationMethod,
      status: verificationStatus,
      timestamp,
      date: today,
      inTime: timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    });

    const populated = await WorkerAttendance.findById(record.id)
      .populate("workerId", "name email role")
      .populate("mineId", "name code coordinates attendanceRadius")
      .lean();

    response.status(201).json({
      ...(populated ?? record.toObject()),
      distanceFromMine,
      verificationStatus,
      message: verificationStatus === "AUTO_VERIFIED"
        ? "Attendance verified — you are within the mine geofence."
        : verificationStatus === "REJECTED"
          ? "Check-in rejected — you are outside the mine geofence."
          : "Check-in submitted for manual review by your Safety Officer."
    });
  } catch (error) {
    response.status(400).json({ message: error instanceof Error ? error.message : "Unable to save attendance" });
  }
}

export async function listPendingAttendance(request: AuthenticatedRequest, response: Response): Promise<void> {
  const records = await WorkerAttendance.find({
    status: { $in: ["Pending", "MANUAL_REVIEW"] },
    imageUrl: { $exists: true, $nin: [null, ""] }
  })
    .populate("workerId", "name email role")
    .populate("mineId", "name code attendanceRadius")
    .sort({ timestamp: -1 })
    .lean();

  response.json({ data: records });
}

export async function listAllAttendance(request: AuthenticatedRequest, response: Response): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 200);
  const filter: Record<string, unknown> = {};

  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.status) filter.status = request.query.status;
  if (request.query.date) filter.date = request.query.date;

  const [records, total] = await Promise.all([
    WorkerAttendance.find(filter)
      .populate("workerId", "name email role")
      .populate("mineId", "name code attendanceRadius")
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WorkerAttendance.countDocuments(filter)
  ]);

  response.json({ data: records, total, page, limit });
}

export async function updateAttendanceStatus(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Attendance record not found" });
    return;
  }

  const { status } = request.body as { status?: string };
  if (!status || !GEO_ATTENDANCE_STATUSES.includes(status as typeof GEO_ATTENDANCE_STATUSES[number])) {
    response.status(400).json({ message: `status must be one of: ${GEO_ATTENDANCE_STATUSES.join(", ")}` });
    return;
  }

  const record = await WorkerAttendance.findByIdAndUpdate(
    request.params.id,
    { status, verificationMethod: "MANUAL" },
    { new: true, runValidators: true }
  )
    .populate("workerId", "name email role")
    .populate("mineId", "name code")
    .lean();

  if (!record) {
    response.status(404).json({ message: "Attendance record not found" });
    return;
  }

  response.json(record);
}

export async function uploadAttendanceImage(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.file) {
    response.status(400).json({ message: "Image file is required" });
    return;
  }

  if (!configureCloudinary()) {
    response.status(503).json({
      message: "Cloudinary is not configured on the server. Upload the image from the mobile app or set CLOUDINARY_* env vars."
    });
    return;
  }

  try {
    const result = await cloudinary.uploader.upload(
      `data:${request.file.mimetype};base64,${request.file.buffer.toString("base64")}`,
      {
        folder: "minsos/attendance",
        resource_type: "image"
      }
    );

    response.status(201).json({
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : "Cloudinary upload failed" });
  }
}
