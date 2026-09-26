import { apiClient } from './api'
import type {
  AlertItem,
  AiRiskSiteAnalytics,
  AuditLogEntry,
  AuditVerifyResponse,
  ComplianceAuditReport,
  DetailedReportResponse,
  AiAssistantQueryRequest,
  AiAssistantQueryResponse,
  GisMapData,
  MineRecord,
  MineRiskItem,
  SummaryReport,
  WorkflowAction,
  WorkflowCompliance,
  WorkflowContractor,
  WorkflowIncident,
  WorkflowInspection,
  WorkflowViolation,
  DocumentItem,
  ProductionLogItem,
  ProductionKpis,
  EnvironmentLogItem,
  EnvironmentMetricsSummary,
  WorkerItem,
  WorkerRosterSummary,
  ApprovalRequestItem,
  SafetyObservationItem,
  WorkerTaskItem,
  WorkerAttendanceItem,
  GeoAttendanceRecord
} from '../types'

export interface PageResult<T> {
  data: T[]
  page: number
  limit: number
  total: number
}

export interface DashboardSummary {
  totalMines: number
  compliancePercent: number | null
  openViolations: number
  criticalViolations: number
  overdueActions: number
  riskScore: number | null
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  generatedAt: string
}

export interface InspectionDetail extends WorkflowInspection {
  violations: WorkflowViolation[]
  actions: WorkflowAction[]
}

export interface WorkflowLookup {
  id: string
  name: string
  label?: string
  role?: string
  code?: string
}

type ApiRecord = Record<string, unknown> & { _id?: string; id?: string }
type ApiPage = { data: ApiRecord[]; page: number; limit: number; total: number }

function idOf(record?: ApiRecord | null): string {
  if (!record) return ''
  return record.id ?? record._id ?? ''
}

function displayDate(value: unknown): string {
  return value
    ? new Date(String(value)).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : ''
}

function titleCase(value: unknown): string {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function relatedName(value: unknown, fallback: string): string {
  if (value && typeof value === 'object') {
    const record = value as ApiRecord
    return String(record.name ?? record.email ?? fallback)
  }
  return fallback
}

function mapInspection(record: ApiRecord): WorkflowInspection {
  const mine = record.mineId as ApiRecord | undefined
  const gps = record.gps as { latitude?: number; longitude?: number } | undefined
  const inspector = record.inspectorId as ApiRecord | undefined
  return {
    id: idOf(record),
    mine: relatedName(mine, 'Mine'),
    mineId: mine ? idOf(mine) : (typeof record.mineId === 'string' ? record.mineId : undefined),
    mineCode: String(mine?.code ?? ''),
    type: String(record.type ?? ''),
    scheduledFor: displayDate(record.scheduledFor),
    rawScheduledFor: record.scheduledFor ? String(record.scheduledFor) : undefined,
    completedOn: record.completedOn ? displayDate(record.completedOn) : undefined,
    rawCompletedOn: record.completedOn ? String(record.completedOn) : undefined,
    inspector: relatedName(record.inspectorId, 'Inspector'),
    inspectorId: inspector ? idOf(inspector) : (typeof record.inspectorId === 'string' ? record.inspectorId : undefined),
    status: titleCase(record.status) as WorkflowInspection['status'],
    rawStatus: String(record.status ?? 'draft'),
    location: String(record.location ?? ''),
    latitude: gps?.latitude ?? 0,
    longitude: gps?.longitude ?? 0,
    observations: String(record.observations ?? ''),
    photoCount: Array.isArray(record.evidence) ? record.evidence.length : 0,
    evidence: Array.isArray(record.evidence) ? (record.evidence as any[]) : [],
    violationCount: Number(record.violationCount ?? 0),
    actionCount: Number(record.actionCount ?? 0)
  }
}

function mapViolation(record: ApiRecord): WorkflowViolation {
  const mine = record.mineId as ApiRecord | undefined
  const inspectionObj = record.inspectionId && typeof record.inspectionId === 'object' ? (record.inspectionId as ApiRecord) : undefined
  return {
    id: idOf(record),
    inspectionId: inspectionObj ? idOf(inspectionObj) : String(record.inspectionId ?? ''),
    mine: relatedName(mine, 'Mine'),
    title: String(record.title ?? ''),
    description: String(record.description ?? ''),
    category: String(record.category ?? ''),
    severity: titleCase(record.severity) as WorkflowViolation['severity'],
    status: titleCase(record.status) as WorkflowViolation['status'],
    assignedTo: relatedName(record.assignedTo, 'Unassigned'),
    deadline: displayDate(record.deadline),
    evidenceCount: Number(
      record.evidenceCount ?? (Array.isArray(record.evidence) ? record.evidence.length : 0)
    ),
    evidence: Array.isArray(record.evidence) ? (record.evidence as any[]) : [],
    closureReason: record.closureReason ? String(record.closureReason) : undefined
  }
}

function mapActionStatus(raw: unknown): WorkflowAction['status'] {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'in_progress') return 'In progress'
  if (s === 'evidence_submitted') return 'Evidence submitted'
  if (s === 'assigned') return 'Assigned'
  if (s === 'verified') return 'Verified'
  if (s === 'approved') return 'Approved'
  if (s === 'completed') return 'Completed'
  if (s === 'overdue') return 'Overdue'
  return 'Open'
}

