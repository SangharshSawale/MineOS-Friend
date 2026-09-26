export const roles = [
  'admin',
  'mine_manager',
  'safety_officer',
  'corporate_officer',
  'regulator',
  'worker',
  'inspector',
  'contractor'
] as const
export type Role = (typeof roles)[number]

// Backward compatibility alias for legacy demo roles
export const legacyRoles = ['manager', 'safety', 'corporate', 'viewer'] as const
export type LegacyRole = (typeof legacyRoles)[number]
export type AppRole = Role | LegacyRole

export interface User {
  id?: string
  name: string
  email: string
  role: AppRole
}

export interface WorkflowLookup {
  id: string
  name: string
  code?: string
  role?: string
  label?: string
}

export interface Mine {
  name: string
  location: string
  compliance: number
  risk: 'High' | 'Medium' | 'Low'
  openItems: number
}

export interface ComplianceMetric {
  label: string
  value: string
  change: string
  tone: 'blue' | 'red' | 'amber' | 'green'
}

export interface Violation {
  id: string
  mine: string
  type: string
  severity: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'Under review' | 'Resolved'
}

export interface Inspection {
  id: string
  mine: string
  date: string
  type: string
  result: 'Compliant' | 'Observations' | 'Follow-up required'
}

export interface CorrectiveAction {
  id: string
  action: string
  mine: string
  owner: string
  due: string
  status: 'Overdue' | 'In progress' | 'Completed'
}

export interface Alert {
  id: string
  title: string
  detail: string
  severity: 'High' | 'Medium' | 'Info'
  time: string
}

export interface AlertItem {
  _id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  mineId?: { _id: string; name: string; code?: string }
  isRead: boolean
  createdAt: string
}

export interface MineRiskItem {
  id: string
  name: string
  code: string
  location: string
  compliance: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number
  openItems: number
}

export interface DashboardMetric extends ComplianceMetric {
  icon: string
}

export interface NavItem {
  label: string
  path: string
  symbol: string
}

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type InspectionStatus = 'Draft' | 'In progress' | 'Completed' | 'Follow-up required'
export type ActionStatus = 'Open' | 'Assigned' | 'In progress' | 'Evidence submitted' | 'Completed' | 'Verified' | 'Approved' | 'Overdue'

export interface WorkflowInspection {
  id: string
  mine: string
  mineId?: string
  mineCode: string
  type: string
  scheduledFor: string
  rawScheduledFor?: string
  completedOn?: string
  rawCompletedOn?: string
  inspector: string
  inspectorId?: string
  status: InspectionStatus
  rawStatus?: string
  location: string
  latitude: number
  longitude: number
  observations: string
  photoCount: number
  violationCount: number
  actionCount: number
  evidence?: EvidenceItem[]
}

export interface WorkflowViolation {
  id: string
  inspectionId: string
  mine: string
  title: string
  description: string
  category: string
  severity: Severity
  status: 'Open' | 'Under review' | 'Resolved'
  assignedTo: string
  deadline: string
  evidenceCount: number
  evidence?: EvidenceItem[]
  closureReason?: string
}

export interface ActionVerification {
  verifiedBy?: string
  verifiedByName?: string
  verifiedAt?: string
  note?: string
}

export interface ActionApproval {
  approvedBy?: string
  approvedByName?: string
  approvedAt?: string
  note?: string
}

export interface ActionRejection {
  rejectedBy?: string
  rejectedByName?: string
  rejectedAt?: string
  reason: string
  fromStage: string
}

export interface WorkflowAction {
  id: string
  violationId: string
  violationTitle?: string
  violationSeverity?: string
  inspectionId: string
  inspectionType?: string
  mine: string
  title: string
  description?: string
  responsiblePersonId?: string
  responsiblePerson: string
  assignedToId?: string
  assignedToName?: string
  deadline: string
  rawDeadline?: string
  status: ActionStatus
  evidenceCount: number
  evidence?: EvidenceItem[]
  assignedAt?: string
  submittedAt?: string
  submissionNote?: string
  verification?: ActionVerification
  verificationNote?: string
  approval?: ActionApproval
  rejectionHistory?: ActionRejection[]
  createdAt?: string
}

export interface EvidenceItem {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  capturedAt?: string
  gps?: { latitude: number; longitude: number }
  uploadedBy?: string
  uploadedAt?: string
  url?: string
  dataUri?: string
}

export type IncidentStatus = 'reported' | 'investigating' | 'closed'

export interface WorkflowIncident {
  id: string
  mineId: string
  mineName: string
  mineCode: string
  mineLocation?: string
  occurredAt: string
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  evidenceCount: number
  evidence?: EvidenceItem[]
  reportedBy?: string
  reportedByName: string
  reportedByRole: string
  investigator?: string
  investigatorName?: string
  priorityInspectionId?: string
  investigationNotes?: string
  closureNotes?: string
  closedAt?: string
  closedBy?: string
  closedByName?: string
}

export type ComplianceStatus = 'compliant' | 'pending' | 'overdue' | 'under_review'

