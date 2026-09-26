import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import { Mine } from "../models/Mine";
import { Incident } from "../models/Incident";
import { Alert } from "../models/Alert";
import { AuditLog } from "../models/AuditLog";
import { User } from "../models/User";

async function simulate(): Promise<void> {
  console.log("=== MINSOS Real-Time Telemetry & Event Simulator ===");
  await connectDatabase(env.mongoUri);

  const [mines, users] = await Promise.all([
    Mine.find({ status: "active" }),
    User.find({})
  ]);

  if (mines.length === 0 || users.length === 0) {
    console.log("Please run 'npm run seed' first to seed initial mines and users.");
    await mongoose.disconnect();
    return;
  }

  const safetyOfficer = users.find((u) => u.role === "safety_officer") || users[0];

  const sampleEvents = [
    {
      title: "Elevated Methane Inflow in Return Airway",
      desc: "Telemetry probe T-04 registered 0.92% CH₄ volume concentration. Automatic alarm activated.",
      sev: "high" as const,
      deltaLat: 0.003,
      deltaLng: -0.002
    },
    {
      title: "Micro-seismic Tremor along Barrier Pillar",
      desc: "Borehole geophone array detected strata shift magnitude 2.1 on Richter scale in Deep East Seam.",
      sev: "critical" as const,
      deltaLat: -0.004,
      deltaLng: 0.005
    },
    {
      title: "Conveyor Belt Idler Bearing Temperature Surge",
      desc: "Thermal sensor logged 84°C on overland conveyor drive head pulley. Dust suppression activated.",
      sev: "medium" as const,
      deltaLat: 0.001,
      deltaLng: 0.002
    },
    {
      title: "Near Miss: Reversing Haul Truck Clearance Alert",
      desc: "Proximity radar beeped warning as grader approached dump edge without standard flag observer.",
      sev: "low" as const,
      deltaLat: -0.002,
      deltaLng: -0.003
    }
  ];

  const randomMine = mines[Math.floor(Math.random() * mines.length)];
  const event = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];

  // Default coal belt base coords
  const baseLat = 23.7505;
  const baseLng = 86.4208;

  console.log(`\nInjecting real-time incident at: ${randomMine.name}`);
  console.log(`Event: ${event.title} [Severity: ${event.sev.toUpperCase()}]`);

  const incident = await Incident.create({
    mineId: randomMine._id,
    title: event.title,
    description: event.desc,
    severity: event.sev,
    status: "reported",
    occurredAt: new Date(),
    evidence: [
      {
        id: `sim-${Date.now()}`,
        fileName: "telemetry_sensor_log.png",
        mimeType: "image/png",
        sizeBytes: 184000,
        storageKey: "telemetry_sensor_log.png",
        gps: {
          latitude: Number((baseLat + event.deltaLat).toFixed(4)),
          longitude: Number((baseLng + event.deltaLng).toFixed(4))
        },
        uploadedBy: safetyOfficer._id,
        uploadedAt: new Date()
      }
    ],
    reportedBy: safetyOfficer._id,
    createdBy: safetyOfficer._id
  });

  // Create persistent system alert
  await Alert.create({
    userId: safetyOfficer._id,
    type: "critical_violation",
    title: `[Live Telemetry] ${event.title}`,
    message: `${event.desc} Site: ${randomMine.name}.`,
    isRead: false
  });

  // Log in statutory audit trail
  await AuditLog.create({
    actorId: safetyOfficer._id,
    entityType: "incident",
    entityId: incident._id.toString(),
    action: "created",
    after: { title: incident.title, severity: incident.severity, mine: randomMine.name },
    occurredAt: new Date()
  });

  console.log("✓ Real-time event successfully written to MongoDB Atlas!");
  console.log("✓ Visible immediately on Dashboard, GIS Map, and Audit Trail.\n");

  await mongoose.disconnect();
}

simulate().catch(console.error);
