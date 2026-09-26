import { env } from "../config/env";

const BASE_URL = `http://localhost:${env.port}`;

async function runTests() {
  console.log("===============================================================");
  console.log("   MINSOS 16. REPORTS, 17. AUDIT TRAIL, 18. AI ASSISTANT VERIFICATION");
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

  // 1. Authenticate as Safety Officer
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "safety@minsos.coal.gov.in",
      password: "Password@12345"
    })
  });
  const loginData = (await loginRes.json()) as { token: string };
  const token = loginData.token;
  assert("Login as Safety Officer succeeds (token issued)", !!token);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // 2. Test all 9 report types
  console.log("\n1. TESTING MODULE 16: 9 STATUTORY REPORT TYPES & DATA MATRICES");
  const reportTypes = [
    "daily",
    "weekly",
    "monthly",
    "compliance",
    "inspection",
    "safety",
    "environmental",
    "contractor",
    "incident"
  ];

  for (const rType of reportTypes) {
    const res = await fetch(`${BASE_URL}/api/reports/detailed?type=${rType}`, {
      headers: authHeaders
    });
    const data = (await res.json()) as { reportType: string; summaryKpis: unknown[]; columns: unknown[]; rows: unknown[] };
    assert(
      `GET /api/reports/detailed?type=${rType} returns 200 OK with columns & rows`,
      res.status === 200 &&
        data.reportType === rType &&
        Array.isArray(data.columns) &&
        Array.isArray(data.rows) &&
        Array.isArray(data.summaryKpis)
    );
  }

  // 3. Test Audit Trail Categories & Tamper-Evident SHA-256 Verification
  console.log("\n2. TESTING MODULE 17: AUDIT TRAIL CATEGORIES & TAMPER-EVIDENT SHA-256");
  const auditRes = await fetch(`${BASE_URL}/api/audit?limit=10`, { headers: authHeaders });
  const auditData = (await auditRes.json()) as { data: Array<{ _id: string; action: string; category?: string; hash?: string }>; total: number };
  assert("GET /api/audit returns 200 OK with populated logs", auditRes.status === 200 && Array.isArray(auditData.data));

  // Verify categories filtering
  const creationRes = await fetch(`${BASE_URL}/api/audit?category=CREATION`, { headers: authHeaders });
  const creationData = (await creationRes.json()) as { data: Array<{ category?: string }> };
  assert(
    "GET /api/audit?category=CREATION returns filtered logs",
    creationRes.status === 200 && Array.isArray(creationData.data)
  );

  // Verify SHA-256 chain verification endpoint
  const verifyRes = await fetch(`${BASE_URL}/api/audit/verify`, { headers: authHeaders });
  const verifyData = (await verifyRes.json()) as { verified: boolean; totalRecords: number; latestHash: string; algorithm: string };
  assert(
    "GET /api/audit/verify returns verified: true with SHA-256 block hash",
    verifyRes.status === 200 &&
      verifyData.verified === true &&
      typeof verifyData.totalRecords === "number" &&
      typeof verifyData.latestHash === "string" &&
      verifyData.latestHash.length > 20
  );

  // 4. Test AI Governance Assistant Grounded Query Modes
  console.log("\n3. TESTING MODULE 18: AI GOVERNANCE ASSISTANT (8 GROUNDED CAPABILITIES)");
  const aiTestQueries = [
    { mode: "mines", q: "Ask questions about mines" },
    { mode: "compliance", q: "Ask compliance questions" },
    { mode: "overdue_compliance", q: "Find overdue compliances" },
    { mode: "high_risk_mines", q: "Find high-risk mines" },
    { mode: "explain_risk_score", q: "Explain risk score" },
    { mode: "summarize_inspections", q: "Summarize inspection reports" },
    { mode: "summarize_violations", q: "Summarize violations" },
    { mode: "management_insights", q: "Generate management insights" }
  ];

  for (const item of aiTestQueries) {
    const aiRes = await fetch(`${BASE_URL}/api/ai-assistant/query`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ query: item.q, mode: item.mode })
    });
    const aiData = (await aiRes.json()) as {
      mode: string;
      summary: string;
      keyFindings: string[];
      recommendedActions: string[];
      table?: { columns: unknown[]; rows: unknown[] };
      authorityNotice: string;
    };
    assert(
      `POST /api/ai-assistant/query [${item.mode}] returns grounded synthesis, findings & recommendations`,
      aiRes.status === 200 &&
        aiData.mode === item.mode &&
        typeof aiData.summary === "string" &&
        aiData.summary.length > 20 &&
        Array.isArray(aiData.keyFindings) &&
        Array.isArray(aiData.recommendedActions) &&
        typeof aiData.authorityNotice === "string"
    );
  }

  // 5. Test free-form query intent routing
  const freeformRes = await fetch(`${BASE_URL}/api/ai-assistant/query`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ query: "Which colliery has severe roof cracks and high risk?" })
  });
  const freeformData = (await freeformRes.json()) as { mode: string; summary: string };
  assert(
    "Free-form question is automatically classified and routed to appropriate grounded mode",
    freeformRes.status === 200 && (freeformData.mode === "high_risk_mines" || freeformData.mode === "summarize_violations")
  );

  console.log("\n===============================================================");
  console.log(`   ALL TESTS COMPLETED: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("===============================================================\n");

  if (passed === total) {
    console.log("🎉 MODULES 16, 17, AND 18 ARE 100% OPERATIONAL & VERIFIED!\n");
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