function mapAction(record: ApiRecord): WorkflowAction {
  const violationObj = record.violationId && typeof record.violationId === 'object' ? (record.violationId as ApiRecord) : undefined
  const inspectionObj = record.inspectionId && typeof record.inspectionId === 'object' ? (record.inspectionId as ApiRecord) : undefined
  const responsibleObj = record.responsiblePersonId && typeof record.responsiblePersonId === 'object' ? (record.responsiblePersonId as ApiRecord) : undefined
  const assignedToObj = record.assignedTo && typeof record.assignedTo === 'object' ? (record.assignedTo as ApiRecord) : undefined
  const verificationObj = record.verification as ApiRecord | undefined
  const approvalObj = record.approval as ApiRecord | undefined
  const verifierObj = verificationObj?.verifiedBy as ApiRecord | undefined
  const approverObj = approvalObj?.approvedBy as ApiRecord | undefined

  return {
    id: idOf(record),
    violationId: violationObj ? idOf(violationObj) : String(record.violationId ?? ''),
    violationTitle: violationObj ? String(violationObj.title ?? '') : undefined,
    violationSeverity: violationObj ? String(violationObj.severity ?? '') : undefined,
    inspectionId: inspectionObj ? idOf(inspectionObj) : String(record.inspectionId ?? ''),
    inspectionType: inspectionObj ? String(inspectionObj.type ?? '') : undefined,
    mine: relatedName(record.mineId, 'Mine'),
    title: String(record.title ?? ''),
    description: String(record.description ?? ''),
    responsiblePersonId: responsibleObj ? idOf(responsibleObj) : (typeof record.responsiblePersonId === 'string' ? record.responsiblePersonId : undefined),
    responsiblePerson: relatedName(record.responsiblePersonId, 'Unassigned'),
    assignedToId: assignedToObj ? idOf(assignedToObj) : (typeof record.assignedTo === 'string' ? record.assignedTo : undefined),
    assignedToName: assignedToObj ? relatedName(assignedToObj, 'Worker') : undefined,
    deadline: displayDate(record.deadline),
    rawDeadline: record.deadline ? String(record.deadline) : undefined,
    status: mapActionStatus(record.status),
    evidenceCount: Number(
      record.evidenceCount ?? (Array.isArray(record.evidence) ? record.evidence.length : 0)
    ),
    evidence: Array.isArray(record.evidence) ? (record.evidence as any[]) : [],
    assignedAt: record.assignedAt ? displayDate(record.assignedAt) : undefined,
    submittedAt: record.submittedAt ? displayDate(record.submittedAt) : undefined,
    submissionNote: record.submissionNote ? String(record.submissionNote) : undefined,
    verification: verificationObj ? {
      verifiedBy: verifierObj ? idOf(verifierObj) : String(verificationObj.verifiedBy ?? ''),
      verifiedByName: verifierObj ? relatedName(verifierObj, 'Safety Officer') : undefined,
      verifiedAt: verificationObj.verifiedAt ? displayDate(verificationObj.verifiedAt) : undefined,
      note: verificationObj.note ? String(verificationObj.note) : undefined
    } : undefined,
    verificationNote: verificationObj?.note ? String(verificationObj.note) : undefined,
    approval: approvalObj ? {
      approvedBy: approverObj ? idOf(approverObj) : String(approvalObj.approvedBy ?? ''),
      approvedByName: approverObj ? relatedName(approverObj, 'Mine Manager') : undefined,
      approvedAt: approvalObj.approvedAt ? displayDate(approvalObj.approvedAt) : undefined,
      note: approvalObj.note ? String(approvalObj.note) : undefined
    } : undefined,
    rejectionHistory: Array.isArray(record.rejectionHistory) ? (record.rejectionHistory as any[]).map((r) => ({
      rejectedBy: r.rejectedBy && typeof r.rejectedBy === 'object' ? idOf(r.rejectedBy) : String(r.rejectedBy ?? ''),
      rejectedByName: r.rejectedBy && typeof r.rejectedBy === 'object' ? relatedName(r.rejectedBy, 'Supervisor') : undefined,
      rejectedAt: r.rejectedAt ? displayDate(r.rejectedAt) : undefined,
      reason: String(r.reason ?? ''),
      fromStage: String(r.fromStage ?? '')
    })) : [],
    createdAt: record.createdAt ? displayDate(record.createdAt) : undefined
  }
}

