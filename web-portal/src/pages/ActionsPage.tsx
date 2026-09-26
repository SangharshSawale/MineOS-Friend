import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { workflowService, type WorkflowLookup } from '../services/workflow'
import type {
  ActionStatus,
  WorkflowAction,
  WorkflowViolation
} from '../types'
import {
  ApprovedSealIcon,
  AuditIcon,
  CameraUploadIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  FilterIcon,
  KanbanIcon,
  MinesIcon,
  RefreshIcon,
  RoleIcon,
  SearchIcon,
  TableIcon,
  VerifyShieldIcon,
  WorkerHelmetIcon,
  WorkflowArrowIcon
} from '../components/icons'

// Pipeline stages definition
const PIPELINE_STAGES = [
  { key: 'assigned', label: '1. Assigned', icon: WorkerHelmetIcon, desc: 'Assigned to field worker' },
  { key: 'in_progress', label: '2. In Progress', icon: ClockIcon, desc: 'Field execution underway' },
  { key: 'evidence_submitted', label: '3. Evidence Submitted', icon: CameraUploadIcon, desc: 'Photo/report proof uploaded' },
  { key: 'verified', label: '4. Safety Verified', icon: VerifyShieldIcon, desc: 'Certified by Safety Officer' },
  { key: 'approved', label: '5. Manager Approved', icon: ApprovedSealIcon, desc: 'Closed & DGMS sealed' }
] as const

