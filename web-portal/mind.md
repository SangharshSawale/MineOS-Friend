# MINSOS — Project Mind Map

## 1. Project vision

MINSOS (Mining Intelligence & Smart Operations System) is a future-ready governance and compliance platform for coal mines. It is intended to give mine management, safety teams, corporate teams and regulators one clear operational view of statutory compliance, inspections, violations, corrective actions, alerts and audit accountability.

## 2. SIH context

- Problem statement: **SIH26024**
- Organization: Ministry of Coal / Coal India Limited
- Category: Software
- Theme: Smart Automation
- Current product stage: **Day 1 — frontend foundation**

## 3. Current Day-1 scope

Implemented frontend foundation only:

- Professional MINSOS login screen using the supplied `logo.jpeg`.
- Demo authentication with email, password validation, password visibility toggle, remember-device option and role selection.
- UI-level protected, role-aware route architecture.
- One shared application shell: responsive sidebar, header, navigation, branding and sign-out.
- Manager, Safety Officer, Corporate and Regulator workspaces.
- A realistic overview dashboard driven by structured local mock data.
- Placeholder module pages to establish the information architecture without inventing unfinished business workflows.
- A central Axios client prepared for future backend API mapping.

Not implemented in Day 1: real authentication/JWT, backend APIs, databases, AI models, GIS, OCR, notifications, real-time updates, report generation or mobile application.

## 4. Technology stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

No component library, chart library, animation library or state-management framework was added.

## 5. UI/UX decisions

- Primary brand colour: **#0C447C** (deep navy / slate blue).
- Off-white workspace backgrounds, white data surfaces, restrained borders and status-only green/amber/red colours.
- Desktop-first enterprise density, with a mobile drawer sidebar and responsive grids/tables.
- The dashboard prioritizes actionable questions: high-risk mines, open violations, pending actions, inspections and recent alerts.
- All displayed operational values are explicitly demo data; no AI or live-monitoring claim is made.

## 6. Roles and navigation

Shared items: Overview, Compliance, Inspections, Violations, Corrective Actions, Reports and Settings.

| Role | Role-specific modules |
| --- | --- |
| Manager | Alerts, Contractors |
| Safety Officer | Safety Observations, Incidents |
| Corporate | Mine Performance, Risk Monitoring |
| Regulator | Mine Monitoring, Regulatory Records |

## 7. Route architecture

- `/login` — public login
- `/dashboard` — convenience redirect to the active role workspace
- `/:role/dashboard` — protected overview dashboard
- `/:role/:module` — protected placeholder/future module workspace
- `/manager`, `/safety`, `/corporate`, `/regulator` — convenience redirects to the active authenticated role

`ProtectedRoute` redirects signed-out users to `/login` and prevents a demo user from manually accessing another role's routes. This is UI-level navigation protection only; backend authorization must be the source of truth later.

## 8. Folder structure

```text
Web-app/
├── src/
│   ├── components/       # Sidebar, header and reusable UI states
│   ├── context/          # Mock authentication/session abstraction
│   ├── data/             # Mock users and dashboard records
│   ├── layouts/          # Shared application layout
│   ├── pages/            # Login, dashboard and module placeholder pages
│   ├── routes/           # UI route protection
│   ├── services/         # Central Axios API client
│   ├── types/            # Shared domain types
│   ├── App.tsx
│   └── index.css
├── logo.jpeg
├── .env.example
└── mind.md
```

## 9. Data and API strategy

Current demo data is held in `src/data/dashboardData.ts` and is consumed by the dashboard rather than embedded in UI markup. Domain types cover User, Role, Mine, ComplianceMetric, Violation, Inspection, CorrectiveAction, Alert and DashboardMetric.

`src/services/api.ts` exports the only Axios client and reads `VITE_API_BASE_URL` (default `/api`). Once the backend contract exists, add focused services beside this client and replace each mock-data import with the matching service call. Endpoint paths and database schemas are deliberately not guessed in this phase.

## 10. Authentication strategy

`AuthContext` is the sole frontend session abstraction. For Day 1 it creates a mock user based on the selected role and saves it in `localStorage` only when “Remember this device” is selected; otherwise it uses the browser session storage. Sign out clears the demo session. This must be replaced by a backend-authenticated session/token strategy later.

## 11. Current dashboard demo content

- KPI cards: overall compliance, open violations, pending actions, high-risk mines.
- Mine risk ranking: Mine A-4 (Jharkhand), Mine C-2 (Odisha), Mine B-1 (Chhattisgarh), Mine D-7 (West Bengal).
- Recent alerts, inspections and corrective-action records.

All mines and values are demo records, not production operational information.

## 12. Future integration and roadmap

### Day 2: backend alignment

1. Agree API contracts, user identity model and role/permission matrix with backend developers.
2. Add focused Axios service modules and loading/error states to replace mock dashboard data.
3. Connect real authentication and backend-enforced authorization.
4. Implement the first vertical workflow (recommended: inspections → violation → corrective action).

### Later phases

Compliance evidence, reports, notification/escalation infrastructure, audit trails, contractors, GIS/geotagging, OCR digitization, AI risk analytics and a mobile field-reporting application. The mobile app should reuse the agreed API contracts and role/permission semantics, not the web UI code.

## 13. Architectural decisions and limitations