function mapIncident(record: ApiRecord): WorkflowIncident {
  const mine = record.mineId as ApiRecord | undefined
  const reportedBy = record.reportedBy as ApiRecord | undefined
  const investigator = record.investigatorId as ApiRecord | undefined
  const closedBy = record.closedBy as ApiRecord | undefined
  const priorityInspection = record.priorityInspectionId as ApiRecord | undefined

  return {
    id: idOf(record),
    mineId: idOf(mine ?? {}),
    mineName: relatedName(mine, 'Mine'),
    mineCode: String(mine?.code ?? ''),
    mineLocation: String(mine?.location ?? ''),
    occurredAt: displayDate(record.occurredAt),
    title: String(record.title ?? ''),
    description: String(record.description ?? ''),
    severity: titleCase(record.severity) as WorkflowIncident['severity'],
    status: String(record.status ?? 'reported') as WorkflowIncident['status'],
    evidenceCount: Number(
      record.evidenceCount ?? (Array.isArray(record.evidence) ? record.evidence.length : 0)
    ),
    evidence: Array.isArray(record.evidence) ? (record.evidence as any[]) : [],
    reportedBy: relatedName(reportedBy, 'Anonymous'),
    reportedByName: relatedName(reportedBy, 'Field Reporter'),
    reportedByRole: String(reportedBy?.role ?? 'Worker'),
    investigator: investigator ? relatedName(investigator, 'Investigator') : undefined,
    investigatorName: investigator ? relatedName(investigator, 'Investigator') : undefined,
    investigationNotes: record.investigationNotes ? String(record.investigationNotes) : undefined,
    closedBy: closedBy ? relatedName(closedBy, 'Manager') : undefined,
    closedByName: closedBy ? relatedName(closedBy, 'Manager') : undefined,
    closureNotes: record.closureNotes ? String(record.closureNotes) : undefined,
    priorityInspectionId: priorityInspection ? idOf(priorityInspection) : undefined
  }
}