export function ActionsPage() {
  const { user } = useAuth()
  const userRole = user?.role || 'worker'

  const [items, setItems] = useState<WorkflowAction[]>([])
  const [violations, setViolations] = useState<WorkflowViolation[]>([])
  const [usersList, setUsersList] = useState<WorkflowLookup[]>([])
  const [minesList, setMinesList] = useState<WorkflowLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // View & Filter States
  const [viewMode, setViewMode] = useState<'matrix' | 'kanban'>('matrix')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mineFilter, setMineFilter] = useState<string>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [stageFilter, setStageFilter] = useState<string | null>(null)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitEvidenceItem, setSubmitEvidenceItem] = useState<WorkflowAction | null>(null)
  const [verifyItem, setVerifyItem] = useState<WorkflowAction | null>(null)
  const [approveItem, setApproveItem] = useState<WorkflowAction | null>(null)
  const [detailItem, setDetailItem] = useState<WorkflowAction | null>(null)

  const isSafetyOrManager = ['admin', 'mine_manager', 'safety_officer'].includes(userRole)
  const isManager = ['admin', 'mine_manager'].includes(userRole)
  const isSafety = ['admin', 'safety_officer'].includes(userRole)

  // Fetch actions
  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [actionsRes, violationsRes, usersRes, minesRes] = await Promise.all([
        workflowService.actions(),
        workflowService.violations().catch(() => ({ data: [] })),
        workflowService.users().catch(() => []),
        workflowService.mines().catch(() => [])
      ])
      setItems(actionsRes.data)
      setViolations(violationsRes.data)
      setUsersList(usersRes)
      setMinesList(minesRes)
    } catch {
      setError('Unable to retrieve corrective actions from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-dismiss success notifications
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // KPIs
  const kpis = useMemo(() => {
    const total = items.length
    const assignedOrProgress = items.filter(
      (a) => a.status === 'Assigned' || a.status === 'In progress' || a.status === 'Open'
    ).length
    const evidenceSubmitted = items.filter((a) => a.status === 'Evidence submitted').length
    const verified = items.filter((a) => a.status === 'Verified').length
    const approved = items.filter((a) => a.status === 'Approved' || a.status === 'Completed').length
    const overdue = items.filter((a) => a.status === 'Overdue').length
    const clearanceRate = total > 0 ? Math.round((approved / total) * 100) : 0

    return { total, assignedOrProgress, evidenceSubmitted, verified, approved, overdue, clearanceRate }
  }, [items])

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Full text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchMine = item.mine.toLowerCase().includes(query)
        const matchAssignee = (item.assignedToName || item.responsiblePerson).toLowerCase().includes(query)
        const matchId = item.id.toLowerCase().includes(query)
        const matchVio = (item.violationTitle || '').toLowerCase().includes(query)
        if (!matchTitle && !matchMine && !matchAssignee && !matchId && !matchVio) return false
      }

      // Stage quick filter
      if (stageFilter) {
        if (stageFilter === 'assigned' && item.status !== 'Assigned' && item.status !== 'Open') return false
        if (stageFilter === 'in_progress' && item.status !== 'In progress') return false
        if (stageFilter === 'evidence_submitted' && item.status !== 'Evidence submitted') return false
        if (stageFilter === 'verified' && item.status !== 'Verified') return false
        if (stageFilter === 'approved' && item.status !== 'Approved' && item.status !== 'Completed') return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter.toLowerCase() !== item.status.toLowerCase().replace(' ', '_')) return false
      }

      // Mine filter
      if (mineFilter !== 'all' && item.mine !== mineFilter) return false

      // Overdue filter
      if (overdueOnly && item.status !== 'Overdue') return false

      return true
    })
  }, [items, searchQuery, statusFilter, mineFilter, overdueOnly, stageFilter])

  // CSV Export
  const exportCsv = () => {
    const headers = [
      'Action ID',
      'Action Title',
      'Mine / Colliery',
      'Linked Violation',
      'Assigned Worker',
      'Responsible Officer',
      'Statutory Deadline',
      'Pipeline Status',
      'Evidence Count',
      'Verification Note',
      'Approval Note'
    ]
    const rows = filteredItems.map((a) => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.mine}"`,
      `"${a.violationTitle || a.violationId || 'N/A'}"`,
      `"${a.assignedToName || 'Unassigned'}"`,
      `"${a.responsiblePerson}"`,
      a.deadline,
      a.status,
      a.evidenceCount,
      `"${a.verificationNote || ''}"`,
      `"${a.approval?.note || ''}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `DGMS_Corrective_Actions_Register_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Quick Advance Worker Action: Start Work
  const handleStartWork = async (action: WorkflowAction) => {
    try {
      await workflowService.updateAction(action.id, { status: 'in_progress' })
      setSuccessMsg(`Action "${action.title}" marked as In Progress. Field rectification commenced.`)
      loadData()
    } catch {
      setError('Unable to update action status.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. EXECUTIVE COMMAND HUB BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-minsos-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-minsos-800/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                DGMS Directive & Remediation Pipeline
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <RoleIcon role={userRole} className="w-3.5 h-3.5 text-minsos-400" />
                Role: {userRole.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Statutory Corrective Actions Command Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Multi-role compliance lifecycle: Register hazard remediation → Worker assignment → Field execution & photographic evidence → Safety Officer verification → Mine Manager final closure approval.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'matrix' ? 'bg-minsos-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Table Matrix View"
              >
                <TableIcon className="w-4 h-4" />
                <span>Matrix</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'kanban' ? 'bg-minsos-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Pipeline Kanban View"
              >
                <KanbanIcon className="w-4 h-4" />
                <span>Pipeline</span>
              </button>
            </div>

            {/* CSV Export */}
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700 transition shadow-sm"
              title="Export filtered records to CSV"
            >
              <DownloadIcon className="w-4 h-4 text-minsos-400" />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700 transition shadow-sm"
              title="Refresh register"
            >
              <RefreshIcon className={`w-4 h-4 text-minsos-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Register Action Button (Officer / Manager / Admin) */}
            {isSafetyOrManager && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-minsos-600 hover:bg-minsos-500 text-white shadow-md hover:shadow-minsos-600/30 transition transform active:scale-95"
              >
                <span className="text-base leading-none">+</span>
                <span>Register Action</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 shadow-sm">
          <p className="text-sm font-semibold">{error}</p>
          <button onClick={() => setError('')} className="text-rose-700 hover:text-rose-900">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. VISUAL PIPELINE STEPPER BAR (Interactive Filter) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <WorkflowArrowIcon className="w-4 h-4 text-minsos-600" />
            Statutory Workflow Progression Lifecycle
          </span>
          {stageFilter && (
            <button
              onClick={() => setStageFilter(null)}
              className="text-xs font-semibold text-minsos-600 hover:text-minsos-800 hover:underline"
            >
              Clear Stage Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon
            const isSelected = stageFilter === stage.key
            let stageCount = 0
            if (stage.key === 'assigned') {
              stageCount = items.filter((a) => a.status === 'Assigned' || a.status === 'Open').length
            } else if (stage.key === 'in_progress') {
              stageCount = items.filter((a) => a.status === 'In progress').length
            } else if (stage.key === 'evidence_submitted') {
              stageCount = items.filter((a) => a.status === 'Evidence submitted').length
            } else if (stage.key === 'verified') {
              stageCount = items.filter((a) => a.status === 'Verified').length
            } else if (stage.key === 'approved') {
              stageCount = items.filter((a) => a.status === 'Approved' || a.status === 'Completed').length
            }

            return (
              <button
                key={stage.key}
                onClick={() => setStageFilter(isSelected ? null : stage.key)}
                className={`relative flex flex-col p-3 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-minsos-50 border-minsos-500 ring-2 ring-minsos-400/30'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-minsos-600 text-white' : 'bg-white text-slate-700 shadow-2xs'}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className={`text-base font-extrabold ${isSelected ? 'text-minsos-700' : 'text-slate-800'}`}>
                    {stageCount}
                  </span>
                </div>
                <div className="font-semibold text-xs text-slate-900 truncate">{stage.label}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{stage.desc}</div>
                {idx < 4 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. INTERACTIVE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total */}
        <button
          onClick={() => {
            setStatusFilter('all')
            setOverdueOnly(false)
            setStageFilter(null)
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            statusFilter === 'all' && !overdueOnly && !stageFilter
              ? 'bg-minsos-50/70 border-minsos-500 ring-2 ring-minsos-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">Total Registered</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Full Colliery Fleet</div>
        </button>

        {/* Assigned & Field Execution */}
        <button
          onClick={() => {
            setStatusFilter('all')
            setOverdueOnly(false)
            setStageFilter('in_progress')
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            stageFilter === 'in_progress'
              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-blue-700">In Field Execution</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{kpis.assignedOrProgress}</div>
          <div className="text-[11px] text-blue-600 mt-1">👷 Active on ground</div>
        </button>

        {/* Evidence Submitted */}
        <button
          onClick={() => {
            setStatusFilter('all')
            setOverdueOnly(false)
            setStageFilter('evidence_submitted')
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            stageFilter === 'evidence_submitted'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-amber-700">Evidence Uploaded</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{kpis.evidenceSubmitted}</div>
          <div className="text-[11px] text-amber-600 mt-1">📸 Needs Safety Review</div>
        </button>

        {/* Verified by Safety */}
        <button
          onClick={() => {
            setStatusFilter('all')
            setOverdueOnly(false)
            setStageFilter('verified')
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            stageFilter === 'verified'
              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-purple-700">Safety Verified</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{kpis.verified}</div>
          <div className="text-[11px] text-purple-600 mt-1">🛡️ Needs Manager Sign-off</div>
        </button>

        {/* Closed & Approved */}
        <button
          onClick={() => {
            setStatusFilter('all')
            setOverdueOnly(false)
            setStageFilter('approved')
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            stageFilter === 'approved'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-700">DGMS Cleared</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{kpis.approved}</div>
          <div className="text-[11px] text-emerald-600 mt-1">{kpis.clearanceRate}% Clearance Rate</div>
        </button>

        {/* Overdue SLA */}
        <button
          onClick={() => {
            setOverdueOnly(!overdueOnly)
            setStageFilter(null)
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            overdueOnly
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Overdue SLA</span>
            {kpis.overdue > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{kpis.overdue}</div>
          <div className="text-[11px] text-rose-600 mt-1">🚨 Statutory Breach</div>
        </button>
      </div>

      {/* 4. SEARCH & FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, mine, worker, violation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-minsos-500/20 focus:border-minsos-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-minsos-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="evidence_submitted">Evidence Submitted</option>
            <option value="verified">Verified</option>
            <option value="approved">Approved & Closed</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Mine Dropdown */}
          <select
            value={mineFilter}
            onChange={(e) => setMineFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-minsos-500/20"
          >
            <option value="all">All Collieries</option>
            {minesList.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Overdue Checkbox */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-minsos-600 focus:ring-minsos-500"
            />
            <span>Overdue Breaches</span>
          </label>

          {(searchQuery || statusFilter !== 'all' || mineFilter !== 'all' || overdueOnly || stageFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setMineFilter('all')
                setOverdueOnly(false)
                setStageFilter(null)
              }}
              className="px-3 py-2 text-xs font-semibold text-minsos-600 hover:text-minsos-800 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Displaying <strong className="text-slate-800">{filteredItems.length}</strong> of{' '}
          <strong className="text-slate-800">{items.length}</strong> registered corrective actions
        </span>
      </div>

      {/* 5. VIEW MODE: MATRIX (TABLE) OR KANBAN */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshIcon className="w-8 h-8 text-minsos-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading statutory corrective action records...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <FilterIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No corrective actions match criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting search terms, resetting filters, or registering a new corrective action linked to a violation.
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* TABLE MATRIX VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Action & Violation Ref</th>
                  <th className="py-3.5 px-4">Colliery</th>
                  <th className="py-3.5 px-4">Worker & Officer</th>
                  <th className="py-3.5 px-4">Statutory Deadline</th>
                  <th className="py-3.5 px-4">Workflow Progression</th>
                  <th className="py-3.5 px-4 text-right">Role Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const statusInfo = getStatusBadge(item.status)

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                      {/* Action & Violation */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-minsos-700">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          <span className="font-mono text-slate-400">{item.id.slice(-6).toUpperCase()}</span>
                          {item.violationTitle && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 truncate max-w-[140px]" title={item.violationTitle}>
                                {item.violationTitle}
                              </span>
                            </>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{item.description}</p>
                        )}
                      </td>

                      {/* Colliery */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MinesIcon className="w-3.5 h-3.5 text-minsos-600 shrink-0" />
                          <span>{item.mine}</span>
                        </div>
                      </td>

                      {/* Worker & Assignee */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <WorkerHelmetIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{item.assignedToName || 'Unassigned Worker'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Officer: {item.responsiblePerson}
                        </div>
                      </td>

                      {/* Deadline & SLA */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">{item.deadline}</span>
                        </div>
                        {item.status === 'Overdue' && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                            Overdue Breach
                          </span>
                        )}
                      </td>

                      {/* Lifecycle Stage Stepper */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.classes}`}>
                            {statusInfo.icon}
                            {item.status}
                          </span>
                          {/* Evidence Pill */}
                          {item.evidenceCount > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-semibold">
                              <CameraUploadIcon className="w-3 h-3 text-teal-600" />
                              <span>{item.evidenceCount} Proof File(s) Attached</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role-Gated Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. WORKER CONTROLS */}
                          {(userRole === 'worker' || userRole === 'admin') && (
                            <>
                              {(item.status === 'Assigned' || item.status === 'Open') && (
                                <button
                                  onClick={() => handleStartWork(item)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                                  title="Commence work on this action"
                                >
                                  Start Work
                                </button>
                              )}

                              {(item.status === 'In progress' || item.status === 'Overdue' || item.status === 'Assigned') && (
                                <button
                                  onClick={() => setSubmitEvidenceItem(item)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
                                  title="Upload photo/report evidence"
                                >
                                  <CameraUploadIcon className="w-3.5 h-3.5" />
                                  <span>Submit Proof</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* 2. SAFETY OFFICER CONTROLS */}
                          {isSafety && item.status === 'Evidence submitted' && (
                            <button
                              onClick={() => setVerifyItem(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
                              title="Verify worker evidence"
                            >
                              <VerifyShieldIcon className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                          )}

                          {/* 3. MINE MANAGER CONTROLS */}
                          {isManager && item.status === 'Verified' && (
                            <button
                              onClick={() => setApproveItem(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                              title="Give final manager approval & close"
                            >
                              <ApprovedSealIcon className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Detail / Audit Trail Drawer Button */}
                          <button
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Inspect full lifecycle provenance"
                          >
                            <AuditIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PIPELINE KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Column 1: Assigned & In Field */}
          <KanbanColumn
            title="1. Assigned & In Progress"
            subtitle="Worker executing in field"
            badgeColor="bg-blue-100 text-blue-800"
            count={items.filter((a) => a.status === 'Assigned' || a.status === 'In progress' || a.status === 'Open').length}
            actions={filteredItems.filter((a) => a.status === 'Assigned' || a.status === 'In progress' || a.status === 'Open')}
            onSelectAction={setDetailItem}
            onSubmitEvidence={(a) => setSubmitEvidenceItem(a)}
            onStartWork={handleStartWork}
            userRole={userRole}
          />

          {/* Column 2: Evidence Submitted (Awaiting Safety Review) */}
          <KanbanColumn
            title="2. Evidence Submitted"
            subtitle="Awaiting Safety Officer verification"
            badgeColor="bg-amber-100 text-amber-800"
            count={items.filter((a) => a.status === 'Evidence submitted').length}
            actions={filteredItems.filter((a) => a.status === 'Evidence submitted')}
            onSelectAction={setDetailItem}
            onVerify={(a) => setVerifyItem(a)}
            userRole={userRole}
          />

          {/* Column 3: Verified (Awaiting Manager Approval) */}
          <KanbanColumn
            title="3. Safety Verified"
            subtitle="Awaiting Mine Manager sign-off"
            badgeColor="bg-purple-100 text-purple-800"
            count={items.filter((a) => a.status === 'Verified').length}
            actions={filteredItems.filter((a) => a.status === 'Verified')}
            onSelectAction={setDetailItem}
            onApprove={(a) => setApproveItem(a)}
            userRole={userRole}
          />

          {/* Column 4: Approved & Closed */}
          <KanbanColumn
            title="4. Closed & Approved"
            subtitle="DGMS compliant closure"
            badgeColor="bg-emerald-100 text-emerald-800"
            count={items.filter((a) => a.status === 'Approved' || a.status === 'Completed').length}
            actions={filteredItems.filter((a) => a.status === 'Approved' || a.status === 'Completed')}
            onSelectAction={setDetailItem}
            userRole={userRole}
          />
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* A. REGISTER ACTION MODAL */}
      {showCreateModal && (
        <RegisterActionModal
          violations={violations}
          users={usersList}
          mines={minesList}
          onClose={() => setShowCreateModal(false)}
          onCreated={(title) => {
            setShowCreateModal(false)
            setSuccessMsg(`Corrective Action "${title}" registered and assigned to worker successfully.`)
            loadData()
          }}
          onError={setError}
        />
      )}

      {/* B. WORKER SUBMIT EVIDENCE MODAL */}
      {submitEvidenceItem && (
        <SubmitEvidenceModal
          action={submitEvidenceItem}
          onClose={() => setSubmitEvidenceItem(null)}
          onSubmitted={() => {
            setSubmitEvidenceItem(null)
            setSuccessMsg(`Evidence submitted for "${submitEvidenceItem.title}". Forwarded to Safety Officer for verification.`)
            loadData()
          }}
          onError={setError}
        />
      )}

      {/* C. SAFETY OFFICER VERIFY MODAL */}
      {verifyItem && (
        <VerifyActionModal
          action={verifyItem}
          onClose={() => setVerifyItem(null)}
          onVerified={() => {
            setVerifyItem(null)
            setSuccessMsg(`Action "${verifyItem.title}" verified by Safety Officer. Forwarded to Mine Manager for final closure approval.`)
            loadData()
          }}
          onRejected={() => {
            setVerifyItem(null)
            setSuccessMsg(`Action "${verifyItem.title}" rejected back to worker for re-execution.`)
            loadData()
          }}
          onError={setError}
        />
      )}

      {/* D. MINE MANAGER APPROVE CLOSURE MODAL */}
      {approveItem && (
        <ApproveActionModal
          action={approveItem}
          onClose={() => setApproveItem(null)}
          onApproved={() => {
            setApproveItem(null)
            setSuccessMsg(`Action "${approveItem.title}" approved and formally closed by Mine Manager. Statutory compliance met.`)
            loadData()
          }}
          onRejected={() => {
            setApproveItem(null)
            setSuccessMsg(`Action "${approveItem.title}" rejected back to review stage.`)
            loadData()
          }}
          onError={setError}
        />
      )}

      {/* E. ACTION DETAIL & AUDIT TIMELINE DRAWER */}
      {detailItem && (
        <ActionDetailDrawer
          action={detailItem}
          onClose={() => setDetailItem(null)}
          onStartWork={() => {
            handleStartWork(detailItem)
            setDetailItem(null)
          }}
          onSubmitEvidence={() => {
            setSubmitEvidenceItem(detailItem)
            setDetailItem(null)
          }}
          onVerify={() => {
            setVerifyItem(detailItem)
            setDetailItem(null)
          }}
          onApprove={() => {
            setApproveItem(detailItem)
            setDetailItem(null)
          }}
          userRole={userRole}
        />
      )}
    </div>
  )
}

/* ================= HELPER BADGE RESOLVER ================= */
function getStatusBadge(status: ActionStatus) {
  switch (status) {
    case 'Assigned':
      return { classes: 'bg-blue-100 text-blue-800 border border-blue-200', icon: <WorkerHelmetIcon className="w-3.5 h-3.5" /> }
    case 'In progress':
      return { classes: 'bg-sky-100 text-sky-800 border border-sky-200', icon: <ClockIcon className="w-3.5 h-3.5" /> }
    case 'Evidence submitted':
      return { classes: 'bg-amber-100 text-amber-800 border border-amber-200', icon: <CameraUploadIcon className="w-3.5 h-3.5" /> }
    case 'Verified':
      return { classes: 'bg-purple-100 text-purple-800 border border-purple-200', icon: <VerifyShieldIcon className="w-3.5 h-3.5" /> }
    case 'Approved':
    case 'Completed':
      return { classes: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: <CheckCircleIcon className="w-3.5 h-3.5" /> }
    case 'Overdue':
      return { classes: 'bg-rose-100 text-rose-800 border border-rose-200', icon: <ClockIcon className="w-3.5 h-3.5" /> }
    default:
      return { classes: 'bg-slate-100 text-slate-800 border border-slate-200', icon: <AuditIcon className="w-3.5 h-3.5" /> }
  }
}

/* ================= KANBAN COLUMN COMPONENT ================= */
interface KanbanColumnProps {
  title: string
  subtitle: string
  badgeColor: string
  count: number
  actions: WorkflowAction[]
  onSelectAction: (action: WorkflowAction) => void
  onSubmitEvidence?: (action: WorkflowAction) => void
  onStartWork?: (action: WorkflowAction) => void
  onVerify?: (action: WorkflowAction) => void
  onApprove?: (action: WorkflowAction) => void
  userRole: string
}

function KanbanColumn({
  title,
  subtitle,
  badgeColor,
  count,
  actions,
  onSelectAction,
  onSubmitEvidence,
  onStartWork,
  onVerify,
  onApprove,
  userRole
}: KanbanColumnProps) {
  const isSafety = ['admin', 'safety_officer'].includes(userRole)
  const isManager = ['admin', 'mine_manager'].includes(userRole)

  return (
    <div className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col h-[680px]">
      {/* Column Header */}
      <div className="flex items-center justify-between p-2 mb-2">
        <div>
          <h3 className="font-bold text-xs text-slate-800">{title}</h3>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${badgeColor}`}>
          {count}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {actions.map((item) => (
          <div
            key={item.id}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition space-y-2.5 text-xs group"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] text-slate-400 uppercase">{item.id.slice(-6)}</span>
              {item.status === 'Overdue' ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Overdue</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                  {item.mine}
                </span>
              )}
            </div>

            <h4
              onClick={() => onSelectAction(item)}
              className="font-bold text-slate-900 group-hover:text-minsos-700 cursor-pointer line-clamp-2"
            >
              {item.title}
            </h4>

            {item.violationTitle && (
              <p className="text-[11px] text-slate-500 truncate" title={item.violationTitle}>
                Ref: {item.violationTitle}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <WorkerHelmetIcon className="w-3.5 h-3.5 text-amber-600" />
                <span className="truncate max-w-[90px]">{item.assignedToName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <ClockIcon className="w-3 h-3" />
                <span>{item.deadline}</span>
              </div>
            </div>

            {/* Evidence Pill */}
            {item.evidenceCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                <CameraUploadIcon className="w-3 h-3 text-teal-600" />
                <span>{item.evidenceCount} Proof File(s)</span>
              </div>
            )}

            {/* Contextual Action Button */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                onClick={() => onSelectAction(item)}
                className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold hover:underline"
              >
                Inspect
              </button>

              {(userRole === 'worker' || userRole === 'admin') && item.status === 'Assigned' && onStartWork && (
                <button
                  onClick={() => onStartWork(item)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold"
                >
                  Start Work
                </button>
              )}

              {(userRole === 'worker' || userRole === 'admin') &&
                (item.status === 'In progress' || item.status === 'Assigned' || item.status === 'Overdue') &&
                onSubmitEvidence && (
                  <button
                    onClick={() => onSubmitEvidence(item)}
                    className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                  >
                    <CameraUploadIcon className="w-3 h-3" />
                    <span>Submit</span>
                  </button>
                )}

              {isSafety && item.status === 'Evidence submitted' && onVerify && (
                <button
                  onClick={() => onVerify(item)}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                >
                  <VerifyShieldIcon className="w-3 h-3" />
                  <span>Verify</span>
                </button>
              )}

              {isManager && item.status === 'Verified' && onApprove && (
                <button
                  onClick={() => onApprove(item)}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                >
                  <ApprovedSealIcon className="w-3 h-3" />
                  <span>Approve</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {actions.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">
            No items in this stage
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= MODAL A: REGISTER CORRECTIVE ACTION ================= */
interface RegisterActionModalProps {
  violations: WorkflowViolation[]
  users: WorkflowLookup[]
  mines?: WorkflowLookup[]
  onClose: () => void
  onCreated: (title: string) => void
  onError: (msg: string) => void
}

function RegisterActionModal({ violations, users, onClose, onCreated, onError }: RegisterActionModalProps) {
  const [violationId, setViolationId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)

  // Auto-populate when violation is chosen
  const handleViolationChange = (selectedVioId: string) => {
    setViolationId(selectedVioId)
    const vio = violations.find((v) => v.id === selectedVioId)
    if (vio) {
      setTitle(`Remediate: ${vio.title}`)
      setDescription(`Statutory remediation directive for ${vio.category} breach (${vio.severity.toUpperCase()} severity).`)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!violationId || !title || !deadline) {
      onError('Please fill in all mandatory fields.')
      return
    }

    setBusy(true)
    try {
      await workflowService.createAction({
        violationId,
        responsiblePersonId: assignedTo || users[0]?.id,
        assignedTo: assignedTo || users[0]?.id,
        title,
        description,
        deadline
      })
      onCreated(title)
    } catch {
      onError('Unable to create corrective action. Verify permissions and required fields.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Register Statutory Corrective Action</h3>
            <p className="text-xs text-slate-500">Initiate remediation directive linked to identified hazard / violation</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Linked Violation */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Select Associated Violation <span className="text-rose-500">*</span>
            </label>
            <select
              value={violationId}
              onChange={(e) => handleViolationChange(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-minsos-500/20"
            >
              <option value="">-- Choose violation --</option>
              {violations.map((v) => (
                <option key={v.id} value={v.id}>
                  [{v.severity.toUpperCase()}] {v.title} — {v.mine}
                </option>
              ))}
            </select>
          </div>

          {/* Action Title */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Action Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Install Strata Roof Bolts at Junction 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-minsos-500/20"
            />
          </div>

          {/* Worker Assignment & Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Assign to Mine Worker <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="">-- Select Worker --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role ? `(${u.role})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Statutory Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Detailed Rectification Directive</label>
            <textarea
              rows={3}
              placeholder="Specify technical instructions, PPE requirements, and verification criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-minsos-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-minsos-600 hover:bg-minsos-700 text-white font-bold shadow-sm transition disabled:opacity-50"
            >
              {busy ? 'Registering...' : 'Register & Assign Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ================= MODAL B: WORKER SUBMIT EVIDENCE ================= */
interface SubmitEvidenceModalProps {
  action: WorkflowAction
  onClose: () => void
  onSubmitted: () => void
  onError: (msg: string) => void
}

function SubmitEvidenceModal({ action, onClose, onSubmitted, onError }: SubmitEvidenceModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [gpsTag, setGpsTag] = useState<{ latitude: number; longitude: number } | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      if (selected.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selected))
      } else {
        setPreviewUrl(null)
      }
    }
  }

  // Fetch current GPS coords
  const fetchGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsTag({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        },
        () => {
          // Fallback to Jharia Coalfield coords
          setGpsTag({ latitude: 23.75, longitude: 86.42 })
        }
      )
    } else {
      setGpsTag({ latitude: 23.75, longitude: 86.42 })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      onError('Please attach a photographic proof or remediation report.')
      return
    }

    setBusy(true)
    try {
      // 1. Upload evidence file to backend
      const uploadRes = await workflowService.uploadEvidence(file, gpsTag || undefined)

      // 2. Submit evidence to advance action to evidence_submitted
      await workflowService.submitAction(action.id, {
        evidence: [uploadRes.evidence],
        note
      })

      onSubmitted()
    } catch (err) {
      onError('Failed to submit evidence. Please check file format and connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Upload Rectification Evidence</h3>
            <p className="text-xs text-slate-500">Attach photo proof or report to submit for Safety Officer verification</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action Context Card */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="font-bold text-slate-800">{action.title}</div>
          <div className="text-slate-500">
            Colliery: <strong>{action.mine}</strong> • Deadline: <strong>{action.deadline}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* File Upload Box */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Field Photo / Verification Report <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-minsos-500 transition cursor-pointer relative bg-slate-50/50">
              <input
                type="file"
                accept="image/*,.pdf"
                required
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="Proof Preview" className="max-h-40 mx-auto rounded-lg shadow-sm border border-slate-200 object-cover" />
                  <p className="text-xs text-slate-600 font-semibold">{file?.name}</p>
                </div>
              ) : file ? (
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-1.5 py-2">
                  <CameraUploadIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">Click or drag photo here</p>
                  <p className="text-[11px] text-slate-400">PNG, JPG or PDF up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* GPS Coordinates Tag */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/70 border border-teal-200">
            <div className="text-[11px] text-teal-800">
              {gpsTag ? (
                <span>
                  📍 GPS Tagged: <strong>{gpsTag.latitude.toFixed(4)}°N, {gpsTag.longitude.toFixed(4)}°E</strong>
                </span>
              ) : (
                <span>Attach frontline GPS coordinates for DGMS tamper-proof audit trail</span>
              )}
            </div>
            <button
              type="button"
              onClick={fetchGps}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
            >
              {gpsTag ? '✓ GPS Linked' : 'Tag Location'}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Execution & Completion Remarks</label>
            <textarea
              rows={3}
              placeholder="Describe work completed on site, equipment replaced, or precautions implemented..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-minsos-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <CameraUploadIcon className="w-4 h-4" />
              <span>{busy ? 'Uploading...' : 'Submit to Safety Officer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ================= MODAL C: SAFETY OFFICER VERIFY ================= */
interface VerifyActionModalProps {
  action: WorkflowAction
  onClose: () => void
  onVerified: () => void
  onRejected: () => void
  onError: (msg: string) => void
}

function VerifyActionModal({ action, onClose, onVerified, onRejected, onError }: VerifyActionModalProps) {
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleVerify = async () => {
    setBusy(true)
    try {
      await workflowService.verifyAction(action.id, note || 'Field rectification verified and certified by Safety Officer.')
      onVerified()
    } catch {
      onError('Unable to verify corrective action.')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      onError('Please provide a reason for rejecting the action back to the worker.')
      return
    }

    setBusy(true)
    try {
      await workflowService.rejectAction(action.id, rejectReason)
      onRejected()
    } catch {
      onError('Unable to reject action.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Safety Officer Verification</h3>
            <p className="text-xs text-slate-500">Inspect submitted proof and certify remediation before manager closure</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action Details */}
        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-2">
          <div className="font-bold text-purple-900">{action.title}</div>
          <div className="text-purple-700">
            Assigned Worker: <strong>{action.assignedToName || 'Worker'}</strong> • Colliery: <strong>{action.mine}</strong>
          </div>
          {action.submissionNote && (
            <div className="p-2 bg-white rounded-lg border border-purple-100 text-slate-700">
              <span className="font-semibold text-purple-800">Worker Remarks:</span> {action.submissionNote}
            </div>
          )}
        </div>

        {/* Submitted Evidence Preview */}
        {action.evidence && action.evidence.length > 0 && (
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 text-xs block">Submitted Photographic Proof</label>
            <div className="grid grid-cols-2 gap-2">
              {action.evidence.map((ev, i) => (
                <a
                  key={i}
                  href={ev.url || `/api/uploads/${ev.storageKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-400 transition flex items-center gap-2 group"
                >
                  <img
                    src={ev.url || `/api/uploads/${ev.storageKey}`}
                    alt="Evidence"
                    className="w-12 h-12 object-cover rounded-lg bg-slate-200"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-slate-800 truncate group-hover:text-purple-700">{ev.fileName}</p>
                    <p className="text-[10px] text-slate-400">{ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleDateString() : 'Recent'}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {!isRejecting ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Safety Verification Remarks</label>
              <textarea
                rows={3}
                placeholder="Confirm adherence to CMR 2017 / safety guidelines and verify photographic proof..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold text-xs"
              >
                Reject & Return to Worker
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleVerify}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <VerifyShieldIcon className="w-4 h-4" />
                  <span>{busy ? 'Verifying...' : 'Verify & Forward to Manager'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              Provide reason for rejection. This action will return to <strong>In Progress</strong> for the assigned worker.
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Rejection Rationale <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why evidence is insufficient or what additional rectification is required..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Back to Verify
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition disabled:opacity-50"
              >
                {busy ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= MODAL D: MINE MANAGER APPROVE CLOSURE ================= */
interface ApproveActionModalProps {
  action: WorkflowAction
  onClose: () => void
  onApproved: () => void
  onRejected: () => void
  onError: (msg: string) => void
}

function ApproveActionModal({ action, onClose, onApproved, onRejected, onError }: ApproveActionModalProps) {
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleApprove = async () => {
    setBusy(true)
    try {
      await workflowService.approveAction(action.id, note || 'Formally approved and closed by Mine Manager. Statutory compliance met.')
      onApproved()
    } catch {
      onError('Unable to approve corrective action.')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      onError('Please provide a reason for rejecting the action back.')
      return
    }

    setBusy(true)
    try {
      await workflowService.rejectAction(action.id, rejectReason)
      onRejected()
    } catch {
      onError('Unable to reject action.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Mine Manager Final Closure Sign-off</h3>
            <p className="text-xs text-slate-500">Seal corrective action as DGMS compliant and resolve breach</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Provenance Card */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
          <div className="font-bold text-emerald-950 text-sm">{action.title}</div>
          <div className="text-emerald-800">
            Colliery: <strong>{action.mine}</strong> • Worker: <strong>{action.assignedToName || 'Worker'}</strong>
          </div>
          {action.verificationNote && (
            <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-slate-700">
              <span className="font-semibold text-emerald-800">Safety Officer Certification:</span> {action.verificationNote}
            </div>
          )}
        </div>

        {!isRejecting ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Manager Closure & Audit Endorsement</label>
              <textarea
                rows={3}
                placeholder="Endorse resolution, reference statutory clearance order, or add operational notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold text-xs"
              >
                Reject Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ApprovedSealIcon className="w-4 h-4" />
                  <span>{busy ? 'Sealing Closure...' : 'Approve & Close Action'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              Provide reason for rejection. Action will return to review/field execution stage.
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Rejection Rationale <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State deficiency or reason why closure cannot be endorsed..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Back to Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition disabled:opacity-50"
              >
                {busy ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= MODAL E: FULL ACTION PROVENANCE DRAWER ================= */
interface ActionDetailDrawerProps {
  action: WorkflowAction
  onClose: () => void
  onStartWork?: () => void
  onSubmitEvidence?: () => void
  onVerify?: () => void
  onApprove?: () => void
  userRole: string
}

function ActionDetailDrawer({
  action,
  onClose,
  onStartWork,
  onSubmitEvidence,
  onVerify,
  onApprove,
  userRole
}: ActionDetailDrawerProps) {
  const isSafety = ['admin', 'safety_officer'].includes(userRole)
  const isManager = ['admin', 'mine_manager'].includes(userRole)
  const statusInfo = getStatusBadge(action.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.classes}`}>
                {statusInfo.icon}
                {action.status}
              </span>
              <span className="font-mono text-xs text-slate-400">ID: {action.id}</span>
            </div>
            <h3 className="font-extrabold text-lg text-slate-900">{action.title}</h3>
            <p className="text-xs text-slate-500">Colliery: {action.mine} • Linked Violation: {action.violationTitle || action.violationId}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Detailed Timeline */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Statutory Execution Timeline</h4>
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 text-xs">
            {/* 1. Registered */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-white shadow-2xs" />
              <div className="font-bold text-slate-900">1. Action Registered & Mandated</div>
              <div className="text-slate-500">Officer: {action.responsiblePerson}</div>
              <div className="text-[11px] text-slate-400">Deadline: {action.deadline}</div>
            </div>

            {/* 2. Worker Assigned */}
            <div className="relative">
              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-2xs ${action.assignedToName ? 'bg-blue-600' : 'bg-slate-300'}`} />
              <div className="font-bold text-slate-900">2. Field Worker Assigned</div>
              <div className="text-slate-600">Assigned: {action.assignedToName || 'Unassigned'}</div>
              {action.assignedAt && <div className="text-[11px] text-slate-400">Date: {action.assignedAt}</div>}
            </div>

            {/* 3. Evidence Submitted */}
            <div className="relative">
              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-2xs ${action.submittedAt || action.evidenceCount > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
              <div className="font-bold text-slate-900">3. Field Evidence Submitted</div>
              <div className="text-slate-600">Proof items: {action.evidenceCount} attached</div>
              {action.submittedAt && <div className="text-[11px] text-slate-400">Submitted: {action.submittedAt}</div>}
              {action.submissionNote && (
                <div className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-700 italic border border-slate-200">
                  "{action.submissionNote}"
                </div>
              )}
            </div>

            {/* 4. Safety Verified */}
            <div className="relative">
              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-2xs ${action.verificationNote || action.status === 'Verified' || action.status === 'Approved' ? 'bg-purple-600' : 'bg-slate-300'}`} />
              <div className="font-bold text-slate-900">4. Safety Officer Verification</div>
              {action.verificationNote ? (
                <>
                  <div className="text-slate-600">Status: Verified & Certified</div>
                  <div className="mt-1 p-2 bg-purple-50 rounded-lg text-purple-900 border border-purple-200">
                    "{action.verificationNote}"
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic">Pending Safety Officer inspection</div>
              )}
            </div>

            {/* 5. Manager Approved */}
            <div className="relative">
              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-2xs ${action.status === 'Approved' || action.status === 'Completed' ? 'bg-emerald-600' : 'bg-slate-300'}`} />
              <div className="font-bold text-slate-900">5. Mine Manager Final Closure</div>
              {action.approval?.note ? (
                <>
                  <div className="text-slate-600">Status: Formally Closed & Sealed</div>
                  <div className="mt-1 p-2 bg-emerald-50 rounded-lg text-emerald-900 border border-emerald-200">
                    "{action.approval.note}"
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic">Pending Mine Manager endorsement</div>
              )}
            </div>
          </div>
        </div>

        {/* Evidence Photos Gallery */}
        {action.evidence && action.evidence.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Photographic Proof Gallery</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {action.evidence.map((ev, i) => (
                <a
                  key={i}
                  href={ev.url || `/api/uploads/${ev.storageKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-minsos-400 transition group relative aspect-video"
                >
                  <img
                    src={ev.url || `/api/uploads/${ev.storageKey}`}
                    alt="Proof"
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2 text-[10px] text-white font-medium truncate">
                    {ev.fileName}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Rejection History */}
        {action.rejectionHistory && action.rejectionHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-rose-600">Rejection & Return History</h4>
            <div className="space-y-2">
              {action.rejectionHistory.map((r, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-rose-900 font-bold">
                    <span>Returned from stage: {r.fromStage}</span>
                    <span className="text-[10px] text-rose-500">{r.rejectedAt}</span>
                  </div>
                  <p className="text-rose-800">{r.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {(userRole === 'worker' || userRole === 'admin') && action.status === 'Assigned' && onStartWork && (
              <button
                onClick={onStartWork}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Start Work
              </button>
            )}

            {(userRole === 'worker' || userRole === 'admin') &&
              (action.status === 'In progress' || action.status === 'Assigned' || action.status === 'Overdue') &&
              onSubmitEvidence && (
                <button
                  onClick={onSubmitEvidence}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <CameraUploadIcon className="w-4 h-4" />
                  <span>Submit Proof</span>
                </button>
              )}

            {isSafety && action.status === 'Evidence submitted' && onVerify && (
              <button
                onClick={onVerify}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <VerifyShieldIcon className="w-4 h-4" />
                <span>Verify Proof</span>
              </button>
            )}

            {isManager && action.status === 'Verified' && onApprove && (
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <ApprovedSealIcon className="w-4 h-4" />
                <span>Approve & Close</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