export interface WorkflowCompliance {
  id: string
  mineId: string
  mineName: string
  mineCode: string
  mineLocation?: string
  requirement: string
  category: string
  dueDate: string
  expiryDate: string
  status: ComplianceStatus
  effectiveStatus: ComplianceStatus
  responsiblePersonName: string
  responsiblePersonRole?: string
  evidenceCount: number
  evidence?: EvidenceItem[]
  notes?: string
}

export interface SummaryReport {
  generatedAt: string
  totalMines: number
  inspections: { total: number; completed: number }
  violations: {
    total: number
    bySeverity: { critical: number; high: number; medium: number; low: number }
    byStatus: { open: number; under_review: number; resolved: number }
  }
  actions: { total: number; completed: number; in_progress: number; overdue: number }
  incidents: { total: number; critical: number; high: number; closed: number; active: number }
  statutoryCompliance: {
    totalRequirements: number
    compliant: number
    pending: number
    overdue: number
  }
}

export interface ComplianceAuditReport {
  reportTitle: string
  reportNumber: string
  generatedAt: string
  generatedBy: string
  mineDetails: { name: string; code: string; location: string }
  metrics: {
    compliancePercentage: number
    systemRiskScore: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    criticalViolations: number
    overdueActions: number
    openIncidents: number
  }
  statutoryClearances: Array<{
    id: string
    requirement: string
    category: string
    dueDate: string
    expiryDate: string
    status: string
    responsiblePerson: string
    evidenceCount: number
  }>
  recentInspections: Array<{
    id: string
    type: string
    scheduledFor: string
    completedOn?: string
    status: string
    inspector: string
  }>
  unresolvedViolations: Array<{
    id: string
    title: string
    category: string
    severity: string
    status: string
    deadline: string
    assignee: string
  }>
  recentIncidents: Array<{
    id: string
    title: string
    severity: string
    status: string
    occurredAt: string
    reportedBy: string
  }>
}

export interface MineRecord {
  _id: string
  name: string
  code: string
  location: string
  operator: string
  status: 'active' | 'inactive'
  coordinates?: {
    latitude: number
    longitude: number
  }
  attendanceRadius?: number
  createdAt: string
  compliance?: number
  riskScore?: number
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  openItems?: number
}

export interface WorkflowContractor {
  _id: string
  companyName: string
  contractNumber: string
  mineId: { _id: string; name: string; code: string } | string
  workType: string
  safetyRating: number
  activeWorkers: number
  complianceStatus: 'compliant' | 'pending' | 'suspended'
  insuranceExpiry: string
  contactName: string
  contactPhone: string
  contactEmail: string
  createdAt: string
}

export interface AuditLogEntry {
  _id: string
  actorId?: { _id: string; name: string; email: string; role: string }
  entityType: 'inspection' | 'violation' | 'corrective_action' | 'incident' | 'compliance' | 'mine' | 'contractor'
  entityId: string
  action: string
  category?: 'USER_ACTIVITY' | 'CREATION' | 'MODIFICATION' | 'APPROVAL' | 'STATUS_CHANGE'
  hash?: string
  previousHash?: string
  ipAddress?: string
  details?: string
  before?: unknown
  after?: unknown
  occurredAt: string
}

export interface AuditVerifyResponse {
  verified: boolean
  totalRecords: number
  brokenAt?: string | null
  latestHash: string
  algorithm: string
  verifiedAt: string
}

export interface DetailedReportKpi {
  label: string
  value: string | number
  status?: 'ok' | 'warning' | 'critical'
}

export interface DetailedReportResponse {
  reportType: string
  title: string
  cadenceOrCategory: string
  generatedAt: string
  mineName: string
  mineCode: string
  summaryKpis: DetailedReportKpi[]
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, unknown>>
  dgmsReference?: string
}

export interface AiAssistantQueryRequest {
  query: string
  mode?: string
  mineId?: string
}

export interface AiAssistantQueryResponse {
  query: string
  mode: string
  intent: string
  summary: string
  keyFindings: string[]
  recommendedActions: string[]
  dataPoints?: Array<{ label: string; value: string | number; badgeTone?: 'red' | 'amber' | 'green' | 'blue' }>
  table?: {
    columns: Array<{ key: string; label: string }>
    rows: Array<Record<string, unknown>>
  }
  groundedAt: string
  authorityNotice: string
}

export interface AiRiskSiteAnalytics {
  mineId: string
  name: string
  code: string
  location: string
  systemRiskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  predictions: {
    roofFallProbability: number
    seismicIndex: number
    equipmentFailureRisk: number
    gasTelemetry: {
      ch4Percentage: number
      coPpm: number
      status: 'Normal' | 'Elevated' | 'Critical'
      ch4Threshold: string
      coThreshold: string
    }
  }
  recommendations: string[]
}

export interface GisMapData {
  generatedAt: string
  center: { latitude: number; longitude: number }
  mines: Array<{
    id: string
    name: string
    code: string
    location: string
    coordinates: { latitude: number; longitude: number }
    riskScore: number
    riskLevel: string
    compliancePercent: number
    openViolations: number
    criticalViolations: number
  }>
  incidents: Array<{
    id: string
    title: string
    severity: string
    status: string
    mineName: string
    occurredAt: string
    coordinates: { latitude: number; longitude: number }
  }>
}

