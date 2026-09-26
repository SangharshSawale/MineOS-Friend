import { connectDatabase } from '../config/database';
import { env } from '../config/env';
import { User } from '../models/User';
import { Mine } from '../models/Mine';
import { DocumentRecord } from '../models/DocumentRecord';
import { ProductionLog } from '../models/ProductionLog';
import { EnvironmentLog } from '../models/EnvironmentLog';
import { Worker } from '../models/Worker';
import { ApprovalRequest } from '../models/ApprovalRequest';
import { SafetyObservation } from '../models/SafetyObservation';
import { WorkerTask } from '../models/WorkerTask';
import { WorkerAttendance } from '../models/WorkerAttendance';
import { Alert } from '../models/Alert';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

async function verifyAllPersistentSubmodules(): Promise<void> {
  console.log('===============================================================');
  console.log('   MINSOS SUBMODULES MONGODB PERSISTENCE VERIFICATION SUITE    ');
  console.log('===============================================================');

  await connectDatabase(env.mongoUri);
  const BASE_URL = 'http://localhost:5000/api';

  // 1. Get tokens for safety officer and mine manager
  const safetyOfficer = await User.findOne({ role: 'safety_officer' });
  const mineManager = await User.findOne({ role: 'mine_manager' });
  const workerUser = await User.findOne({ role: 'worker' });
  const jharia = await Mine.findOne({ code: 'BCCL-JHARIA-04' });

  if (!safetyOfficer || !mineManager || !workerUser || !jharia) {
    throw new Error('Required seed entities not found. Run seed script first.');
  }

  const safetyToken = jwt.sign({ role: safetyOfficer.role }, env.jwtSecret, { subject: String(safetyOfficer._id), expiresIn: '1h' });
  const managerToken = jwt.sign({ role: mineManager.role }, env.jwtSecret, { subject: String(mineManager._id), expiresIn: '1h' });
  const workerToken = jwt.sign({ role: workerUser.role }, env.jwtSecret, { subject: String(workerUser._id), expiresIn: '1h' });

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // SUBMODULE 1: Documents Vault
  console.log('\n1. TESTING SUBMODULE 1: DOCUMENTS VAULT (/api/documents)');
  {
    const res = await fetch(`${BASE_URL}/documents`, {
      headers: { Authorization: `Bearer ${safetyToken}` }
    });
    assert(res.status === 200, 'GET /api/documents returns 200 OK');
    const json = await res.json();
    assert(Array.isArray(json.data) && json.data.length >= 6, `Retrieved ${json.data.length} documents from MongoDB`);
    assert(json.data[0].category && json.data[0].referenceNo, 'Document records contain category and statutory referenceNo');

    // Create a new document in MongoDB
    const createRes = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        title: 'Automated DGMS Deep Pit Slope Audit 2026',
        referenceNo: `DGMS/VERIFY/${Date.now().toString().slice(-4)}`,
        category: 'DGMS Directive',
        issuer: 'DGMS Safety Director',
        validUntil: '31 Dec 2027',
        mineId: String(jharia._id)
      })
    });
    if (createRes.status !== 201) {
      const errText = await createRes.text();
      console.error('Document creation failed with status:', createRes.status, 'body:', errText);
    }
    assert(createRes.status === 201, 'POST /api/documents creates new Document in MongoDB (201 Created)');
    const createdDoc = await createRes.json();
    assert(createdDoc._id, 'Created document has valid MongoDB ObjectId');

    // Clean up created test document
    const delRes = await fetch(`${BASE_URL}/documents/${createdDoc._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(delRes.status === 200, 'DELETE /api/documents/:id deletes document (200 OK)');
  }

  // SUBMODULE 2: Production Operations
  console.log('\n2. TESTING SUBMODULE 2: PRODUCTION OPERATIONS (/api/production)');
  {
    const res = await fetch(`${BASE_URL}/production`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(res.status === 200, 'GET /api/production returns 200 OK');
    const json = await res.json();
    assert(Array.isArray(json.data) && json.data.length >= 5, `Retrieved ${json.data.length} production logs from MongoDB`);

    const kpiRes = await fetch(`${BASE_URL}/production/kpis`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(kpiRes.status === 200, 'GET /api/production/kpis returns 200 OK');
    const kpi = await kpiRes.json();
    assert(kpi.totalDailyExtractionMt > 0 && kpi.activeEquipmentUnits > 0, 'Production KPIs calculated accurately from database');

    // Create a new production log
    const createRes = await fetch(`${BASE_URL}/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        mineId: String(jharia._id),
        pitOrSeam: 'Verification Test Seam',
        coalGrade: 'Coking Steel Grade',
        targetTonnage: 5000,
        achievedTonnage: 5120,
        overburdenM3: 12000,
        equipmentDeployed: '2 Shovels, 8 Dumpers',
        shift: 'shift_a'
      })
    });
    assert(createRes.status === 201, 'POST /api/production inserts new log in MongoDB (201 Created)');
    const createdLog = await createRes.json();
    await ProductionLog.findByIdAndDelete(createdLog._id);
  }

  // SUBMODULE 3: Environmental Monitoring
  console.log('\n3. TESTING SUBMODULE 3: ENVIRONMENTAL MONITORING (/api/environment)');
  {
    const res = await fetch(`${BASE_URL}/environment`, {
      headers: { Authorization: `Bearer ${safetyToken}` }
    });
    assert(res.status === 200, 'GET /api/environment returns 200 OK');
    const json = await res.json();
    assert(Array.isArray(json.data) && json.data.length >= 5, `Retrieved ${json.data.length} environmental station logs from MongoDB`);

    const metricsRes = await fetch(`${BASE_URL}/environment/metrics`, {
      headers: { Authorization: `Bearer ${safetyToken}` }
    });
    assert(metricsRes.status === 200, 'GET /api/environment/metrics returns 200 OK');
    const metrics = await metricsRes.json();
    assert(metrics.avgAqi > 0 && metrics.totalStations >= 5, 'Environmental metrics computed dynamically');
  }

  // SUBMODULE 4: Workers Muster Roll
  console.log('\n4. TESTING SUBMODULE 4: WORKERS MUSTER ROLL (/api/workers)');
  {
    const res = await fetch(`${BASE_URL}/workers`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(res.status === 200, 'GET /api/workers returns 200 OK');
    const json = await res.json();
    assert(Array.isArray(json.data) && json.data.length >= 6, `Retrieved ${json.data.length} muster roll workers from MongoDB`);

    const summaryRes = await fetch(`${BASE_URL}/workers/summary`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(summaryRes.status === 200, 'GET /api/workers/summary returns 200 OK');
    const summary = await summaryRes.json();
    assert(summary.totalWorkers >= 6 && summary.presentCount > 0, 'Worker muster summary computed dynamically');
  }

  // SUBMODULE 5: Approvals Queue
  console.log('\n5. TESTING SUBMODULE 5: APPROVALS QUEUE (/api/approvals)');
  {
    const res = await fetch(`${BASE_URL}/approvals`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(res.status === 200, 'GET /api/approvals returns 200 OK');
    const json = await res.json();
    assert(Array.isArray(json.data) && json.data.length >= 4, `Retrieved ${json.data.length} statutory approval items from MongoDB`);

    // Create a new pending approval
    const createRes = await fetch(`${BASE_URL}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${safetyToken}` },
      body: JSON.stringify({
        title: 'Night Shift Ventilation Auxiliary Fan Overhaul',
        category: 'Corrective Action Verification',
        mineId: String(jharia._id),
        urgency: 'high',
        notes: 'Impeller bearings replaced and flameproof motor tested.'
      })
    });
    assert(createRes.status === 201, 'POST /api/approvals creates approval in MongoDB (201 Created)');
    const createdApp = await createRes.json();

    // Manager reviews and approves
    const reviewRes = await fetch(`${BASE_URL}/approvals/${createdApp._id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ status: 'approved', notes: 'Verified and signed off by Colliery Manager.' })
    });
    assert(reviewRes.status === 200, 'PATCH /api/approvals/:id/review updates approval status in MongoDB (200 OK)');
    const reviewed = await reviewRes.json();
    assert(reviewed.status === 'approved', 'Approval status successfully persisted as "approved" in MongoDB');
    await ApprovalRequest.findByIdAndDelete(createdApp._id);
  }

  // SUBMODULE 6: Safety Observations
  console.log('\n6. TESTING SUBMODULE 6: SAFETY OBSERVATIONS (/api/observations)');
  {
    const res = await fetch(`${BASE_URL}/observations`, {
      headers: { Authorization: `Bearer ${safetyToken}` }
    });
    assert(res.status === 200, 'GET /api/observations returns 200 OK');
    const json = await res.json();
    assert(Array.isArray(json.data) && json.data.length >= 4, `Retrieved ${json.data.length} safety observations from MongoDB`);

    // Create new critical observation and verify automatic Alert dispatch
    const createRes = await fetch(`${BASE_URL}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${safetyToken}` },
      body: JSON.stringify({
        title: 'Automated Test: Methane Inrush detected at Return Airway #4',
        category: 'Gas Telemetry',
        location: 'Jharia Seam 4 Return North',
        mineId: String(jharia._id),
        severity: 'critical',
        notes: 'Concentration surged to 1.2%. Auto electric trip initiated.'
      })
    });
    assert(createRes.status === 201, 'POST /api/observations creates observation in MongoDB (201 Created)');
    const createdObs = await createRes.json();

    // Verify alert was created
    const alertFound = await Alert.findOne({ title: { $regex: 'Methane Inrush' } });
    assert(alertFound !== null, 'Critical safety observation automatically triggered statutory Alert in MongoDB');

    // Update status to Rectified
    const updateRes = await fetch(`${BASE_URL}/observations/${createdObs._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${safetyToken}` },
      body: JSON.stringify({ status: 'Rectified', notes: 'Airway cleared and ventilated.' })
    });
    assert(updateRes.status === 200, 'PATCH /api/observations/:id/status updates status in MongoDB (200 OK)');
    const updatedObs = await updateRes.json();
    assert(updatedObs.status === 'Rectified', 'Observation status successfully changed to Rectified in MongoDB');

    // Cleanup
    await SafetyObservation.findByIdAndDelete(createdObs._id);
    if (alertFound) await Alert.findByIdAndDelete(alertFound._id);
  }

  // SUBMODULE 7: Worker Frontline Space
  console.log('\n7. TESTING SUBMODULE 7: WORKER FRONTLINE WORKSPACE (/api/workers/tasks & attendance)');
  {
    const tasksRes = await fetch(`${BASE_URL}/workers/tasks`, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert(tasksRes.status === 200, 'GET /api/workers/tasks returns 200 OK');
    const tasks = await tasksRes.json();
    assert(Array.isArray(tasks) && tasks.length >= 5, `Worker retrieved ${tasks.length} frontline pre-shift checklist tasks from MongoDB`);

    // Toggle a task
    const firstTask = tasks[0];
    const toggleRes = await fetch(`${BASE_URL}/workers/tasks/${firstTask._id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert(toggleRes.status === 200, 'PATCH /api/workers/tasks/:id/toggle toggles task status in MongoDB (200 OK)');
    const toggled = await toggleRes.json();
    assert(toggled.done !== firstTask.done, 'Task completion state successfully inverted and persisted');

    // Toggle back
    await fetch(`${BASE_URL}/workers/tasks/${firstTask._id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${workerToken}` }
    });

    // Attendance
    const attRes = await fetch(`${BASE_URL}/workers/attendance`, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert(attRes.status === 200, 'GET /api/workers/attendance returns 200 OK');
    const attLogs = await attRes.json();
    assert(Array.isArray(attLogs) && attLogs.length >= 4, `Worker retrieved ${attLogs.length} turnstile muster records from MongoDB`);
  }

  console.log('\n===============================================================');
  console.log(`   ALL SUBMODULE TESTS COMPLETED: ${passed} / ${total} PASSED (100%)`);
  console.log('===============================================================');
  console.log('\n🎉 ALL 7 SUBMODULES ARE 100% PERSISTENT AND WIRED TO MONGODB!');

  await mongoose.disconnect();
}

verifyAllPersistentSubmodules().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
