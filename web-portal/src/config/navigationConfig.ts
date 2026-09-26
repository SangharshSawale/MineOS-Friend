import type { AppRole } from '../types'

export interface NavItem {
  label: string
  path: string
  symbol: string
  badge?: string
}

export const ROLE_NAVIGATION_CONFIG: Record<string, NavItem[]> = {
  // ⚙️ Administrator
  admin: [
    { label: 'Dashboard', path: 'dashboard', symbol: '▦' },
    { label: 'Users', path: 'users', symbol: '👥' },
    { label: 'Roles & Permissions', path: 'roles', symbol: '🔐' },
    { label: 'Mines', path: 'mines', symbol: '⛏' },
    { label: 'Contractors', path: 'contractors', symbol: '♙' },
    { label: 'Compliance Master', path: 'compliance', symbol: '✓' },
    { label: 'Documents', path: 'documents', symbol: '📁' },
    { label: 'Worker Attendance', path: 'worker-attendance', symbol: '⏱' },
    { label: 'Notifications', path: 'notifications', symbol: '🔔' },
    { label: 'Audit Logs', path: 'audit', symbol: '🕒' },
    { label: 'System Settings', path: 'settings', symbol: '⚙' }
  ],

  // 🏢 Corporate Officer
  corporate_officer: [
    { label: 'Dashboard', path: 'dashboard', symbol: '▦' },
    { label: 'Mines', path: 'mines', symbol: '⛏' },
    { label: 'Compliance', path: 'compliance', symbol: '✓' },
    { label: 'Inspections', path: 'inspections', symbol: '⌕' },
    { label: 'Violations', path: 'violations', symbol: '!' },
    { label: 'Corrective Actions', path: 'actions', symbol: '↗' },
    { label: 'Contractors', path: 'contractors', symbol: '♙' },
    { label: 'Production', path: 'production', symbol: '🏭' },
    { label: 'Environment', path: 'environment', symbol: '🌱' },
    { label: 'GIS Map', path: 'gis', symbol: '🗺' },
    { label: 'AI Insights', path: 'ai-insights', symbol: '💬' },
    { label: 'Alerts', path: 'alerts', symbol: '⚠' },
    { label: 'Reports', path: 'reports', symbol: '▤' }
  ],

  // ⛏️ Mine Manager
  mine_manager: [
    { label: 'Dashboard', path: 'dashboard', symbol: '▦' },
    { label: 'My Mine', path: 'my-mine', symbol: '⛏' },
    { label: 'Compliance', path: 'compliance', symbol: '✓' },
    { label: 'Inspections', path: 'inspections', symbol: '⌕' },
    { label: 'Violations', path: 'violations', symbol: '!' },
    { label: 'Corrective Actions', path: 'actions', symbol: '↗' },
    { label: 'Incidents', path: 'incidents', symbol: '⚠' },
    { label: 'Contractors', path: 'contractors', symbol: '♙' },
    { label: 'Workers', path: 'workers', symbol: '👷' },
    { label: 'Worker Attendance', path: 'worker-attendance', symbol: '⏱' },
    { label: 'Production', path: 'production', symbol: '🏭' },
    { label: 'Environment', path: 'environment', symbol: '🌱' },
    { label: 'GIS Map', path: 'gis', symbol: '🗺' },
    { label: 'AI Risk', path: 'ai-risk', symbol: '⚡' },
    { label: 'Alerts', path: 'alerts', symbol: '🔔' },
    { label: 'Reports', path: 'reports', symbol: '▤' },
    { label: 'Approvals', path: 'approvals', symbol: '🛡️' }
  ],

  // 🛡️ Safety Officer
  safety_officer: [
    { label: 'Dashboard', path: 'dashboard', symbol: '▦' },
    { label: 'Worker Attendance', path: 'worker-attendance', symbol: '⏱' },
    { label: 'Inspections', path: 'inspections', symbol: '⌕' },
    { label: 'Safety Observations', path: 'observations', symbol: '👁' },
    { label: 'Violations', path: 'violations', symbol: '!' },
    { label: 'Incidents', path: 'incidents', symbol: '⚠' },
    { label: 'Corrective Actions', path: 'actions', symbol: '↗' },
    { label: 'Compliance', path: 'compliance', symbol: '✓' },
    { label: 'GIS Map', path: 'gis', symbol: '🗺' },
    { label: 'Risk Analysis', path: 'risk-analysis', symbol: '⚡' },
    { label: 'Alerts', path: 'alerts', symbol: '🔔' },
    { label: 'Safety Reports', path: 'reports', symbol: '▤' },
    { label: 'Documents', path: 'documents', symbol: '📁' }
  ],

  // ⚖️ Regulator
  regulator: [
    { label: 'Dashboard', path: 'dashboard', symbol: '▦' },
    { label: 'Mines', path: 'mines', symbol: '⛏' },
    { label: 'Compliance', path: 'compliance', symbol: '✓' },
    { label: 'Inspections', path: 'inspections', symbol: '⌕' },
    { label: 'Violations', path: 'violations', symbol: '!' },
    { label: 'Corrective Actions', path: 'actions', symbol: '↗' },
    { label: 'Incidents', path: 'incidents', symbol: '⚠' },
    { label: 'GIS Map', path: 'gis', symbol: '🗺' },
    { label: 'Risk Analysis', path: 'risk-analysis', symbol: '⚡' },
    { label: 'Regulatory Reports', path: 'reports', symbol: '▤' },
    { label: 'Documents', path: 'documents', symbol: '📁' },
    { label: 'Audit Trail', path: 'audit', symbol: '🕒' }
  ],

  // 👷 Mine Worker
  worker: [
    { label: 'Dashboard', path: 'dashboard', symbol: '▦' },
    { label: 'My Tasks', path: 'tasks', symbol: '📋' },
    { label: 'My Attendance', path: 'attendance', symbol: '⏱' },
    { label: 'Report Safety Issue', path: 'report-safety', symbol: '⚠️' },
    { label: 'Report Incident', path: 'incidents', symbol: '🚨' },
    { label: 'My Corrective Actions', path: 'my-actions', symbol: '↗' },
    { label: 'Training', path: 'training', symbol: '🎓' },
    { label: 'Notifications', path: 'notifications', symbol: '🔔' },
    { label: 'My Reports', path: 'my-reports', symbol: '▤' },
    { label: 'Profile', path: 'profile', symbol: '👤' }
  ],

  // Backward-compatible aliases for legacy demo sessions
  manager: [],
  safety: [],
  corporate: [],
  viewer: []
}

// Link aliases
ROLE_NAVIGATION_CONFIG.manager = ROLE_NAVIGATION_CONFIG.mine_manager
ROLE_NAVIGATION_CONFIG.safety = ROLE_NAVIGATION_CONFIG.safety_officer
ROLE_NAVIGATION_CONFIG.corporate = ROLE_NAVIGATION_CONFIG.corporate_officer
ROLE_NAVIGATION_CONFIG.viewer = ROLE_NAVIGATION_CONFIG.regulator

export function getRoleNavItems(role: AppRole): NavItem[] {
  return ROLE_NAVIGATION_CONFIG[role] ?? ROLE_NAVIGATION_CONFIG.admin
}

export function isRoutePermittedForRole(role: AppRole, subPath: string): boolean {
  if (!subPath || subPath === 'dashboard' || subPath === 'settings') return true
  // Admin has global oversight over spatial mine mapping
  if (role === 'admin' && (subPath === 'gis' || subPath.startsWith('gis'))) return true
  const allowed = getRoleNavItems(role)
  if (subPath.startsWith('inspections/')) {
    return allowed.some((item) => item.path === 'inspections')
  }
  return allowed.some((item) => item.path === subPath || subPath.startsWith(item.path + '/'))
}
