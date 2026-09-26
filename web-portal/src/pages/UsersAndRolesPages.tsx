import { useEffect, useState } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
}

export function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        const data = await workflowService.usersList(roleFilter || undefined)
        setUsers(data)
      } catch {
        setError('Unable to load user roster.')
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [roleFilter])

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 19 · Statutory User Directory
            </span>
            <span className="text-slate-400 text-xs">Coal India Limited</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            User Administration & Personnel Directory
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Statutory credentialing and active user accounts across regional subsidiaries and headquarters.
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search user by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-minsos-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-600 text-xs font-medium">Role Scope:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs"
            >
              <option value="">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="corporate_officer">Corporate Officer</option>
              <option value="mine_manager">Mine Manager</option>
              <option value="safety_officer">Safety Officer</option>
              <option value="regulator">Regulator</option>
              <option value="worker">Mine Worker</option>
              <option value="inspector">Inspector</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 text-xs">
          {filteredUsers.length} credentialed users active
        </span>
      </div>

      {/* Users Table */}
      <SectionCard title="Credentialed Personnel Roster" subtitle="Statutory accounts authorized under DGMS safety protocols">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Personnel Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Statutory Role</th>
                <th className="px-4 py-3">Access Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading user roster...</td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No users found matching current filter.</td>
                </tr>
              )}
              {!loading &&
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {u.role === 'admin' ? 'Level 1 Root' : u.role === 'regulator' ? 'Regulatory Oversight' : 'Operational Scope'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-2.5 py-1 text-minsos-700 hover:bg-minsos-50 border border-minsos-200 rounded-lg font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Personnel Profile</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Full Name</p>
                <p className="font-bold text-slate-900 text-sm">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Official Email</p>
                <p className="font-mono text-slate-800">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Statutory Role Assignment</p>
                <p className="font-bold text-minsos-700 uppercase">{selectedUser.role.replace('_', ' ')}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-800 mb-1">Mines Act 1952 Statutory Scope:</p>
                <p className="text-slate-600 leading-relaxed">
                  Authorized for operations, hazard verifications, and digital compliance submissions matching statutory role credentials.
                </p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RolesPermissionsPage() {
  const rolesSummary = [
    {
      role: '⚙️ Administrator',
      scope: 'Full System Root',
      desc: 'System governance, user administration, contractor master, compliance registry, and immutable audit ledger management.',
      permissions: ['User CRUD', 'Contractor Master', 'Compliance Setup', 'System Logs', 'Audit Ledger', 'System Preferences']
    },
    {
      role: '🏢 Corporate Officer',
      scope: 'Enterprise Portfolio',
      desc: 'CIL board-level oversight across all subsidiary coalfields, production versus safety targets, environmental indicators, and AI risk synthesis.',
      permissions: ['All Mines Directory', 'Production Metrics', 'Environmental Data', 'Enterprise GIS', 'Board Reports', 'AI Insights']
    },
    {
      role: '⛏️ Mine Manager',
      scope: 'Colliery Operational Command',
      desc: 'Full colliery-level jurisdiction, statutory inspections, shift muster rolls, hazard verification, and corrective action sign-off authority.',
      permissions: ['My Mine Profile', 'Pit Workforces', 'Production Extraction', 'Hazard Registry', 'Closure Approvals', 'Shift Reports']
    },
    {
      role: '🛡️ Safety Officer',
      scope: 'Hazard Oversight & Safety Inspection',
      desc: 'Primary on-site safety enforcement, gas telemetry supervision, safety observations, incident investigation, and violation enforcement.',
      permissions: ['Inspections', 'Safety Observations', 'Violations Triage', 'Incident Inquiries', 'Telemetry Analytics', 'Safety Reports']
    },
    {
      role: '⚖️ Regulator (DGMS)',
      scope: 'Independent Regulatory Authority',
      desc: 'Directorate General of Mines Safety compliance auditing, Section 22 inquiry filing, regulatory show-cause issuance, and tamper-evident ledger access.',
      permissions: ['Statutory Compliance Audits', 'DGMS Inquiries', 'Enforcement Orders', 'Hazard Mapping', 'Regulatory Filing', 'Audit Trail']
    },
    {
      role: '👷 Mine Worker',
      scope: 'Frontline Operational Workforce',
      desc: 'Frontline hazard reporting, pre-shift safety checklists, biometric shift attendance tracking, vocational training certificates, and incident alerts.',
      permissions: ['1-Click Hazard Report', 'Pre-Shift Checklists', 'Attendance Muster', 'Training Records', 'Pit Siren Alerts', 'Personal ID']
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
            Module 20 · RBAC Security Architecture
          </span>
          <span className="text-slate-400 text-xs">Coal Mines Regulations 2017</span>
        </div>
        <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
          Roles & Statutory Permissions Matrix
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Granular role-based capability boundaries and statutory authorities enforced across all MINSOS endpoints.
        </p>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rolesSummary.map((item, idx) => (
          <div key={idx} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">{item.role}</h3>
                <span className="bg-minsos-50 text-minsos-700 text-[10px] font-bold px-2 py-0.5 rounded border border-minsos-200">
                  {item.scope}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Key Granted Capabilities:</p>
              <div className="flex flex-wrap gap-1.5">
                {item.permissions.map((p, pIdx) => (
                  <span key={pIdx} className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Comparison Matrix */}
      <SectionCard title="Statutory Authority Verification Matrix" subtitle="Enforced by server-side middleware and frontend navigation guards">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Capability Area</th>
                <th className="px-3 py-3 text-center">Admin</th>
                <th className="px-3 py-3 text-center">Corporate</th>
                <th className="px-3 py-3 text-center">Manager</th>
                <th className="px-3 py-3 text-center">Safety Off.</th>
                <th className="px-3 py-3 text-center">Regulator</th>
                <th className="px-3 py-3 text-center">Worker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {[
                { name: 'Dashboard & Telemetry Summary', roles: [true, true, true, true, true, true] },
                { name: 'Mines Directory & CRUD', roles: [true, true, true, false, true, false] },
                { name: 'Statutory Inspections Management', roles: [false, true, true, true, true, false] },
                { name: 'Hazard Violations Logging & Triage', roles: [false, true, true, true, true, false] },
                { name: 'Corrective Action Verification', roles: [false, true, true, true, true, false] },
                { name: 'Frontline Incident Reporting', roles: [false, false, true, true, false, true] },
                { name: 'Contractor Governance & Compliance', roles: [true, true, true, false, false, false] },
                { name: 'Production & Environmental Metrics', roles: [false, true, true, false, false, false] },
                { name: 'GIS Spatial Map & GPS Hazards', roles: [false, true, true, true, true, false] },
                { name: 'Statutory Reports & Excel/PDF Export', roles: [false, true, true, true, true, false] },
                { name: 'Tamper-Evident SHA-256 Audit Ledger', roles: [true, false, false, false, true, false] },
                { name: 'User & System Administration', roles: [true, false, false, false, false, false] }
              ].map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  {row.roles.map((hasAccess, cIdx) => (
                    <td key={cIdx} className="px-3 py-3 text-center">
                      {hasAccess ? (
                        <span className="text-emerald-600 font-bold">✓ Granted</span>
                      ) : (
                        <span className="text-slate-300">✕ Blocked</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
