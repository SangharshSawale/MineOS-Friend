# MINSOS Day 2 Backend Contract

This file is the implementation handoff for the Day 2 core workflow. The frontend currently uses matching demo data only; it must not be treated as a source of truth. Implement the API below before replacing the frontend service layer's mock data.

## Existing foundation to preserve

- Base path: `/api`
- Authentication: `Authorization: Bearer <JWT>`
- Existing resources: `/auth`, `/mines`, `User`, `Mine`, Express error middleware and Mongoose timestamps.
- Existing backend roles: `admin`, `mine_manager`, `inspector`, `viewer`.

Keep ObjectId values in JSON as strings and return `createdAt` / `updatedAt` in ISO-8601 format. Never trust an incoming `createdBy`, audit actor, verification actor, or role: obtain it from `request.user`.

## Permission model

| Operation | admin | mine_manager | inspector | viewer |
| --- | --- | --- | --- | --- |
| Read workflow records in authorised mines | yes | yes | yes | yes |
| Create/edit inspections | yes | yes | yes | no |
| Create/update violations | yes | yes | yes | no |
| Create/assign/update corrective actions | yes | yes | assigned only | no |
| Verify a completed corrective action | yes | yes | no | no |
| Create/read incidents | yes | yes | yes | read only |

If multi-mine user access is not ready, enforce the role restrictions first and add mine-scoping through a `User.mineIds` / assignment table as the next hardening step. A frontend route or role must never replace backend authorization.

## Shared conventions

- Valid severities: `critical`, `high`, `medium`, `low`.
- Return status values in lowercase API form. The web app can format labels.
- Invalid IDs return `404`; invalid fields / state transitions return `400`; no token is `401`; insufficient role or mine access is `403`; duplicate logical references are `409`.
- List endpoints accept `page` (default `1`, minimum `1`) and `limit` (default `20`, maximum `100`), plus the documented filters. Return `{ data, page, limit, total }`.
- Prefer consistent validation with Zod/Joi/express-validator before controller code. Mongoose validation is a secondary safety net.
- Evidence files should be uploaded to object storage in a later adapter. Store only metadata and a safe storage key/URL in MongoDB; do not place raw image bytes in a document.

## Models

### Inspection

Required: `mineId`, `type`, `scheduledFor`, `inspectorId`.

```ts
type InspectionStatus = 'draft' | 'in_progress' | 'completed' | 'follow_up_required'
{
  mineId: ObjectId, type: string, scheduledFor: Date, completedOn?: Date,
  inspectorId: ObjectId, status: InspectionStatus, location?: string,
  gps?: { latitude: number, longitude: number, accuracyMeters?: number, capturedAt?: Date },
  observations?: string, evidence: EvidenceMetadata[], createdBy: ObjectId,
  createdAt: Date, updatedAt: Date
}
```

GPS validation: latitude `-90..90`, longitude `-180..180`. `completedOn` is required when status becomes `completed` or `follow_up_required`.

### Violation

Required: `inspectionId`, `title`, `description`, `category`, `severity`, `assignedTo`, `deadline`.

```ts
type ViolationStatus = 'open' | 'under_review' | 'resolved'
{
  inspectionId: ObjectId, mineId: ObjectId, title: string, description: string,
  category: string, severity: 'critical' | 'high' | 'medium' | 'low',
  status: ViolationStatus, assignedTo: ObjectId, deadline: Date,
  evidence: EvidenceMetadata[], resolvedAt?: Date, createdBy: ObjectId,
  createdAt: Date, updatedAt: Date
}
```

Derive `mineId` from the inspection on creation; do not accept a mismatched client value. A violation can move `open → under_review → resolved`. Resolve only when its required corrective actions are complete or an authorised manager supplies a closure reason.

### CorrectiveAction

Required: `violationId`, `title`, `responsiblePersonId`, `deadline`.

```ts
type ActionStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'verified'
{
  violationId: ObjectId, inspectionId: ObjectId, mineId: ObjectId,
  title: string, description?: string, responsiblePersonId: ObjectId,
  deadline: Date, status: ActionStatus, evidence: EvidenceMetadata[],
  completedAt?: Date, verification?: { verifiedBy: ObjectId, verifiedAt: Date, note?: string },
  createdBy: ObjectId, createdAt: Date, updatedAt: Date
}
```

Derive `inspectionId` / `mineId` from the violation. A manager can mark it `verified` only through the dedicated verification endpoint, and only after `completed`. The server should calculate an `overdue` response status when deadline has passed and the action is not complete/verified; persist it via a scheduled job if reporting requires a stored status.

### Incident

The Day 2 brief requires this model even though it does not yet require incident routes. Add it now, but do not delay the core workflow for an incident UI.

```ts
{
  mineId: ObjectId, inspectionId?: ObjectId, occurredAt: Date, title: string,
  description: string, severity: 'critical' | 'high' | 'medium' | 'low',
  status: 'reported' | 'investigating' | 'closed', evidence: EvidenceMetadata[],
  reportedBy: ObjectId, createdAt: Date, updatedAt: Date
}
```