export interface DocumentItem {
  _id: string
  id?: string
  title: string
  referenceNo: string
  category: 'DGMS Directive' | 'PESO License' | 'Environmental Clearance' | 'Mining Lease' | 'Safety Standard' | string
  issuer: string
  validUntil: string
  fileSize: string
  format: 'PDF' | 'DOCX' | string
  status: 'active' | 'expiring_soon' | 'archived'
  mineId?: { _id: string; name: string; code?: string }
  storageUrl?: string
  uploadedBy?: { _id: string; name: string; email: string }
  createdAt?: string
  updatedAt?: string
}

export interface ProductionLogItem {
  _id: string
  id?: string
  mineId: { _id: string; name: string; code?: string }
  date: string
  shift: 'shift_a' | 'shift_b' | 'shift_c'
  pitOrSeam: string
  coalGrade: string
  targetTonnage: number
  achievedTonnage: number
  overburdenM3: number
  equipmentDeployed: string
  status: 'On Target' | 'Normal' | 'Delayed'
  recordedBy?: { _id: string; name: string }
  createdAt?: string
}

export interface ProductionKpis {
  totalDailyExtractionMt: number
  totalDailyTargetMt: number
  achievementRatePercent: number
  totalOverburdenM3: number
  activeEquipmentUnits: number
}

export interface EnvironmentLogItem {
  _id: string
  id?: string
  mineId: { _id: string; name: string; code?: string }
  stationName: string
  stationType: 'air_quality' | 'dust_suppression' | 'water_effluent' | 'groundwater'
  aqi: number
  pm10: number
  pm25: number
  so2: number
  waterPh: number
  tssMgL: number
  oilAndGreaseMgL: number
  mistCannonsActivePercent: number
  readingDetails: string
  status: 'Normal' | 'Elevated' | 'Critical'
  complianceStatus: string
  recordedAt: string
}

export interface EnvironmentMetricsSummary {
  avgAqi: number
  avgPm10: number
  avgWaterPh: number
  activeMistCannonsPercent: number
  totalStations: number
  statusCounts: { normal: number; elevated: number; critical: number }
}

export interface WorkerItem {
  _id: string
  id?: string
  employeeCode: string
  name: string
  trade: string
  mineId: { _id: string; name: string; code?: string }
  shift: 'Shift A (Morning)' | 'Shift B (Evening)' | 'Shift C (Night)'
  attendanceStatus: 'Present (Biometric Verified)' | 'On Leave' | 'Absent'
  trainingStatus: 'Valid' | 'Refresher Required'
  trainingValidUntil: string
  medicalFitness: string
  bloodGroup: string
  emergencyContact: string
  active: boolean
}

export interface WorkerRosterSummary {
  totalWorkers: number
  presentCount: number
  onLeaveCount: number
  refresherRequiredCount: number
}

export interface ApprovalRequestItem {
  _id: string
  id?: string
  title: string
  category: 'Corrective Action Verification' | 'Incident Closure' | 'Blasting Permit' | 'Overtime Clearance'
  mineId: { _id: string; name: string; code?: string }
  submittedBy: { _id: string; name: string; email: string }
  reviewedBy?: { _id: string; name: string; email: string }
  urgency: 'critical' | 'high' | 'normal'
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  submittedAt: string
  reviewedAt?: string
}

export interface SafetyObservationItem {
  _id: string
  id?: string
  title: string
  category: 'Strata Control' | 'Gas Telemetry' | 'Haulage Road' | 'Electrical Flameproof' | 'Ventilation'
  location: string
  mineId: { _id: string; name: string; code?: string }
  severity: 'critical' | 'high' | 'medium' | 'low'
  reportedBy: { _id: string; name: string; email: string }
  status: 'Open Observation' | 'Investigating' | 'Rectified'
  photoEvidenceUrl?: string
  notes?: string
  createdAt: string
  rectifiedAt?: string
}

export interface WorkerTaskItem {
  _id: string
  id?: string
  workerId?: string
  userId?: string
  title: string
  category: string
  done: boolean
  time: string
  date: string
  completedAt?: string
}

export interface WorkerAttendanceItem {
  _id: string
  id?: string
  workerId?: string
  userId?: string
  date: string
  shift: string
  inTime: string
  outTime: string
  gate: string
  status: string
}

export interface GeoAttendanceWorker {
  _id: string
  name: string
  email: string
  role?: string
}

export interface GeoAttendanceRecord {
  _id: string
  id?: string
  workerId?: string | GeoAttendanceWorker
  imageUrl?: string
  location?: {
    latitude: number
    longitude: number
  }
  distanceFromMine?: number
  gpsAccuracy?: number
  verificationMethod?: 'GPS_PHOTO' | 'MANUAL'
  status: 'Pending' | 'Present' | 'Absent' | 'AUTO_VERIFIED' | 'MANUAL_REVIEW' | 'REJECTED' | string
  timestamp?: string
  createdAt?: string
  updatedAt?: string
  worker?: GeoAttendanceWorker
}


