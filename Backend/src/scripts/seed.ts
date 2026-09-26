import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import { User } from "../models/User";
import { Mine } from "../models/Mine";
import { Inspection } from "../models/Inspection";
import { Violation } from "../models/Violation";
import { CorrectiveAction } from "../models/CorrectiveAction";
import { Incident } from "../models/Incident";
import { Compliance } from "../models/Compliance";
import { Contractor } from "../models/Contractor";
import { Alert } from "../models/Alert";
import { AuditLog } from "../models/AuditLog";
import { DocumentRecord } from "../models/DocumentRecord";
import { ProductionLog } from "../models/ProductionLog";
import { EnvironmentLog } from "../models/EnvironmentLog";
import { Worker } from "../models/Worker";
import { ApprovalRequest } from "../models/ApprovalRequest";
import { SafetyObservation } from "../models/SafetyObservation";
import { WorkerTask } from "../models/WorkerTask";
import { WorkerAttendance } from "../models/WorkerAttendance";

async function seed(): Promise<void> {
  console.log("=== MINSOS Database Seeder ===");
  console.log("Connecting to MongoDB Atlas...");
  await connectDatabase(env.mongoUri);

  // 1. Clear existing demo data (or keep admin)
  console.log("Clearing existing operational collections...");
  await Promise.all([
    Inspection.deleteMany({}),
    Violation.deleteMany({}),
    CorrectiveAction.deleteMany({}),
    Incident.deleteMany({}),
    Compliance.deleteMany({}),
    Contractor.deleteMany({}),
    Alert.deleteMany({}),
    AuditLog.deleteMany({}),
    DocumentRecord.deleteMany({}),
    ProductionLog.deleteMany({}),
    EnvironmentLog.deleteMany({}),
    Worker.deleteMany({}),
    ApprovalRequest.deleteMany({}),
    SafetyObservation.deleteMany({}),
    WorkerTask.deleteMany({}),
    WorkerAttendance.deleteMany({})
  ]);

  // 2. Ensure Core Role Users
  console.log("Ensuring statutory users for all 8 roles...");
  const passwordHash = await User.hashPassword("Password@12345");

  const defaultUsers = [
    { name: "Rajesh Kumar (Safety Officer)", email: "safety@minsos.coal.gov.in", role: "safety_officer" },
    { name: "Dr. A. K. Sen (Mine Manager)", email: "manager@minsos.coal.gov.in", role: "mine_manager" },
    { name: "Suresh Verma (DGMS Inspector)", email: "inspector@minsos.coal.gov.in", role: "inspector" },
    { name: "Priya Sharma (Corporate Director)", email: "corporate@minsos.coal.gov.in", role: "corporate_officer" },
    { name: "DGMS Regional Directorate", email: "regulator@minsos.coal.gov.in", role: "regulator" },
    { name: "System Administrator", email: "admin@minsos.coal.gov.in", role: "admin" },
    { name: "Manoj Yadav (Pit Lead)", email: "worker@minsos.coal.gov.in", role: "worker" },
    { name: "Apex Earthmovers Lead", email: "contractor@minsos.coal.gov.in", role: "contractor" }
  ];

  const userMap: Record<string, string> = {};
  for (const u of defaultUsers) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create({ ...u, passwordHash });
    }
    userMap[u.role] = user.id;
  }

  const adminId = userMap["admin"];
  const safetyOfficerId = userMap["safety_officer"];
  const inspectorId = userMap["inspector"];
  const mineManagerId = userMap["mine_manager"];
  const workerUserId = userMap["worker"];

  // 3. Seed Realistic Coal India Mines with Canonical Coordinates
  console.log("Seeding Coal India subsidiary mine sites...");
  const mineData = [
    {
      name: "Jharia Colliery Seam 4 (BCCL)",
      code: "BCCL-JHARIA-04",
      location: "Dhanbad Coal Belt, Jharkhand",
      operator: "Bharat Coking Coal Limited",
      status: "active"
    },
    {
      name: "Raniganj Sripur Pit (ECL)",
      code: "ECL-RANIGANJ-01",
      location: "Asansol, West Bengal",
      operator: "Eastern Coalfields Limited",
      status: "active"
    },
    {
      name: "Korba Gevra Mega Quarry (SECL)",
      code: "SECL-GEVRA-09",
      location: "Korba, Chhattisgarh",
      operator: "South Eastern Coalfields Limited",
      status: "active"
    },
    {
      name: "Singrauli Jayant Block (NCL)",
      code: "NCL-JAYANT-02",
      location: "Singrauli, Madhya Pradesh",
      operator: "Northern Coalfields Limited",
      status: "active"
    },
    {
      name: "Talcher Bharatpur Deep Seam (MCL)",
      code: "MCL-TALCHER-03",
      location: "Angul, Odisha",
      operator: "Mahanadi Coalfields Limited",
      status: "active"
    }
  ];

  await Mine.deleteMany({});
  const createdMines = await Mine.insertMany(
    mineData.map((m) => ({ ...m, createdBy: adminId }))
  );
  console.log(`✓ Inserted ${createdMines.length} mine sites.`);

  const jharia = createdMines[0];
  const raniganj = createdMines[1];
  const korba = createdMines[2];
  const singrauli = createdMines[3];
  const talcher = createdMines[4];

  // 4. Seed Contractors
  console.log("Seeding contractor compliance roster...");
  const contractorData = [
    {
      companyName: "Eastern Earthmovers Pvt Ltd",
      contractNumber: "CIL-BCCL-2026-08",
      mineId: jharia._id,
      workType: "Overburden Removal",
      safetyRating: 92,
      activeWorkers: 65,
      complianceStatus: "compliant",
      insuranceExpiry: new Date(Date.now() + 180 * 86400000),
      contactName: "Sunil Das",
      contactPhone: "+91 98765 11223",
      contactEmail: "sunil.das@easternearth.in",
      createdBy: adminId
    },
    {
      companyName: "Gevra Heavy Haulage Logistics",
      contractNumber: "CIL-SECL-2026-15",
      mineId: korba._id,
      workType: "Haulage Fleet",
      safetyRating: 88,
      activeWorkers: 110,
      complianceStatus: "compliant",
      insuranceExpiry: new Date(Date.now() + 120 * 86400000),
      contactName: "Rameshwar Sahu",
      contactPhone: "+91 94250 88990",
      contactEmail: "ops@gevrahaul.in",
      createdBy: adminId
    },
    {
      companyName: "Bengal Shaft Sinking Specialists",
      contractNumber: "CIL-ECL-2026-03",
      mineId: raniganj._id,
      workType: "Shaft Sinking",
      safetyRating: 68,
      activeWorkers: 40,
      complianceStatus: "suspended",
      insuranceExpiry: new Date(Date.now() - 5 * 86400000), // Expired!
      contactName: "T. Banerjee",
      contactPhone: "+91 98310 44556",
      contactEmail: "t.banerjee@bengalshaft.in",
      createdBy: adminId
    },
    {
      companyName: "Singrauli Dust Suppression Consortium",
      contractNumber: "CIL-NCL-2026-22",
      mineId: singrauli._id,
      workType: "Dust Suppression",
      safetyRating: 84,
      activeWorkers: 30,
      complianceStatus: "pending",
      insuranceExpiry: new Date(Date.now() + 20 * 86400000), // Expiring soon (<30 days)
      contactName: "K. P. Mishra",
      contactPhone: "+91 97520 33441",
      contactEmail: "mishra@singraulidust.org",
      createdBy: adminId
    }
  ];
  await Contractor.insertMany(contractorData);
  console.log(`✓ Inserted ${contractorData.length} contractors.`);

  // 5. Seed Statutory Compliance Obligations
  console.log("Seeding statutory compliance clearance obligations...");
  const complianceData = [
    {
      mineId: jharia._id,
      requirement: "DGMS Statutory Annual Environmental Clearance (Form IV)",
      category: "Environmental Clearance",
      dueDate: new Date(Date.now() + 45 * 86400000),
      expiry: new Date(Date.now() + 365 * 86400000),
      status: "compliant",
      responsiblePersonId: safetyOfficerId,
      notes: "Clearance approved by Regional DGMS Inspectorate on 15-Feb.",
      createdBy: adminId
    },
    {
      mineId: jharia._id,
      requirement: "Continuous Auxiliary Ventilation Sensor Calibration",
      category: "Ventilation Standard",
      dueDate: new Date(Date.now() + 2 * 86400000), // Due in 48 hours!
      expiry: new Date(Date.now() + 90 * 86400000),
      status: "pending",
      responsiblePersonId: safetyOfficerId,
      notes: "Ventilation officer scheduled to inspect methane probe sensors.",
      createdBy: adminId
    },
    {
      mineId: korba._id,
      requirement: "Overburden Dump Stability Geotechnical Audit",
      category: "DGMS Statutory",
      dueDate: new Date(Date.now() - 3 * 86400000), // Overdue!
      expiry: new Date(Date.now() + 60 * 86400000),
      status: "pending",
      responsiblePersonId: safetyOfficerId,
      notes: "Mandatory third-party geotechnical bore-hole testing.",
      createdBy: adminId
    },
    {
      mineId: raniganj._id,
      requirement: "Explosives Magazine & Detonator Storage Certification",
      category: "Explosives & Blasting",
      dueDate: new Date(Date.now() + 15 * 86400000),
      expiry: new Date(Date.now() + 180 * 86400000),
      status: "compliant",
      responsiblePersonId: safetyOfficerId,
      notes: "PESO compliance certificate active.",
      createdBy: adminId
    }
  ];
  await Compliance.insertMany(complianceData);
  console.log(`✓ Inserted ${complianceData.length} compliance obligations.`);

  // 6. Seed Inspections, Violations & Corrective Actions
  console.log("Seeding statutory inspections and safety workflows...");
  const insp1 = await Inspection.create({
    mineId: jharia._id,
    inspectorId,
    type: "Quarterly Statutory Safety",
    scheduledFor: new Date(Date.now() - 10 * 86400000),
    completedOn: new Date(Date.now() - 9 * 86400000),
    status: "completed",
    location: "Seam 4 West Intake Gallery",
    notes: "Elevated methane detected near working face; strata bolting required.",
    gps: { latitude: 23.7505, longitude: 86.4208 },
    createdBy: inspectorId
  });

  const insp2 = await Inspection.create({
    mineId: korba._id,
    inspectorId,
    type: "DGMS Section 22 Inquiry",
    scheduledFor: new Date(Date.now() - 4 * 86400000),
    completedOn: new Date(Date.now() - 3 * 86400000),
    status: "completed",
    location: "Gevra Bench 4 Overburden",
    notes: "High wall crack observation and dump toe seepage.",
    gps: { latitude: 22.3595, longitude: 82.7501 },
    createdBy: inspectorId
  });

  // Violations
  const viol1 = await Violation.create({
    inspectionId: insp1._id,
    mineId: jharia._id,
    assignedTo: safetyOfficerId,
    title: "Methane gas level exceeding 0.85% near coal cutter",
    description: "Ventilation flow is below statutory velocity. Immediate air flow redirection required.",
    category: "Ventilation",
    severity: "critical",
    status: "open",
    deadline: new Date(Date.now() + 1 * 86400000),
    createdBy: inspectorId
  });

  const viol2 = await Violation.create({
    inspectionId: insp1._id,
    mineId: jharia._id,
    assignedTo: safetyOfficerId,
    title: "Strata spalling and loose roof stone along Haulage 3",
    description: "Unsupported roof span exceeds 4.5m between hydraulic props.",
    category: "Strata Control",
    severity: "high",
    status: "under_review",
    deadline: new Date(Date.now() + 3 * 86400000),
    createdBy: inspectorId
  });

  const viol3 = await Violation.create({
    inspectionId: insp2._id,
    mineId: korba._id,
    assignedTo: safetyOfficerId,
    title: "Overburden bench height exceeds DGMS safe slope ratio",
    description: "Bench slope angle measured at 75 degrees. Risk of slope failure during monsoon.",
    category: "Bench Safety",
    severity: "critical",
    status: "open",
    deadline: new Date(Date.now() + 2 * 86400000),
    createdBy: inspectorId
  });

  // Corrective Actions
  await CorrectiveAction.create({
    violationId: viol1._id,
    inspectionId: insp1._id,
    mineId: jharia._id,
    responsiblePersonId: safetyOfficerId,
    title: "Deploy 55kW auxiliary fan and seal return stoppings",
    deadline: new Date(Date.now() + 1 * 86400000),
    status: "open",
    createdBy: inspectorId
  });

  await CorrectiveAction.create({
    violationId: viol2._id,
    inspectionId: insp1._id,
    mineId: jharia._id,
    responsiblePersonId: safetyOfficerId,
    title: "Install supplementary 22mm resin roof bolts at 1.2m intervals",
    deadline: new Date(Date.now() + 3 * 86400000),
    status: "in_progress",
    createdBy: inspectorId
  });

  await CorrectiveAction.create({
    violationId: viol3._id,
    inspectionId: insp2._id,
    mineId: korba._id,
    responsiblePersonId: safetyOfficerId,
    title: "Regrade bench slope to 45 degrees using hydraulic excavator fleet",
    deadline: new Date(Date.now() + 2 * 86400000),
    status: "open",
    createdBy: inspectorId
  });

  // 7. Seed Field Incidents with Exact GPS Pins for Leaflet Map
  console.log("Seeding field incident reports with GPS evidence...");
  const incidentData = [
    {
      mineId: jharia._id,
      title: "Minor Roof Spall on East Return Haulage",
      description: "Appr. 120 kg shale dislodged from unsupported joint during shift change. No personnel injured.",
      severity: "high",
      status: "reported",
      occurredAt: new Date(Date.now() - 12 * 3600000),
      evidence: [
        {
          id: "ev-01",
          fileName: "roof_crack_seam4.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 245000,
          storageKey: "roof_crack_seam4.jpg",
          gps: { latitude: 23.754, longitude: 86.425 },
          uploadedBy: safetyOfficerId,
          uploadedAt: new Date()
        }
      ],
      reportedBy: safetyOfficerId,
      createdBy: safetyOfficerId
    },
    {
      mineId: korba._id,
      title: "Haul Truck Tire Blowout on Pit Incline",
      description: "100-ton dumper rear tire ruptured while traversing 1:10 ramp. Safe berm containment operated correctly.",
      severity: "medium",
      status: "investigating",
      occurredAt: new Date(Date.now() - 28 * 3600000),
      evidence: [
        {
          id: "ev-02",
          fileName: "dumper_ramp_photo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 312000,
          storageKey: "dumper_ramp_photo.jpg",
          gps: { latitude: 22.362, longitude: 82.753 },
          uploadedBy: safetyOfficerId,
          uploadedAt: new Date()
        }
      ],
      reportedBy: safetyOfficerId,
      createdBy: safetyOfficerId
    },
    {
      mineId: raniganj._id,
      title: "Electrical Spark in Conveyor Substation B",
      description: "Loose terminal on 3.3kV circuit breaker generated localized flash. Automatic flameproof breaker tripped.",
      severity: "critical",
      status: "reported",
      occurredAt: new Date(Date.now() - 6 * 3600000),
      evidence: [
        {
          id: "ev-03",
          fileName: "breaker_spark.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 198000,
          storageKey: "breaker_spark.jpg",
          gps: { latitude: 23.623, longitude: 87.127 },
          uploadedBy: safetyOfficerId,
          uploadedAt: new Date()
        }
      ],
      reportedBy: safetyOfficerId,
      createdBy: safetyOfficerId
    },
    {
      mineId: singrauli._id,
      title: "Dust Suppression Water Line Depressurization",
      description: "Main supply valve flange leak caused pressure drop along conveyor discharge point.",
      severity: "low",
      status: "closed",
      occurredAt: new Date(Date.now() - 72 * 3600000),
      evidence: [
        {
          id: "ev-04",
          fileName: "valve_flange.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 154000,
          storageKey: "valve_flange.jpg",
          gps: { latitude: 24.202, longitude: 82.668 },
          uploadedBy: safetyOfficerId,
          uploadedAt: new Date()
        }
      ],
      closureNotes: "Gasket replaced and line repressurized to 12 bar.",
      closedAt: new Date(Date.now() - 48 * 3600000),
      closedBy: safetyOfficerId,
      reportedBy: safetyOfficerId,
      createdBy: safetyOfficerId
    }
  ];

  await Incident.insertMany(incidentData);
  console.log(`✓ Inserted ${incidentData.length} incident reports with GPS pins.`);

  // 8. Seed Initial Audit Logs
  console.log("Seeding statutory audit trail ledger...");
  const auditEntries = [
    {
      actorId: adminId,
      entityType: "mine",
      entityId: jharia._id.toString(),
      action: "created",
      after: { name: jharia.name, code: jharia.code },
      occurredAt: new Date(Date.now() - 10 * 86400000)
    },
    {
      actorId: inspectorId,
      entityType: "violation",
      entityId: viol1._id.toString(),
      action: "created",
      after: { title: viol1.title, severity: viol1.severity, status: viol1.status },
      occurredAt: new Date(Date.now() - 9 * 86400000)
    },
    {
      actorId: safetyOfficerId,
      entityType: "compliance",
      entityId: jharia._id.toString(),
      action: "updated",
      before: { status: "pending" },
      after: { status: "compliant" },
      occurredAt: new Date(Date.now() - 5 * 86400000)
    }
  ];
  await AuditLog.insertMany(auditEntries);
  console.log(`✓ Inserted ${auditEntries.length} audit entries.`);

  // 9. Seed Statutory Documents Vault
  console.log("Seeding Statutory Documents Vault...");
  const documentRecords = [
    {
      title: "DGMS Section 22 Standing Safety Order (Opencast Bench Heights)",
      referenceNo: "DGMS/SE/2026/044",
      category: "DGMS Directive",
      issuer: "Directorate General of Mines Safety (Dhanbad)",
      validUntil: "31 Mar 2027",
      fileSize: "2.4 MB",
      format: "PDF",
      status: "active",
      mineId: jharia._id,
      storageUrl: "/docs/dgms-bench-height-order-2026.pdf",
      uploadedBy: safetyOfficerId
    },
    {
      title: "PESO Explosive Magazine License & Storage Permit (Form LE-3)",
      referenceNo: "PESO/MAG/LE3-8891",
      category: "PESO License",
      issuer: "Petroleum & Explosives Safety Organisation",
      validUntil: "15 Oct 2026",
      fileSize: "1.8 MB",
      format: "PDF",
      status: "expiring_soon",
      mineId: jharia._id,
      storageUrl: "/docs/peso-magazine-le3-permit.pdf",
      uploadedBy: mineManagerId
    },
    {
      title: "State Pollution Control Board Consent to Operate (CTO Air/Water)",
      referenceNo: "SPCB/CTO/2026/912",
      category: "Environmental Clearance",
      issuer: "Chhattisgarh Environment Conservation Board",
      validUntil: "30 Jun 2028",
      fileSize: "3.2 MB",
      format: "PDF",
      status: "active",
      mineId: korba._id,
      storageUrl: "/docs/spcb-cto-gevra-expansion.pdf",
      uploadedBy: adminId
    },
    {
      title: "Standard Operating Procedure: Heavy Earth Moving Machinery (HEMM) Night Operation",
      referenceNo: "SOP/HEMM/2026-REV4",
      category: "Safety Standard",
      issuer: "Mine Safety Board & CIL Safety Directorate",
      validUntil: "31 Dec 2027",
      fileSize: "4.1 MB",
      format: "PDF",
      status: "active",
      mineId: singrauli._id,
      storageUrl: "/docs/sop-hemm-night-ops-rev4.pdf",
      uploadedBy: mineManagerId
    },
    {
      title: "Quarterly Statutory Electrical & Strata Safety Audit Report Q3",
      referenceNo: "AUDIT/STRATA/2026-Q3",
      category: "Safety Standard",
      issuer: "Directorate General of Mines Safety (Eastern Circle)",
      validUntil: "31 Oct 2026",
      fileSize: "5.6 MB",
      format: "PDF",
      status: "active",
      mineId: raniganj._id,
      storageUrl: "/docs/strata-electrical-audit-q3.pdf",
      uploadedBy: safetyOfficerId
    },
    {
      title: "DGMS Permission for Deep Hole Blasting near Inhabited Zone",
      referenceNo: "DGMS/PERM/DHB-104",
      category: "DGMS Directive",
      issuer: "DGMS South Eastern Zone (Bhubaneswar)",
      validUntil: "25 Sep 2026",
      fileSize: "1.5 MB",
      format: "PDF",
      status: "expiring_soon",
      mineId: talcher._id,
      storageUrl: "/docs/dgms-deep-hole-blasting-clearance.pdf",
      uploadedBy: safetyOfficerId
    }
  ];
  await DocumentRecord.insertMany(documentRecords);
  console.log(`✓ Inserted ${documentRecords.length} statutory vault documents.`);

  // 10. Seed Production Operations Logs
  console.log("Seeding Production Operations Logs...");
  const productionLogs = [
    {
      mineId: jharia._id,
      date: new Date(),
      shift: "shift_a",
      pitOrSeam: "Jharia Seam 4 (BCCL)",
      coalGrade: "Coking Coal Steel-I",
      targetTonnage: 12000,
      achievedTonnage: 11450,
      overburdenM3: 28000,
      equipmentDeployed: "4 Excavators, 18 100T Dumpers",
      status: "Normal",
      recordedBy: mineManagerId
    },
    {
      mineId: korba._id,
      date: new Date(),
      shift: "shift_a",
      pitOrSeam: "Korba Gevra Mega Quarry (SECL)",
      coalGrade: "Non-Coking G11",
      targetTonnage: 22000,
      achievedTonnage: 22800,
      overburdenM3: 54000,
      equipmentDeployed: "7 Shovels, 36 240T Dumpers",
      status: "On Target",
      recordedBy: mineManagerId
    },
    {
      mineId: raniganj._id,
      date: new Date(),
      shift: "shift_a",
      pitOrSeam: "Raniganj Sripur Pit (ECL)",
      coalGrade: "Thermal Coal G7",
      targetTonnage: 8500,
      achievedTonnage: 7900,
      overburdenM3: 16500,
      equipmentDeployed: "3 Shovels, 12 Dumpers",
      status: "Delayed",
      recordedBy: mineManagerId
    },
    {
      mineId: singrauli._id,
      date: new Date(),
      shift: "shift_a",
      pitOrSeam: "Singrauli Jayant Block (NCL)",
      coalGrade: "Power Grade G8",
      targetTonnage: 15000,
      achievedTonnage: 14600,
      overburdenM3: 35000,
      equipmentDeployed: "5 Shovels, 22 Dumpers",
      status: "Normal",
      recordedBy: mineManagerId
    },
    {
      mineId: talcher._id,
      date: new Date(),
      shift: "shift_a",
      pitOrSeam: "Talcher Bharatpur Deep Seam (MCL)",
      coalGrade: "Thermal Coal G12",
      targetTonnage: 9500,
      achievedTonnage: 9100,
      overburdenM3: 21000,
      equipmentDeployed: "3 Shovels, 14 Dumpers",
      status: "Normal",
      recordedBy: mineManagerId
    }
  ];
  await ProductionLog.insertMany(productionLogs);
  console.log(`✓ Inserted ${productionLogs.length} production logs.`);

  // 11. Seed Continuous Environmental Monitoring Stations
  console.log("Seeding Continuous Environmental Stations...");
  const envLogs = [
    {
      mineId: jharia._id,
      stationName: "Jharia CAAQMS Station 1 (Pit Head)",
      stationType: "air_quality",
      aqi: 142,
      pm10: 168,
      pm25: 72,
      so2: 24,
      waterPh: 7.2,
      tssMgL: 22,
      oilAndGreaseMgL: 1.2,
      mistCannonsActivePercent: 94,
      readingDetails: "Wind speed 2.4 m/s NW. Dust suppression active along North hauler.",
      status: "Normal",
      complianceStatus: "Compliant",
      recordedAt: new Date()
    },
    {
      mineId: korba._id,
      stationName: "Korba Gevra Boundary CAAQMS",
      stationType: "air_quality",
      aqi: 185,
      pm10: 195,
      pm25: 88,
      so2: 32,
      waterPh: 7.0,
      tssMgL: 28,
      oilAndGreaseMgL: 1.8,
      mistCannonsActivePercent: 98,
      readingDetails: "High dry wind; 4 additional mist cannons deployed at crusher.",
      status: "Elevated",
      complianceStatus: "Under Observation",
      recordedAt: new Date()
    },
    {
      mineId: raniganj._id,
      stationName: "Raniganj ETP Discharge Point",
      stationType: "water_effluent",
      aqi: 95,
      pm10: 110,
      pm25: 45,
      so2: 18,
      waterPh: 7.4,
      tssMgL: 18,
      oilAndGreaseMgL: 0.9,
      mistCannonsActivePercent: 100,
      readingDetails: "Effluent neutralization chamber pH nominal. Zero overflow.",
      status: "Normal",
      complianceStatus: "Compliant",
      recordedAt: new Date()
    },
    {
      mineId: singrauli._id,
      stationName: "Singrauli Jayant Dust Suppression Ring",
      stationType: "dust_suppression",
      aqi: 120,
      pm10: 135,
      pm25: 55,
      so2: 21,
      waterPh: 7.1,
      tssMgL: 20,
      oilAndGreaseMgL: 1.1,
      mistCannonsActivePercent: 96,
      readingDetails: "Continuous mist ring operating on eastern stockpile.",
      status: "Normal",
      complianceStatus: "Compliant",
      recordedAt: new Date()
    },
    {
      mineId: talcher._id,
      stationName: "Talcher Sump Groundwater Monitoring Station",
      stationType: "groundwater",
      aqi: 110,
      pm10: 140,
      pm25: 60,
      so2: 20,
      waterPh: 6.6,
      tssMgL: 35,
      oilAndGreaseMgL: 2.1,
      mistCannonsActivePercent: 92,
      readingDetails: "Piezometer water level -14.2m. Sediment settling tank operational.",
      status: "Elevated",
      complianceStatus: "Under Observation",
      recordedAt: new Date()
    }
  ];
  await EnvironmentLog.insertMany(envLogs);
  console.log(`✓ Inserted ${envLogs.length} environmental monitoring logs.`);

  // 12. Seed Frontline Workers Muster Roster
  console.log("Seeding Frontline Workers Muster Roster...");
  const workers = [
    {
      employeeCode: "EMP-BCCL-101",
      name: "Manoj Yadav",
      trade: "Senior Dumper Operator",
      mineId: jharia._id,
      shift: "Shift A (Morning)",
      attendanceStatus: "Present (Biometric Verified)",
      trainingStatus: "Valid",
      trainingValidUntil: "31 Dec 2026",
      medicalFitness: "Valid Class I",
      bloodGroup: "B +ve",
      emergencyContact: "+91 98351 22334",
      active: true
    },
    {
      employeeCode: "EMP-BCCL-102",
      name: "Ramesh Hansda",
      trade: "Blaster Grade-I",
      mineId: jharia._id,
      shift: "Shift A (Morning)",
      attendanceStatus: "Present (Biometric Verified)",
      trainingStatus: "Valid",
      trainingValidUntil: "20 Jan 2027",
      medicalFitness: "Valid Class I",
      bloodGroup: "O +ve",
      emergencyContact: "+91 94311 55667",
      active: true
    },
    {
      employeeCode: "EMP-SECL-201",
      name: "Amit Kumar Minz",
      trade: "Excavator Shovel Operator",
      mineId: korba._id,
      shift: "Shift A (Morning)",
      attendanceStatus: "Present (Biometric Verified)",
      trainingStatus: "Valid",
      trainingValidUntil: "15 Oct 2026",
      medicalFitness: "Valid Class I",
      bloodGroup: "A +ve",
      emergencyContact: "+91 97520 88991",
      active: true
    },
    {
      employeeCode: "EMP-SECL-202",
      name: "Dilip Mahato",
      trade: "Ventilation & Gas Inspector",
      mineId: korba._id,
      shift: "Shift B (Evening)",
      attendanceStatus: "Present (Biometric Verified)",
      trainingStatus: "Valid",
      trainingValidUntil: "18 Dec 2026",
      medicalFitness: "Valid Class I",
      bloodGroup: "AB +ve",
      emergencyContact: "+91 94252 66778",
      active: true
    },
    {
      employeeCode: "EMP-ECL-301",
      name: "Subhash Ghosh",
      trade: "Chief Pit Electrician",
      mineId: raniganj._id,
      shift: "Shift A (Morning)",
      attendanceStatus: "Present (Biometric Verified)",
      trainingStatus: "Refresher Required",
      trainingValidUntil: "28 Sep 2026",
      medicalFitness: "Valid Class II",
      bloodGroup: "O +ve",
      emergencyContact: "+91 93321 44332",
      active: true
    },
    {
      employeeCode: "EMP-NCL-401",
      name: "Vikram Singh",
      trade: "Mines Rescue Captain",
      mineId: singrauli._id,
      shift: "Shift A (Morning)",
      attendanceStatus: "Present (Biometric Verified)",
      trainingStatus: "Valid",
      trainingValidUntil: "15 Mar 2027",
      medicalFitness: "Valid Class I",
      bloodGroup: "B +ve",
      emergencyContact: "+91 94500 12345",
      active: true
    }
  ];
  await Worker.insertMany(workers);
  console.log(`✓ Inserted ${workers.length} muster roll workers.`);

  // 13. Seed Approvals Queue
  console.log("Seeding Approvals Queue...");
  const approvalRequests = [
    {
      title: "Controlled Production Blasting Clearance - Bench 3 North",
      category: "Blasting Permit",
      urgency: "critical",
      mineId: jharia._id,
      submittedBy: safetyOfficerId,
      status: "pending",
      notes: "DGMS safety buffer verified. Seismic sensors calibrated along north wall. Requires manager review."
    },
    {
      title: "Explosive Magazine Indent - 4.5 MT Emulsion Booster",
      category: "Blasting Permit",
      urgency: "high",
      mineId: jharia._id,
      submittedBy: mineManagerId,
      reviewedBy: adminId,
      status: "approved",
      notes: "Fortnightly replenishment of licensed storage magazine under PESO permit LE-3 limits.",
      reviewedAt: new Date(Date.now() - 24 * 3600000)
    },
    {
      title: "Overtime Authorization - Haul Road Resurfacing Crew",
      category: "Overtime Clearance",
      urgency: "normal",
      mineId: korba._id,
      submittedBy: mineManagerId,
      status: "pending",
      notes: "Grading required before monsoon downpour to avoid bench erosion. 4 hours extension."
    },
    {
      title: "Confined Space Sump Pump Inspection Clearance",
      category: "Corrective Action Verification",
      urgency: "high",
      mineId: raniganj._id,
      submittedBy: safetyOfficerId,
      reviewedBy: adminId,
      status: "approved",
      notes: "Multi-gas sensor clearance confirmed zero methane and CO accumulation.",
      reviewedAt: new Date(Date.now() - 12 * 3600000)
    }
  ];
  await ApprovalRequest.insertMany(approvalRequests);
  console.log(`✓ Inserted ${approvalRequests.length} approval requests.`);

  // 14. Seed Safety Observations
  console.log("Seeding Safety Observations...");
  const observations = [
    {
      title: "Worker operating unchocked tipper near 15m bench crest",
      category: "Haulage Road",
      location: "Jharia Bench 4 East",
      mineId: jharia._id,
      severity: "high",
      reportedBy: safetyOfficerId,
      status: "Open Observation",
      notes: "Wheel chocks missing while waiting for excavator spotting. Stop-work instruction issued."
    },
    {
      title: "Damaged rubber lagging on Tail Pulley Conveyor 3B",
      category: "Electrical Flameproof",
      location: "Korba Coal Handling Plant",
      mineId: korba._id,
      severity: "medium",
      reportedBy: safetyOfficerId,
      status: "Investigating",
      notes: "Excess friction heat detected by thermographic camera. Maintenance shift notified."
    },
    {
      title: "Minor tension crack observed along haul road shoulder",
      category: "Strata Control",
      location: "Singrauli Jayant Cut 2",
      mineId: singrauli._id,
      severity: "critical",
      reportedBy: safetyOfficerId,
      status: "Open Observation",
      notes: "Immediate geotechnical survey summoned. Area barricaded."
    },
    {
      title: "Frontline methane detector calibrated at return airway",
      category: "Gas Telemetry",
      location: "Raniganj Seam 3 Underground Return",
      mineId: raniganj._id,
      severity: "low",
      reportedBy: safetyOfficerId,
      status: "Rectified",
      notes: "Sensor recalibrated against certified calibration gas bottle. Reading nominal 0.08% CH4.",
      rectifiedAt: new Date(Date.now() - 6 * 3600000)
    }
  ];
  await SafetyObservation.insertMany(observations);
  console.log(`✓ Inserted ${observations.length} safety observations.`);

  // 15. Seed Worker Frontline Tasks & Attendance (for Manoj Yadav)
  console.log("Seeding Worker Frontline Workspace data...");
  const todayStr = new Date().toISOString().slice(0, 10);
  const workerTasks = [
    {
      userId: workerUserId,
      title: "Pre-Shift Equipment Circle Walk & Fluid Levels Check",
      category: "Machinery Inspection",
      done: true,
      time: "06:15 AM",
      date: todayStr,
      completedAt: new Date(Date.now() - 3 * 3600000)
    },
    {
      userId: workerUserId,
      title: "Multi-Gas Detector Bump Test & Battery Health Verification",
      category: "Safety Protocol",
      done: true,
      time: "06:30 AM",
      date: todayStr,
      completedAt: new Date(Date.now() - 2.5 * 3600000)
    },
    {
      userId: workerUserId,
      title: "Check Heavy Duty Tyres & Wheel Lug Nuts Torque",
      category: "Machinery Inspection",
      done: false,
      time: "11:00 AM",
      date: todayStr
    },
    {
      userId: workerUserId,
      title: "Verify Haul Road Berm Height (>3m) & Dust Suppression Sprinkler Active",
      category: "Hazard Review",
      done: false,
      time: "01:30 PM",
      date: todayStr
    },
    {
      userId: workerUserId,
      title: "Emergency Escape Radio & Audio Horn Check",
      category: "Safety Protocol",
      done: false,
      time: "02:00 PM",
      date: todayStr
    }
  ];
  await WorkerTask.insertMany(workerTasks);
  console.log(`✓ Inserted ${workerTasks.length} frontline worker tasks.`);

  const yestDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgoStr = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const threeDaysAgoStr = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

  const attendances = [
    {
      userId: workerUserId,
      date: todayStr,
      shift: "Shift A (Morning)",
      inTime: "05:45 AM",
      outTime: "In Shift",
      gate: "Turnstile Pit-Head #1",
      status: "Present (Biometric)"
    },
    {
      userId: workerUserId,
      date: yestDate,
      shift: "Shift A (Morning)",
      inTime: "05:52 AM",
      outTime: "02:15 PM",
      gate: "Turnstile Pit-Head #1",
      status: "Present (Biometric)"
    },
    {
      userId: workerUserId,
      date: twoDaysAgoStr,
      shift: "Shift A (Morning)",
      inTime: "05:50 AM",
      outTime: "02:10 PM",
      gate: "Turnstile Pit-Head #1",
      status: "Present (Biometric)"
    },
    {
      userId: workerUserId,
      date: threeDaysAgoStr,
      shift: "Shift A (Morning)",
      inTime: "06:10 AM",
      outTime: "02:15 PM",
      gate: "Turnstile Pit-Head #1",
      status: "Late (Verified)"
    }
  ];
  await WorkerAttendance.insertMany(attendances);
  console.log(`✓ Inserted ${attendances.length} worker muster records.`);

  console.log("\n==========================================");
  console.log("✓ Real-Time Database Seed Completed Successfully!");
  console.log("Demo Credentials for Testing:");
  console.log("  • Safety Officer:  safety@minsos.coal.gov.in  / Password@12345");
  console.log("  • Mine Manager:    manager@minsos.coal.gov.in / Password@12345");
  console.log("  • DGMS Inspector:  inspector@minsos.coal.gov.in / Password@12345");
  console.log("  • Corporate:       corporate@minsos.coal.gov.in / Password@12345");
  console.log("  • Admin:           admin@minsos.coal.gov.in   / Password@12345");
  console.log("==========================================");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
