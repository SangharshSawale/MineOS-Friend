import type { Alert, CorrectiveAction, DashboardMetric, Inspection, Mine, Violation } from '../types'

export const metrics: DashboardMetric[] = [
  { label: 'Total mines', value: '18', change: 'Across monitored operations', tone: 'blue', icon: 'M' },
  { label: 'Compliance', value: '88.4%', change: '+2.1% this month', tone: 'green', icon: 'OK' },
  { label: 'Open violations', value: '14', change: '3 need escalation', tone: 'amber', icon: '!' },
  { label: 'Critical violations', value: '2', change: 'Immediate management attention', tone: 'red', icon: '!' },
  { label: 'Overdue actions', value: '8', change: 'Action owner follow-up required', tone: 'red', icon: '>' },
  { label: 'Risk score', value: '62', change: 'Moderate enterprise risk', tone: 'amber', icon: 'R' },
]
export const mines: Mine[] = [
  { name: 'Mine A-4', location: 'Jharkhand', compliance: 72, risk: 'High', openItems: 7 },
  { name: 'Mine C-2', location: 'Odisha', compliance: 79, risk: 'High', openItems: 5 },
  { name: 'Mine B-1', location: 'Chhattisgarh', compliance: 84, risk: 'Medium', openItems: 4 },
  { name: 'Mine D-7', location: 'West Bengal', compliance: 93, risk: 'Low', openItems: 1 },
]
export const inspections: Inspection[] = [
  { id: 'INS-2048', mine: 'Mine A-4', date: '05 Sep 2026', type: 'Statutory safety', result: 'Follow-up required' },
  { id: 'INS-2047', mine: 'Mine C-2', date: '04 Sep 2026', type: 'Environmental', result: 'Observations' },
  { id: 'INS-2046', mine: 'Mine D-7', date: '03 Sep 2026', type: 'Routine compliance', result: 'Compliant' },
]
export const actions: CorrectiveAction[] = [
  { id: 'CA-091', action: 'Update roof support inspection register', mine: 'Mine A-4', owner: 'Operations lead', due: 'Today', status: 'Overdue' },
  { id: 'CA-087', action: 'Close ventilation observation', mine: 'Mine C-2', owner: 'Safety officer', due: '07 Sep', status: 'In progress' },
  { id: 'CA-079', action: 'Submit contractor induction evidence', mine: 'Mine B-1', owner: 'HR coordinator', due: '09 Sep', status: 'In progress' },
]
export const alerts: Alert[] = [
  { id: 'ALT-1', title: 'Overdue corrective action', detail: 'Mine A-4 - roof support register', severity: 'High', time: '42 min ago' },
  { id: 'ALT-2', title: 'Inspection follow-up due', detail: 'Mine C-2 - environmental observations', severity: 'Medium', time: '3 hrs ago' },
  { id: 'ALT-3', title: 'Monthly report ready', detail: 'August compliance summary is available', severity: 'Info', time: 'Yesterday' },
]
export const violations: Violation[] = [
  { id: 'VIO-311', mine: 'Mine A-4', type: 'Support system record gap', severity: 'High', status: 'Open' },
  { id: 'VIO-308', mine: 'Mine C-2', type: 'Ventilation review observation', severity: 'Medium', status: 'Under review' },
  { id: 'VIO-299', mine: 'Mine B-1', type: 'PPE issue', severity: 'Low', status: 'Resolved' },
]
