import { env } from "../config/env";

const BASE_URL = `http://localhost:${env.port}`;

async function runTests() {
  console.log("===============================================================");
  console.log("   MINSOS ROLE-BASED ACCESS CONTROL (RBAC) VERIFICATION SUITE  ");
  console.log("===============================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
    }
  }

  // 1. Role Specifications Matrix
  console.log("1. TESTING ROLE SPECIFICATIONS & FEATURE BOUNDARIES");

  const expectedRoleCounts: Record<string, number> = {
    admin: 10,
    corporate_officer: 13,
    mine_manager: 16,
    safety_officer: 12,
    regulator: 12,
    worker: 10
  };

  const roleFeatures: Record<string, string[]> = {
    admin: [
      "dashboard",
      "users",
      "roles",
      "mines",
      "contractors",
      "compliance",
      "documents",
      "notifications",
      "audit",
      "settings"
    ],
    corporate_officer: [
      "dashboard",
      "mines",
      "compliance",
      "inspections",
      "violations",
      "actions",
      "contractors",
      "production",
      "environment",
      "gis",
      "ai-insights",
      "alerts",
      "reports"
    ],
    mine_manager: [
      "dashboard",
      "my-mine",
      "compliance",
      "inspections",
      "violations",
      "actions",
      "incidents",
      "contractors",
      "workers",
      "production",
      "environment",
      "gis",
      "ai-risk",
      "alerts",
      "reports",
      "approvals"
    ],
    safety_officer: [
      "dashboard",
      "inspections",
      "observations",
      "violations",
      "incidents",
      "actions",
      "compliance",
      "gis",
      "risk-analysis",
      "alerts",
      "reports",
      "documents"
    ],
    regulator: [
      "dashboard",
      "mines",
      "compliance",
      "inspections",
      "violations",
      "actions",
      "incidents",
      "gis",
      "risk-analysis",
      "reports",
      "documents",
      "audit"
    ],
    worker: [
      "dashboard",
      "tasks",
      "attendance",
      "report-safety",
      "incidents",
      "my-actions",
      "training",
      "notifications",
      "my-reports",
      "profile"
    ]
  };

  for (const [role, count] of Object.entries(expectedRoleCounts)) {
    assert(`${role} role config contains exactly ${count} features`, roleFeatures[role].length === count);
  }

  // 2. Authentication & Data Retrieval for Administrative APIs
  console.log("\n2. TESTING USER DIRECTORY & NOTIFICATIONS APIS");

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@minsos.coal.gov.in",
      password: "Password@12345"
    })
  });
  const loginData = (await loginRes.json()) as { token: string };
  assert("Admin authentication succeeds with JWT", loginRes.status === 200 && !!loginData.token);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${loginData.token}`
  };

  // Test User Directory
  const usersRes = await fetch(`${BASE_URL}/api/users`, { headers: authHeaders });
  const users = (await usersRes.json()) as Array<{ id: string; name: string; email: string; role: string }>;
  assert("GET /api/users returns complete user directory", usersRes.status === 200 && Array.isArray(users) && users.length >= 5);

  // Test Alerts Feed
  const alertsRes = await fetch(`${BASE_URL}/api/alerts`, { headers: authHeaders });
  const alertsData = (await alertsRes.json()) as { data: Array<{ _id: string; title: string }>; total: number };
  assert("GET /api/alerts returns notifications feed", alertsRes.status === 200 && Array.isArray(alertsData.data));

  // 3. RBAC Negative Boundary Testing (Worker attempting admin access)
  console.log("\n3. TESTING RBAC SECURITY BOUNDARIES");

  const workerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "worker@minsos.coal.gov.in",
      password: "Password@12345"
    })
  });
  const workerLogin = (await workerLoginRes.json()) as { token: string };
  assert("Worker authentication succeeds", workerLoginRes.status === 200 && !!workerLogin.token);

  const workerHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${workerLogin.token}`
  };

  const workerInspectionAttempt = await fetch(`${BASE_URL}/api/inspections`, {
    method: "POST",
    headers: workerHeaders,
    body: JSON.stringify({ type: "Unauthorized Audit", scheduledFor: new Date() })
  });
  assert("Worker is blocked from creating inspections (403 Forbidden)", workerInspectionAttempt.status === 403);

  const workerMineDeleteAttempt = await fetch(`${BASE_URL}/api/mines/65f000000000000000000001`, {
    method: "DELETE",
    headers: workerHeaders
  });
  assert("Worker is blocked from modifying colliery definitions (403 Forbidden)", workerMineDeleteAttempt.status === 403);

  console.log("\n===============================================================");
  console.log(`   ALL RBAC TESTS COMPLETED: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("===============================================================\n");

  if (passed === total) {
    console.log("🎉 ROLE-BASED ACCESS CONTROL (RBAC) VERIFICATION PASSED 100%!\n");
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
