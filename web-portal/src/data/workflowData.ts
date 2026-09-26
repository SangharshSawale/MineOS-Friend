import type { WorkflowAction, WorkflowInspection, WorkflowViolation } from '../types'

export const workflowInspections: WorkflowInspection[] = [
  { id: 'INS-2048', mine: 'Mine A-4', mineCode: 'M-A4', type: 'Statutory safety', scheduledFor: '05 Sep 2026', completedOn: '05 Sep 2026', inspector: 'R. Sharma', status: 'Follow-up required', location: 'North development panel, Level 3', latitude: 23.6104, longitude: 85.2799, observations: 'Roof support register was not available at the working face. Ventilation readings were within the prescribed range.', photoCount: 3, violationCount: 1, actionCount: 1 },
  { id: 'INS-2047', mine: 'Mine C-2', mineCode: 'M-C2', type: 'Environmental', scheduledFor: '04 Sep 2026', completedOn: '04 Sep 2026', inspector: 'A. Patel', status: 'Completed', location: 'Overburden dump and settling pond', latitude: 20.2961, longitude: 85.8245, observations: 'Silt trap maintenance observation recorded. No discharge found outside the settling pond.', photoCount: 2, violationCount: 1, actionCount: 1 },
  { id: 'INS-2046', mine: 'Mine D-7', mineCode: 'M-D7', type: 'Routine compliance', scheduledFor: '03 Sep 2026', completedOn: '03 Sep 2026', inspector: 'R. Sharma', status: 'Completed', location: 'Main access and workshop', latitude: 22.5726, longitude: 88.3639, observations: 'Required registers, PPE controls and emergency access arrangements were checked and found compliant.', photoCount: 4, violationCount: 0, actionCount: 0 },
  { id: 'INS-2045', mine: 'Mine B-1', mineCode: 'M-B1', type: 'Contractor safety', scheduledFor: '09 Sep 2026', inspector: 'S. Verma', status: 'Draft', location: 'Contractor assembly area', latitude: 21.2514, longitude: 81.6296, observations: 'Inspection is scheduled; field observations have not yet been recorded.', photoCount: 0, violationCount: 0, actionCount: 0 },
]

export const workflowViolations: WorkflowViolation[] = [
  { id: 'VIO-311', inspectionId: 'INS-2048', mine: 'Mine A-4', title: 'Support system record gap', description: 'The current roof support inspection register was unavailable at the working face during inspection.', category: 'Roof support', severity: 'High', status: 'Open', assignedTo: 'Operations lead', deadline: '06 Sep 2026', evidenceCount: 2 },
  { id: 'VIO-308', inspectionId: 'INS-2047', mine: 'Mine C-2', title: 'Ventilation review observation', description: 'The scheduled ventilation review requires documented supervisor sign-off.', category: 'Ventilation', severity: 'Medium', status: 'Under review', assignedTo: 'Safety officer', deadline: '07 Sep 2026', evidenceCount: 1 },
  { id: 'VIO-299', inspectionId: 'INS-2042', mine: 'Mine B-1', title: 'PPE issue', description: 'Contractor induction evidence was incomplete for two workers.', category: 'PPE', severity: 'Low', status: 'Resolved', assignedTo: 'HR coordinator', deadline: '02 Sep 2026', evidenceCount: 3 },
]

export const workflowActions: WorkflowAction[] = [
  { id: 'CA-091', violationId: 'VIO-311', inspectionId: 'INS-2048', mine: 'Mine A-4', title: 'Update roof support inspection register', responsiblePerson: 'Operations lead', deadline: '06 Sep 2026', status: 'Overdue', evidenceCount: 1 },
  { id: 'CA-087', violationId: 'VIO-308', inspectionId: 'INS-2047', mine: 'Mine C-2', title: 'Close ventilation observation', responsiblePerson: 'Safety officer', deadline: '07 Sep 2026', status: 'In progress', evidenceCount: 1 },
  { id: 'CA-079', violationId: 'VIO-299', inspectionId: 'INS-2042', mine: 'Mine B-1', title: 'Submit contractor induction evidence', responsiblePerson: 'HR coordinator', deadline: '09 Sep 2026', status: 'Completed', evidenceCount: 3 },
]