### Evidence metadata (embedded in records)

```ts
{
  id: string, fileName: string, mimeType: string, sizeBytes: number,
  storageKey: string, capturedAt?: Date,
  gps?: { latitude: number, longitude: number }, uploadedBy: ObjectId, uploadedAt: Date
}
```

### AuditLog

Create an append-only model and write it in the same request flow as each mutation. Required fields: `actorId`, `entityType` (`inspection`, `violation`, `corrective_action`, `incident`), `entityId`, `action`, `before?`, `after?`, `occurredAt`, `requestId?`. Do not expose a mutation endpoint for audit logs.

## Required endpoints

### Inspections

- `POST /api/inspections` — create an inspection. Body: `mineId`, `type`, `scheduledFor`, `inspectorId`, optional `location`, `gps`, `observations`, `evidence`. Returns `201` inspection.
- `GET /api/inspections?mineId=&status=&inspectorId=&from=&to=&page=&limit=` — list inspections. Return each inspection with compact mine and inspector display fields, plus `violationCount` and `actionCount`.
- `GET /api/inspections/:id` — return inspection, mine summary, inspector summary, evidence, linked violations and linked corrective actions. This is the endpoint used by the inspection detail page.

### Violations

- `POST /api/violations` — create a violation. Body: `inspectionId`, `title`, `description`, `category`, `severity`, `assignedTo`, `deadline`, optional `evidence`. Derive `mineId`. Return `201` violation.
- `GET /api/violations?mineId=&inspectionId=&status=&severity=&assignedTo=&page=&limit=` — list with compact inspection/mine/assignee display fields and `evidenceCount`.
- `PATCH /api/violations/:id` — permitted fields: `title`, `description`, `category`, `severity`, `assignedTo`, `deadline`, `status`, `evidence`, and authorised closure fields. Audit the changed fields.

### Corrective actions

- `POST /api/corrective-actions` — body: `violationId`, `title`, optional `description`, `responsiblePersonId`, `deadline`, optional `evidence`. Derive inspection and mine IDs. Return `201` action.
- `GET /api/corrective-actions?mineId=&violationId=&status=&responsiblePersonId=&overdue=&page=&limit=` — return actions with violation/inspection references, person display field, deadline, effective status and evidence count.
- `PATCH /api/corrective-actions/:id` — permitted fields: `title`, `description`, `responsiblePersonId`, `deadline`, `status`, `evidence`. Setting `completed` records `completedAt`; reject direct `verified` status.
- `PATCH /api/corrective-actions/:id/verify` — manager/admin only. Body: optional `{ note }`. Requires current status `completed`. Set `status: 'verified'`, `verification`, and create an audit row. Return updated action.

## Dashboard aggregation endpoint (needed by the Day 2 web dashboard)

Add `GET /api/dashboard/summary?mineId=` for the six displayed cards. Return scoped values for the authenticated user:

```json
{
  "totalMines": 18,
  "compliancePercent": 88.4,
  "openViolations": 14,
  "criticalViolations": 2,
  "overdueActions": 8,
  "riskScore": 62,
  "generatedAt": "2026-09-06T00:00:00.000Z"
}
```

Define the compliance and risk formulas in code/comments with product owner approval; do not silently invent them. Until formula rules exist, returning demonstrably calculated counts and `null` for unavailable scores is preferable to fake production values.

## Backend file plan

```text
src/models/{Inspection,Violation,CorrectiveAction,Incident,AuditLog}.ts
src/controllers/{inspection,violation,correctiveAction,dashboard}Controller.ts
src/routes/{inspection,violation,correctiveAction,dashboard}Routes.ts
src/services/auditService.ts
src/services/workflowService.ts        # relation and transition rules
src/middleware/validate.ts             # if no existing validation solution
```

Mount routes in `src/app.ts` after authentication/CORS setup. Add unit tests for permission checks, invalid transitions, mine/inspection relationship integrity, overdue calculation, and verification audit records. Add an integration test for the full chain: inspection → violation → action → completed → verified.

## Frontend integration checklist

1. Ensure CORS allows the Vite origin, usually `http://localhost:5173` or `http://127.0.0.1:5173`.
2. Keep the existing JWT response shape: `{ token, user }`.
3. Agree one role map before live auth. Current web demo role labels (`manager`, `safety`, `corporate`, `regulator`) are not backend roles; for Day 2 use backend `mine_manager` for manager and `inspector` for safety/inspection work, or add an explicit mapping in both apps.
4. Match the pagination envelope and lowercase enum values exactly. The frontend will use `VITE_API_BASE_URL=http://127.0.0.1:5000/api` during local development.
5. Share an OpenAPI document or Postman collection once implemented, then replace `src/data/workflowData.ts` with service calls and loading/error states.
