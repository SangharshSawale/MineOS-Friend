import assert from "assert";
import { USER_ROLES } from "./models/User";
import { getRiskLevel } from "./controllers/dashboardController";
import {
  actionTransitions,
  assertTransition,
  effectiveActionStatus,
  inspectionTransitions,
  violationTransitions
} from "./services/workflowService";
import { isValidGps } from "./models/workflowTypes";

console.log("=== MINSOS Automated Verification Test Suite ===");

// 1. Role Matrix Verification
console.log("\n1. Testing SIH / Ministry User Roles...");
const expectedRoles = [
  "admin",
  "mine_manager",
  "safety_officer",
  "corporate_officer",
  "regulator",
  "worker",
  "inspector",
  "contractor"
];
for (const r of expectedRoles) {
  assert(USER_ROLES.includes(r as never), `Role ${r} must be in USER_ROLES`);
}
console.log("✓ All 8 SIH / Ministry roles verified.");

// 2. Risk Level Thresholds
console.log("\n2. Testing Risk Score & Level Calculations...");
assert.strictEqual(getRiskLevel(0), "LOW");
assert.strictEqual(getRiskLevel(24), "LOW");
assert.strictEqual(getRiskLevel(25), "MEDIUM");
assert.strictEqual(getRiskLevel(49), "MEDIUM");
assert.strictEqual(getRiskLevel(50), "HIGH");
assert.strictEqual(getRiskLevel(74), "HIGH");
assert.strictEqual(getRiskLevel(75), "CRITICAL");
assert.strictEqual(getRiskLevel(100), "CRITICAL");
console.log("✓ Risk score thresholds (LOW, MEDIUM, HIGH, CRITICAL) verified.");

// 3. Status Transitions
console.log("\n3. Testing Workflow Transitions...");
// Inspection
assert.doesNotThrow(() => assertTransition("draft", "in_progress", inspectionTransitions, "inspection"));
assert.doesNotThrow(() => assertTransition("in_progress", "completed", inspectionTransitions, "inspection"));
assert.throws(() => assertTransition("completed", "draft", inspectionTransitions, "inspection"));

// Violation
assert.doesNotThrow(() => assertTransition("open", "under_review", violationTransitions, "violation"));
assert.doesNotThrow(() => assertTransition("under_review", "resolved", violationTransitions, "violation"));
assert.throws(() => assertTransition("resolved", "open", violationTransitions, "violation"));

// Action
assert.doesNotThrow(() => assertTransition("open", "in_progress", actionTransitions, "action"));
assert.doesNotThrow(() => assertTransition("in_progress", "completed", actionTransitions, "action"));
assert.throws(() => assertTransition("verified", "open", actionTransitions, "action"));
console.log("✓ Workflow status transitions verified.");

// 4. Overdue Deadline Calculation
console.log("\n4. Testing Overdue Deadline Rules...");
const pastDate = new Date(Date.now() - 86400000);
const futureDate = new Date(Date.now() + 86400000);
assert.strictEqual(effectiveActionStatus("open", pastDate), "overdue");
assert.strictEqual(effectiveActionStatus("open", futureDate), "open");
assert.strictEqual(effectiveActionStatus("completed", pastDate), "completed");
assert.strictEqual(effectiveActionStatus("verified", pastDate), "verified");
console.log("✓ Overdue deadline calculation verified.");

// 5. GPS Coordinate Validation
console.log("\n5. Testing GPS Coordinate Validation...");
assert.strictEqual(isValidGps({ latitude: 23.7957, longitude: 86.4304 }), true); // Jharia Coalfield
assert.strictEqual(isValidGps({ latitude: 91, longitude: 86 }), false); // Invalid latitude
assert.strictEqual(isValidGps({ latitude: 23, longitude: 181 }), false); // Invalid longitude
assert.strictEqual(isValidGps(null), false);
console.log("✓ GPS coordinate bounds verified.");

// 6. Compliance Statuses & Categories
console.log("\n6. Testing Compliance Statuses & Categories...");
import { COMPLIANCE_STATUSES, COMPLIANCE_CATEGORIES } from "./models/Compliance";
assert(COMPLIANCE_STATUSES.includes("compliant" as never));
assert(COMPLIANCE_STATUSES.includes("pending" as never));
assert(COMPLIANCE_STATUSES.includes("overdue" as never));
assert(COMPLIANCE_STATUSES.includes("under_review" as never));
assert(COMPLIANCE_CATEGORIES.includes("DGMS Statutory" as never));
assert(COMPLIANCE_CATEGORIES.includes("Environmental Clearance" as never));
console.log("✓ Statutory compliance statuses and categories verified.");

// 7. Alert Types Verification
console.log("\n7. Testing Enhanced Alert Types...");
import { ALERT_TYPES } from "./models/Alert";
assert(ALERT_TYPES.includes("upcoming_deadline" as never));
assert(ALERT_TYPES.includes("high_risk_mine" as never));
assert(ALERT_TYPES.includes("critical_violation" as never));
assert(ALERT_TYPES.includes("overdue_action" as never));
console.log("✓ All persistent alert types verified.");

console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
