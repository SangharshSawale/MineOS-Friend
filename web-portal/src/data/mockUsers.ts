import type { AppRole, User } from '../types'

export const roleDetails: Record<AppRole, { label: string; description: string; greeting: string }> = {
  admin: { label: 'Administrator', description: 'System-wide governance and administrative oversight.', greeting: 'Governance operations overview' },
  mine_manager: { label: 'Mine Manager', description: 'Operational compliance, incident response and corrective action verification.', greeting: 'Mine operations at a glance' },
  safety_officer: { label: 'Safety Officer', description: 'Safety monitoring, incident investigations, inspections and violation enforcement.', greeting: 'Safety controls requiring attention' },
  corporate_officer: { label: 'Corporate Officer', description: 'Enterprise-level risk monitoring and compliance governance.', greeting: 'Enterprise compliance overview' },
  regulator: { label: 'Regulator', description: 'Statutory compliance tracking and regulatory records.', greeting: 'Regulatory monitoring overview' },
  worker: { label: 'Mine Worker', description: 'Frontline operations and fast hazard/incident reporting.', greeting: 'Mine safety and reporting' },
  inspector: { label: 'Inspector', description: 'On-site inspections, violation logging and action assignments.', greeting: 'Inspection and safety controls' },
  contractor: { label: 'Contractor', description: 'Assigned corrective actions and work verification.', greeting: 'Assigned remediation actions' },

  // Legacy mappings
  manager: { label: 'Mine Manager', description: 'Operational compliance and corrective action oversight.', greeting: 'Mine operations at a glance' },
  safety: { label: 'Safety Officer', description: 'Safety observations, inspections and incident readiness.', greeting: 'Safety controls requiring attention' },
  corporate: { label: 'Corporate', description: 'Enterprise-level performance and governance monitoring.', greeting: 'Enterprise compliance overview' },
  viewer: { label: 'Viewer', description: 'Read-only observer access.', greeting: 'Governance monitoring overview' }
}

export const createMockUser = (email: string, role: AppRole): User => ({
  name: roleDetails[role]?.label ?? 'User',
  email,
  role
})