export const workflowService = {
  // Inspections
  async inspections(params?: Record<string, string | number | undefined>): Promise<PageResult<WorkflowInspection>> {
    const { data } = await apiClient.get<ApiPage>('/inspections', { params })
    return { ...data, data: data.data.map(mapInspection) }
  },
  async inspection(id: string): Promise<InspectionDetail> {
    const { data } = await apiClient.get<ApiRecord>(`/inspections/${id}`)
    return {
      ...mapInspection(data),
      violations: ((data.violations as ApiRecord[] | undefined) ?? []).map(mapViolation),
      actions: ((data.correctiveActions as ApiRecord[] | undefined) ?? []).map(mapAction)
    }
  },
  createInspection: (payload: Record<string, unknown>) => apiClient.post('/inspections', payload),
  updateInspection: (id: string, payload: Record<string, unknown>) => apiClient.patch(`/inspections/${id}`, payload),

  // Violations
  async violations(params?: Record<string, string | number | undefined>): Promise<PageResult<WorkflowViolation>> {
    const { data } = await apiClient.get<ApiPage>('/violations', { params })
    return { ...data, data: data.data.map(mapViolation) }
  },
  createViolation: (payload: Record<string, unknown>) => apiClient.post('/violations', payload),
  updateViolation: (id: string, payload: Record<string, unknown>) => apiClient.patch(`/violations/${id}`, payload),

  // Actions
  async actions(params?: Record<string, string | number | undefined>): Promise<PageResult<WorkflowAction>> {
    const { data } = await apiClient.get<ApiPage>('/corrective-actions', { params })
    return { ...data, data: data.data.map(mapAction) }
  },
  createAction: (payload: Record<string, unknown>) => apiClient.post('/corrective-actions', payload),
  updateAction: (id: string, payload: Record<string, unknown>) => apiClient.patch(`/corrective-actions/${id}`, payload),
  submitAction: (id: string, payload: { evidence?: Record<string, unknown>[]; note?: string }) =>
    apiClient.patch(`/corrective-actions/${id}/submit`, payload),
  verifyAction: (id: string, note?: string) => apiClient.patch(`/corrective-actions/${id}/verify`, { note }),
  approveAction: (id: string, note?: string) => apiClient.patch(`/corrective-actions/${id}/approve`, { note }),
  rejectAction: (id: string, reason: string) => apiClient.patch(`/corrective-actions/${id}/reject`, { reason }),

  // Incidents
  async incidents(params?: Record<string, string | number | undefined>): Promise<PageResult<WorkflowIncident>> {
    const { data } = await apiClient.get<ApiPage>('/incidents', { params })
    return { ...data, data: data.data.map(mapIncident) }
  },
  async incident(id: string): Promise<WorkflowIncident> {
    const { data } = await apiClient.get<ApiRecord>(`/incidents/${id}`)
    return mapIncident(data)
  },
  createIncident: (payload: Record<string, unknown>) => apiClient.post('/incidents', payload),
  investigateIncident: (id: string, payload: { investigationNotes?: string; investigatorId?: string; evidence?: Array<Record<string, unknown>> }) =>
    apiClient.patch(`/incidents/${id}/investigate`, payload),
  closeIncident: (id: string, payload: { closureNotes?: string; evidence?: Array<Record<string, unknown>> }) =>
    apiClient.patch(`/incidents/${id}/close`, payload),

  // Evidence Upload
  async uploadEvidence(file: File, gps?: { latitude: number; longitude: number }): Promise<{ evidence: Record<string, unknown>; url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (gps) {
      formData.append('latitude', String(gps.latitude))
      formData.append('longitude', String(gps.longitude))
    }
    const { data } = await apiClient.post('/uploads', formData)
    return data
  },

  // Dashboard Live Data
  dashboardSummary: async () => (await apiClient.get<DashboardSummary>('/dashboard/summary')).data,
  mineRiskRanking: async (): Promise<MineRiskItem[]> => (await apiClient.get<{ data: MineRiskItem[] }>('/dashboard/mine-risk-ranking')).data.data,
  recentInspections: async () => (await apiClient.get<{ data: Array<{ id: string; mine: string; type: string; date: string; status: string }> }>('/dashboard/recent-inspections')).data.data,
  openActions: async () => (await apiClient.get<{ data: Array<{ id: string; action: string; mine: string; owner: string; due: string; status: string }> }>('/dashboard/open-actions')).data.data,

  // Alerts
  recentAlerts: async (): Promise<AlertItem[]> => (await apiClient.get<{ data: AlertItem[] }>('/alerts/recent')).data.data,
  markAlertRead: (id: string) => apiClient.patch(`/alerts/${id}/read`),

  // Common Lookups
  mines: async (): Promise<WorkflowLookup[]> =>
    (await apiClient.get<Array<{ _id: string; name: string; code: string }>>('/mines')).data.map((mine) => ({
      id: mine._id,
      name: mine.name,
      code: mine.code,
      label: `${mine.name} (${mine.code})`
    })),
  users: async (role?: string): Promise<WorkflowLookup[]> =>
    (await apiClient.get<Array<{ id: string; name: string; email: string; role: string }>>('/users', {
      params: role ? { role } : undefined
    })).data.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      label: `${user.name} (${user.email})`
    })),

  // Compliance
  async compliance(params?: Record<string, string | number | undefined>): Promise<PageResult<WorkflowCompliance>> {
    const { data } = await apiClient.get<ApiPage>('/compliance', { params })
    return {
      ...data,
      data: data.data.map((record) => {
        const mine = record.mineId as ApiRecord | undefined
        const resp = record.responsiblePersonId as ApiRecord | undefined
        return {
          id: idOf(record),
          mineId: idOf(mine ?? {}),
          mineName: relatedName(mine, 'Mine'),
          mineCode: String(mine?.code ?? ''),
          mineLocation: String(mine?.location ?? ''),
          requirement: String(record.requirement ?? ''),
          category: String(record.category ?? 'DGMS Statutory'),
          dueDate: displayDate(record.dueDate),
          expiryDate: displayDate(record.expiry),
          status: (record.status ?? 'pending') as WorkflowCompliance['status'],
          effectiveStatus: (record.effectiveStatus ?? record.status ?? 'pending') as WorkflowCompliance['status'],
          responsiblePersonName: relatedName(resp, 'Unassigned'),
          responsiblePersonRole: resp?.role ? titleCase(resp.role) : undefined,
          evidenceCount: Array.isArray(record.evidence) ? record.evidence.length : 0,
          evidence: Array.isArray(record.evidence) ? (record.evidence as any[]) : [],
          notes: record.notes ? String(record.notes) : undefined
        }
      })
    }
  },
  createCompliance: (payload: Record<string, unknown>) => apiClient.post('/compliance', payload),
  updateCompliance: (id: string, payload: Record<string, unknown>) => apiClient.patch(`/compliance/${id}`, payload),

  // Reports
  summaryReport: async (params?: Record<string, string | number | undefined>): Promise<SummaryReport> =>
    (await apiClient.get<SummaryReport>('/reports/summary', { params })).data,
  complianceAuditReport: async (mineId?: string): Promise<ComplianceAuditReport> =>
    (await apiClient.get<ComplianceAuditReport>('/reports/compliance-audit', { params: mineId ? { mineId } : undefined })).data,
  detailedReport: async (type: string, mineId?: string): Promise<DetailedReportResponse> =>
    (await apiClient.get<DetailedReportResponse>('/reports/detailed', { params: { type, ...(mineId ? { mineId } : {}) } })).data,

  // Mines Management
  minesFullList: async (): Promise<MineRecord[]> => (await apiClient.get<MineRecord[]>('/mines')).data,
  createMine: (payload: Record<string, unknown>) => apiClient.post('/mines', payload),
  updateMine: (id: string, payload: Record<string, unknown>) => apiClient.patch(`/mines/${id}`, payload),
  deleteMine: (id: string) => apiClient.delete(`/mines/${id}`),

  // Audit Trail
  auditLogs: async (params?: Record<string, string | number | undefined>): Promise<PageResult<AuditLogEntry>> =>
    (await apiClient.get<PageResult<AuditLogEntry>>('/audit', { params })).data,
  verifyAuditChain: async (): Promise<AuditVerifyResponse> =>
    (await apiClient.get<AuditVerifyResponse>('/audit/verify')).data,

  // Contractors
  contractors: async (params?: Record<string, string | number | undefined>): Promise<PageResult<WorkflowContractor>> =>
    (await apiClient.get<PageResult<WorkflowContractor>>('/contractors', { params })).data,
  createContractor: (payload: Record<string, unknown>) => apiClient.post('/contractors', payload),
  updateContractor: (id: string, payload: Record<string, unknown>) => apiClient.patch(`/contractors/${id}`, payload),
  deleteContractor: (id: string) => apiClient.delete(`/contractors/${id}`),

  // AI Risk Analytics
  aiRiskAnalytics: async () =>
    (await apiClient.get<{ generatedAt: string; totalMonitoredSites: number; analytics: AiRiskSiteAnalytics[] }>('/ai-risk/analytics')).data,

  // AI Governance Assistant
  aiAssistantQuery: async (payload: AiAssistantQueryRequest): Promise<AiAssistantQueryResponse> =>
    (await apiClient.post<AiAssistantQueryResponse>('/ai-assistant/query', payload)).data,

  // Users
  usersList: async (role?: string) =>
    (await apiClient.get<Array<{ id: string; name: string; email: string; role: string }>>('/users', { params: role ? { role } : undefined })).data,

  // Alerts & Notifications
  alertsList: async (params?: Record<string, string | number | boolean | undefined>) =>
    (await apiClient.get<{ data: AlertItem[]; total: number }>('/alerts', { params })).data,

  // GIS Features
  gisFeatures: async (): Promise<GisMapData> => (await apiClient.get<GisMapData>('/gis/features')).data,

  // System Health
  systemHealth: async () => (await apiClient.get<{ status: string; service: string; timestamp: string }>('/health')).data,

  // 1. Documents Vault
  documents: async (params?: Record<string, string | number | undefined>): Promise<PageResult<DocumentItem>> =>
    (await apiClient.get<PageResult<DocumentItem>>('/documents', { params })).data,
  createDocument: async (payload: Record<string, unknown>): Promise<DocumentItem> =>
    (await apiClient.post<DocumentItem>('/documents', payload)).data,
  deleteDocument: async (id: string): Promise<unknown> =>
    (await apiClient.delete(`/documents/${id}`)).data,

  // 2. Production Operations
  productionLogs: async (params?: Record<string, string | number | undefined>): Promise<PageResult<ProductionLogItem>> =>
    (await apiClient.get<PageResult<ProductionLogItem>>('/production', { params })).data,
  productionKpis: async (mineId?: string): Promise<ProductionKpis> =>
    (await apiClient.get<ProductionKpis>('/production/kpis', { params: mineId ? { mineId } : undefined })).data,
  createProductionLog: async (payload: Record<string, unknown>): Promise<ProductionLogItem> =>
    (await apiClient.post<ProductionLogItem>('/production', payload)).data,

  // 3. Environmental Monitoring
  environmentStations: async (params?: Record<string, string | number | undefined>): Promise<PageResult<EnvironmentLogItem>> =>
    (await apiClient.get<PageResult<EnvironmentLogItem>>('/environment', { params })).data,
  environmentMetrics: async (mineId?: string): Promise<EnvironmentMetricsSummary> =>
    (await apiClient.get<EnvironmentMetricsSummary>('/environment/metrics', { params: mineId ? { mineId } : undefined })).data,
  createEnvironmentLog: async (payload: Record<string, unknown>): Promise<EnvironmentLogItem> =>
    (await apiClient.post<EnvironmentLogItem>('/environment', payload)).data,

  // 4. Workers Muster Roll
  workersList: async (params?: Record<string, string | number | undefined>): Promise<PageResult<WorkerItem>> =>
    (await apiClient.get<PageResult<WorkerItem>>('/workers', { params })).data,
  workersSummary: async (mineId?: string): Promise<WorkerRosterSummary> =>
    (await apiClient.get<WorkerRosterSummary>('/workers/summary', { params: mineId ? { mineId } : undefined })).data,
  createWorker: async (payload: Record<string, unknown>): Promise<WorkerItem> =>
    (await apiClient.post<WorkerItem>('/workers', payload)).data,

  // 5. Approvals Queue
  approvalsList: async (params?: Record<string, string | number | undefined>): Promise<PageResult<ApprovalRequestItem>> =>
    (await apiClient.get<PageResult<ApprovalRequestItem>>('/approvals', { params })).data,
  reviewApproval: async (id: string, status: 'approved' | 'rejected', notes?: string): Promise<ApprovalRequestItem> =>
    (await apiClient.patch<ApprovalRequestItem>(`/approvals/${id}/review`, { status, notes })).data,
  createApprovalRequest: async (payload: Record<string, unknown>): Promise<ApprovalRequestItem> =>
    (await apiClient.post<ApprovalRequestItem>('/approvals', payload)).data,

  // 6. Safety Observations
  observations: async (params?: Record<string, string | number | undefined>): Promise<PageResult<SafetyObservationItem>> =>
    (await apiClient.get<PageResult<SafetyObservationItem>>('/observations', { params })).data,
  createObservation: async (payload: Record<string, unknown>): Promise<SafetyObservationItem> =>
    (await apiClient.post<SafetyObservationItem>('/observations', payload)).data,
  updateObservationStatus: async (id: string, status: string, notes?: string): Promise<SafetyObservationItem> =>
    (await apiClient.patch<SafetyObservationItem>(`/observations/${id}/status`, { status, notes })).data,

  // 7. Worker Frontline Tasks & Attendance
  workerTasks: async (): Promise<WorkerTaskItem[]> =>
    (await apiClient.get<WorkerTaskItem[]>('/workers/tasks')).data,
  toggleWorkerTask: async (id: string): Promise<WorkerTaskItem> =>
    (await apiClient.patch<WorkerTaskItem>(`/workers/tasks/${id}/toggle`)).data,
  workerAttendanceHistory: async (): Promise<WorkerAttendanceItem[]> =>
    (await apiClient.get<WorkerAttendanceItem[]>('/workers/attendance')).data,

  pendingGeoAttendance: async (): Promise<GeoAttendanceRecord[]> => {
    const response = await apiClient.get<{ data: GeoAttendanceRecord[] }>('/attendance/pending')
    return response.data.data.map((record) => ({
      ...record,
      worker:
        record.worker ??
        (typeof record.workerId === 'object' ? (record.workerId as GeoAttendanceRecord['worker']) : undefined)
    }))
  },

  allGeoAttendance: async (params?: Record<string, string | number | undefined>): Promise<GeoAttendanceRecord[]> => {
    const response = await apiClient.get<{ data: GeoAttendanceRecord[] }>('/attendance/all', { params })
    return response.data.data.map((record) => ({
      ...record,
      worker:
        record.worker ??
        (typeof record.workerId === 'object' ? (record.workerId as GeoAttendanceRecord['worker']) : undefined)
    }))
  },

  updateGeoAttendanceStatus: async (id: string, status: 'Present' | 'Absent'): Promise<GeoAttendanceRecord> =>
    (await apiClient.patch<GeoAttendanceRecord>(`/attendance/${id}/status`, { status })).data
}