- Shared role configuration/layout is preferred over four separate applications.
- Module pages are intentionally placeholders until workflows and APIs are agreed.
- No fake API endpoints, AI outputs or security claims were introduced.
- Browser route protection is not security; the future backend must enforce authorization and protect data.
- Current UI test coverage is manual/build validation only; automated component/e2e testing can be introduced after core backend contracts stabilize.

## 14. Validation record

- Source review completed: routes, role configuration, component imports, mock-data separation, accessibility labels and use of the local logo were checked.
- Dependencies installed successfully with `npm.cmd install --no-audit --no-fund` using Node's system certificate store for the command because this environment's Node certificate chain initially could not verify the registry certificate.
- `npm.cmd run build` completed successfully on 05 Sep 2026. Output: 53 transformed modules; production bundle generated under `dist/`.
- Two small build-only corrections were required: a React type import was made type-only, Vite environment typing was declared, and the missing `minsos-200` theme shade was added for the existing focus-ring style. No product UI or feature scope changed.

## 15. Completion log

Day-1 implementation includes the Vite/React setup, Tailwind configuration, Router, Axios foundation, logo integration, authentication abstraction, four roles, shared dashboard layout, reusable UI pieces, mock dashboard data, information-architecture placeholders and this documentation. Dependency-powered build/runtime validation is pending npm registry connectivity, as recorded above.

## 16. Backend integration check — 05 Sep 2026

The separately supplied backend lives at `backend/Backend` and is a TypeScript/Express/Mongoose service. Its dependencies were installed and `npm.cmd run build` completed successfully.

The backend was not started because its required `.env` file is absent. It requires `MONGODB_URI` and `JWT_SECRET`; no local MongoDB service was detected on port `27017`. No credentials were read, created or recorded.

The current frontend is **not yet API-connected by design**: the dashboard consumes mock data and `apiClient` is only a future integration foundation. Its default `/api` base URL would resolve to the Vite development server unless `VITE_API_BASE_URL=http://127.0.0.1:5000/api` is configured (or a Vite proxy is deliberately added in a future integration change). The backend CORS default is `http://localhost:3000`, which must be changed through backend environment configuration to match the frontend origin (`http://127.0.0.1:5173` or `http://localhost:5173`).

The current backend exposes health, authentication and protected mine CRUD endpoints only. It has backend roles `admin`, `mine_manager`, `inspector`, `viewer`, while the frontend demo roles are `manager`, `safety`, `corporate`, `regulator`. A shared role/permission contract is needed before real login or dashboard data can be connected.

Follow-up validation: the backend `.env` was subsequently populated with all expected variable names, and its build remains successful. The server reads the environment but cannot complete Atlas startup because Node's DNS SRV resolver returns `ECONNREFUSED` for the `mongodb+srv` discovery query. Windows DNS resolves the same Atlas SRV record and the resolved MongoDB host is reachable on TCP port `27017`; this isolates the current issue to Node's DNS resolver behavior on this machine. No URI, credentials or JWT value was displayed or stored in documentation. API endpoint testing remains pending a successful database connection.

The local Node SRV-DNS issue was addressed through an opt-in `MONGODB_DNS_SERVERS` environment setting in the backend and a small startup configuration change that applies it. With that setting, Mongoose discovers the Atlas replica-set nodes correctly. Atlas then rejects the connection at the network-access layer (`ReplicaSetNoPrimary` / Atlas IP allow-list guidance), so the remaining prerequisite is to add this machine's public IP address to the Atlas project's Network Access allow-list. This is an Atlas account setting; it cannot and should not be bypassed from application code.

Final local validation — 06 Sep 2026: after Atlas network access was enabled, Node still rejected the Atlas TLS certificate chain. Launching the backend for this machine with `NODE_OPTIONS=--use-system-ca` uses Windows' trusted system certificate store and resolves that local runtime issue without changing credentials. The backend connected to MongoDB Atlas and started on port `5000`; the frontend remained live on port `5173`. Both production builds passed.

Live API test results: `GET /api/health` returned `200`; browser preflight from `http://127.0.0.1:5173` returned `204` with the correct allowed origin; unauthenticated `GET /api/mines` returned `401`; an explicitly named, non-personal `MINSOS E2E Test` account was registered (`201`), logged in (`200`), and used to access `GET /api/mines` (`200`, zero records). No URI, password or token was printed. The test account is a persistent Atlas development record and can be removed later by an Atlas administrator if it is not wanted.

This validates both running applications and the backend API layer. The current visible frontend dashboard still intentionally uses its Day-1 mock data and does not call the backend services; connecting UI data/authentication is a separate, deliberate next-phase change that must also reconcile the frontend and backend role models.

## 17. Day 2 core workflow — 06 Sep 2026

The Day 2 frontend preserves the Day 1 shell and visual system while adding the first end-to-end workflow surface:

- The dashboard shows total mines, compliance, open violations, critical violations, overdue actions and risk score.
- Inspection register and detail pages show status, inspector, field location, GPS metadata, observations, photo/evidence metadata, violations and corrective actions.
- Violation and corrective-action registers show severity, ownership, deadline, evidence count and local prototype status controls. The action tracker also demonstrates manager verification.
- `src/data/workflowData.ts` holds explicit demo workflow records. `src/services/workflow.ts` is the typed API boundary to connect after backend implementation.
- `backend/backend.md` is the implementation handoff: models, permissions, transitions, endpoint contract, evidence and audit rules, dashboard summary and integration checklist.

Local controls intentionally demonstrate state only; they make no claim to persist until the API contract is delivered. Replace their local state updates with `workflowService` requests, loading/error states and optimistic updates during integration.
