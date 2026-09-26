import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { workflowService, type WorkflowLookup } from '../services/workflow'
import type { ComplianceStatus, WorkflowCompliance } from '../types'
import {
  AuditIcon,
  CameraUploadIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  FilterIcon,
  KanbanIcon,
  MinesIcon,
  PlusIcon,
  RefreshIcon,
  RoleIcon,
  SearchIcon,
  TableIcon
} from '../components/icons'

const CATEGORIES = [
  'All',
  'DGMS Statutory',
  'Environmental Clearance',
  'Ventilation Standard',
  'Labour & Welfare',
  'Safety SOP',
  'Electrical Safety'
] as const

export function CompliancePage() {
  const { user } = useAuth()
  const userRole = user?.role || 'worker'
  const isOfficerOrManager = ['admin', 'mine_manager', 'safety_officer'].includes(userRole)

  const [items, setItems] = useState<WorkflowCompliance[]>([])
  const [mines, setMines] = useState<WorkflowLookup[]>([])
  const [users, setUsers] = useState<WorkflowLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // View & Filter States
  const [viewMode, setViewMode] = useState<'matrix' | 'kanban'>('matrix')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mineFilter, setMineFilter] = useState<string>('all')
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)

  // Add Obligation Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [requirement, setRequirement] = useState('')
  const [category, setCategory] = useState('DGMS Statutory')
  const [mineId, setMineId] = useState('')
  const [responsiblePersonId, setResponsiblePersonId] = useState('')
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  const [expiry, setExpiry] = useState(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Update Status & Attach Renewal Modal State
  const [activeItem, setActiveItem] = useState<WorkflowCompliance | null>(null)
  const [newStatus, setNewStatus] = useState<ComplianceStatus>('compliant')
  const [updateNotes, setUpdateNotes] = useState('')
  const [updateFile, setUpdateFile] = useState<File | null>(null)
  const [updateFilePreview, setUpdateFilePreview] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Dossier Detail Drawer
  const [dossierItem, setDossierItem] = useState<WorkflowCompliance | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [compRes, mineRes, userRes] = await Promise.all([
        workflowService.compliance({
          category: selectedCategory !== 'All' ? selectedCategory : undefined
        }),
        workflowService.mines().catch(() => []),
        workflowService.users().catch(() => [])
      ])
      setItems(compRes.data)
      setMines(mineRes)
      setUsers(userRes)
      if (mineRes.length > 0 && !mineId) setMineId(mineRes[0].id)
      if (userRes.length > 0 && !responsiblePersonId) setResponsiblePersonId(userRes[0].id)
    } catch {
      setError('Unable to load statutory compliance obligations from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCategory])

  // Auto-dismiss success notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Helper: check if date is within 30 days
  const isExpiringWithin30Days = (expiryDateStr?: string) => {
    if (!expiryDateStr) return false
    const exp = new Date(expiryDateStr).getTime()
    const now = Date.now()
    const in30Days = now + 30 * 86400000
    return exp > now && exp <= in30Days
  }

  // KPIs
  const kpis = useMemo(() => {
    const total = items.length
    const compliant = items.filter((i) => i.effectiveStatus === 'compliant' || i.status === 'compliant').length
    const underReview = items.filter((i) => i.effectiveStatus === 'under_review' || i.status === 'under_review').length
    const expiringSoon = items.filter((i) => isExpiringWithin30Days(i.expiryDate)).length
    const overdue = items.filter((i) => i.effectiveStatus === 'overdue' || i.status === 'overdue').length
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0

    return { total, compliant, underReview, expiringSoon, overdue, complianceRate }
  }, [items])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length }
    for (const c of CATEGORIES) {
      if (c !== 'All') {
        counts[c] = items.filter((i) => i.category === c).length
      }
    }
    return counts
  }, [items])

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchReq = item.requirement.toLowerCase().includes(query)
        const matchMine = item.mineName.toLowerCase().includes(query)
        const matchOwner = item.responsiblePersonName.toLowerCase().includes(query)
        const matchNotes = (item.notes || '').toLowerCase().includes(query)
        if (!matchReq && !matchMine && !matchOwner && !matchNotes) return false
      }

      if (statusFilter !== 'all') {
        if (item.effectiveStatus !== statusFilter && item.status !== statusFilter) return false
      }

      if (mineFilter !== 'all' && item.mineName !== mineFilter) return false

      if (expiringSoonOnly && !isExpiringWithin30Days(item.expiryDate)) return false

      if (overdueOnly && item.effectiveStatus !== 'overdue' && item.status !== 'overdue') return false

      return true
    })
  }, [items, searchQuery, statusFilter, mineFilter, expiringSoonOnly, overdueOnly])

  // Handle Add File Selection with preview
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file))
      } else {
        setFilePreview(null)
      }
    }
  }

  // Handle Update File Selection
  const handleUpdateFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUpdateFile(file)
      if (file.type.startsWith('image/')) {
        setUpdateFilePreview(URL.createObjectURL(file))
      } else {
        setUpdateFilePreview(null)
      }
    }
  }

  // Handle Add Submit (Images stored in MongoDB Atlas!)
  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!requirement.trim() || !mineId || !responsiblePersonId) {
      setError('Please fill in all mandatory fields.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const evidenceList: Array<Record<string, unknown>> = []

      // If user attached a clearance document, upload and store in MongoDB!
      if (selectedFile) {
        const uploadRes = await workflowService.uploadEvidence(selectedFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.createCompliance({
        requirement: requirement.trim(),
        category,
        mineId,
        responsiblePersonId,
        dueDate: new Date(dueDate).toISOString(),
        expiry: new Date(expiry).toISOString(),
        notes: notes.trim() || undefined,
        evidence: evidenceList
      })

      setSuccess(`Statutory obligation "${requirement}" registered and document stored in MongoDB.`)
      setShowAddModal(false)
      setRequirement('')
      setNotes('')
      setSelectedFile(null)
      setFilePreview(null)
      loadData()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to create compliance obligation.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Status Update with Optional Renewal Certificate (Stored in MongoDB)
  const handleUpdateStatus = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeItem) return

    try {
      setUpdating(true)
      const evidenceList: Array<Record<string, unknown>> = []

      // If user attached renewal document / permit
      if (updateFile) {
        const uploadRes = await workflowService.uploadEvidence(updateFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.updateCompliance(activeItem.id, {
        status: newStatus,
        notes: updateNotes ? `${activeItem.notes ? activeItem.notes + ' | ' : ''}${updateNotes}` : undefined,
        ...(evidenceList.length > 0 ? { evidence: evidenceList } : {})
      })

      setSuccess(`Obligation updated to "${newStatus.replace('_', ' ').toUpperCase()}". Renewal documents recorded in MongoDB.`)
      setActiveItem(null)
      setUpdateNotes('')
      setUpdateFile(null)
      setUpdateFilePreview(null)
      loadData()
    } catch {
      setError('Failed to update compliance status.')
    } finally {
      setUpdating(false)
    }
  }

  // CSV Export
  const exportCsv = () => {
    const headers = [
      'Obligation ID',
      'Statutory Directive',
      'Category',
      'Colliery / Mine',
      'Due Date',
      'License Expiry',
      'Status',
      'Responsible Officer',
      'Certificates Attached',
      'Notes'
    ]
    const rows = filteredItems.map((i) => [
      i.id,
      `"${i.requirement.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      `"${i.mineName} (${i.mineCode})"`,
      i.dueDate,
      i.expiryDate,
      i.effectiveStatus,
      `"${i.responsiblePersonName}"`,
      i.evidenceCount,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `DGMS_Statutory_Compliance_Register_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                DGMS Section 22 & Mines Act 1952 Standing Directives
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <RoleIcon role={userRole} className="w-3.5 h-3.5 text-minsos-400" />
                Role: {userRole.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Statutory Compliance & Clearances Command Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitored for statutory adherence under the Mines Act 1952, PESO Explosive Permits, State PCB Consents, and DGMS Standing Safety Orders. All clearance certificates and evidence are persisted in MongoDB.
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
                title="Regulatory Pipeline View"
              >
                <KanbanIcon className="w-4 h-4" />
                <span>Pipeline</span>
              </button>
            </div>

            {/* CSV Export */}
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700 transition shadow-sm"
              title="Export compliance register to CSV"
            >
              <DownloadIcon className="w-4 h-4 text-minsos-400" />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700 transition shadow-sm"
              title="Refresh records"
            >
              <RefreshIcon className={`w-4 h-4 text-minsos-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Register Action Button */}
            {isOfficerOrManager && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-minsos-600 hover:bg-minsos-500 text-white shadow-md hover:shadow-minsos-600/30 transition transform active:scale-95"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Register Obligation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-700 hover:text-emerald-900">
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

      {/* 2. INTERACTIVE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total */}
        <button
          onClick={() => {
            setStatusFilter('all')
            setExpiringSoonOnly(false)
            setOverdueOnly(false)
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            statusFilter === 'all' && !expiringSoonOnly && !overdueOnly
              ? 'bg-minsos-50/70 border-minsos-500 ring-2 ring-minsos-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">Statutory Directives</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total Monitored Fleet</div>
        </button>

        {/* Compliant */}
        <button
          onClick={() => {
            setStatusFilter('compliant')
            setExpiringSoonOnly(false)
            setOverdueOnly(false)
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            statusFilter === 'compliant'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-700">Compliant & Active</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{kpis.compliant}</div>
          <div className="text-[11px] text-emerald-600 mt-1">{kpis.complianceRate}% Fleet Adherence</div>
        </button>

        {/* Under Review */}
        <button
          onClick={() => {
            setStatusFilter('under_review')
            setExpiringSoonOnly(false)
            setOverdueOnly(false)
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            statusFilter === 'under_review'
              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-purple-700">Under Review</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{kpis.underReview}</div>
          <div className="text-[11px] text-purple-600 mt-1">Submitted to DGMS/PCB</div>
        </button>

        {/* Expiring Soon */}
        <button
          onClick={() => {
            setExpiringSoonOnly(!expiringSoonOnly)
            setOverdueOnly(false)
            setStatusFilter('all')
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            expiringSoonOnly
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Expiring in &lt;30d</span>
            {kpis.expiringSoon > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{kpis.expiringSoon}</div>
          <div className="text-[11px] text-amber-600 mt-1">Renewal Urgent</div>
        </button>

        {/* Overdue */}
        <button
          onClick={() => {
            setOverdueOnly(!overdueOnly)
            setExpiringSoonOnly(false)
            setStatusFilter('all')
          }}
          className={`p-4 rounded-xl text-left border transition shadow-xs ${
            overdueOnly
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-300'
              : 'bg-white hover:bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Overdue Breaches</span>
            {kpis.overdue > 0 && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />}
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{kpis.overdue}</div>
          <div className="text-[11px] text-rose-600 mt-1">Statutory Non-Compliance</div>
        </button>
      </div>

      {/* 3. CATEGORY PILLS BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          const count = categoryCounts[cat] || 0
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition border ${
                isSelected
                  ? 'bg-minsos-700 text-white border-minsos-700 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              {cat} <span className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* 4. SEARCH & FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by obligation, permit, mine, owner..."
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
            <option value="compliant">Compliant</option>
            <option value="under_review">Under Review</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Mine Dropdown */}
          <select
            value={mineFilter}
            onChange={(e) => setMineFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-minsos-500/20"
          >
            <option value="all">All Collieries</option>
            {mines.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Quick Checkboxes */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={expiringSoonOnly}
              onChange={(e) => setExpiringSoonOnly(e.target.checked)}
              className="rounded text-minsos-600 focus:ring-minsos-500"
            />
            <span>Expiring &lt;30d</span>
          </label>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span>Overdue Only</span>
          </label>

          {(searchQuery || statusFilter !== 'all' || mineFilter !== 'all' || expiringSoonOnly || overdueOnly) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setMineFilter('all')
                setExpiringSoonOnly(false)
                setOverdueOnly(false)
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
          <strong className="text-slate-800">{items.length}</strong> statutory obligations
        </span>
      </div>

      {/* 5. VIEW MODES: TABLE MATRIX OR PIPELINE KANBAN */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshIcon className="w-8 h-8 text-minsos-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading statutory compliance obligations...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <FilterIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No compliance requirements match criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting search terms, clearing filters, or registering a new obligation directive.
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* TABLE MATRIX VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Statutory Directive & Category</th>
                  <th className="py-3.5 px-4">Colliery</th>
                  <th className="py-3.5 px-4">Timeline (Due / Expiry)</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
                  <th className="py-3.5 px-4">Clearance Certificates (MongoDB)</th>
                  <th className="py-3.5 px-4">Responsible Officer</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const statusInfo = getComplianceBadge(item.effectiveStatus || item.status)
                  const isExpiring = isExpiringWithin30Days(item.expiryDate)

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                      {/* Directive & Category */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-minsos-700">
                          {item.requirement}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                          <span className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{item.notes}</p>
                        )}
                      </td>

                      {/* Colliery */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MinesIcon className="w-3.5 h-3.5 text-minsos-600 shrink-0" />
                          <span>{item.mineName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.mineCode}</div>
                      </td>

                      {/* Timeline */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="text-slate-700 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3 text-slate-400" />
                            <span>Due: <strong>{item.dueDate}</strong></span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Expires: <strong>{item.expiryDate}</strong>
                          </div>
                          {isExpiring && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Expiring &lt;30d
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.classes}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Certificates Attached (Stored in MongoDB) */}
                      <td className="py-4 px-4">
                        {item.evidence && item.evidence.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.evidence.map((ev, idx) => {
                              const fileUrl = ev.dataUri || ev.url || `/api/uploads/${ev.storageKey}`
                              return (
                                <a
                                  key={ev.id || idx}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] bg-minsos-50 hover:bg-minsos-100 text-minsos-800 px-2 py-1 rounded-lg border border-minsos-200 transition font-medium max-w-[140px] truncate"
                                  title={`Open certificate: ${ev.fileName}`}
                                >
                                  <CameraUploadIcon className="w-3 h-3 text-minsos-600 shrink-0" />
                                  <span className="truncate">{ev.fileName}</span>
                                </a>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No document attached</span>
                        )}
                      </td>

                      {/* Responsible Person */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{item.responsiblePersonName}</div>
                        {item.responsiblePersonRole && (
                          <div className="text-[11px] text-slate-400">{item.responsiblePersonRole}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOfficerOrManager && (
                            <button
                              onClick={() => {
                                setActiveItem(item)
                                setNewStatus(item.effectiveStatus || item.status)
                                setUpdateNotes('')
                                setUpdateFile(null)
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-minsos-50 hover:bg-minsos-100 text-minsos-700 border border-minsos-200 transition shadow-2xs"
                              title="Update status & attach renewal proof"
                            >
                              Update Status
                            </button>
                          )}

                          <button
                            onClick={() => setDossierItem(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Inspect statutory dossier & certificates"
                          >
                            <EyeIcon className="w-4 h-4" />
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
        /* PIPELINE KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Column 1: Pending */}
          <ComplianceKanbanColumn
            title="1. Pending Filing"
            badgeColor="bg-slate-100 text-slate-800"
            count={items.filter((i) => i.effectiveStatus === 'pending' || i.status === 'pending').length}
            items={filteredItems.filter((i) => i.effectiveStatus === 'pending' || i.status === 'pending')}
            onSelectDossier={setDossierItem}
            onUpdateStatus={(item) => {
              setActiveItem(item)
              setNewStatus('under_review')
            }}
            isOfficerOrManager={isOfficerOrManager}
          />

          {/* Column 2: Under Review */}
          <ComplianceKanbanColumn
            title="2. Under Review"
            badgeColor="bg-purple-100 text-purple-800"
            count={items.filter((i) => i.effectiveStatus === 'under_review' || i.status === 'under_review').length}
            items={filteredItems.filter((i) => i.effectiveStatus === 'under_review' || i.status === 'under_review')}
            onSelectDossier={setDossierItem}
            onUpdateStatus={(item) => {
              setActiveItem(item)
              setNewStatus('compliant')
            }}
            isOfficerOrManager={isOfficerOrManager}
          />

          {/* Column 3: Compliant */}
          <ComplianceKanbanColumn
            title="3. Compliant & Active"
            badgeColor="bg-emerald-100 text-emerald-800"
            count={items.filter((i) => i.effectiveStatus === 'compliant' || i.status === 'compliant').length}
            items={filteredItems.filter((i) => i.effectiveStatus === 'compliant' || i.status === 'compliant')}
            onSelectDossier={setDossierItem}
            isOfficerOrManager={isOfficerOrManager}
          />

          {/* Column 4: Overdue Breaches */}
          <ComplianceKanbanColumn
            title="4. Overdue Breaches"
            badgeColor="bg-rose-100 text-rose-800"
            count={items.filter((i) => i.effectiveStatus === 'overdue' || i.status === 'overdue').length}
            items={filteredItems.filter((i) => i.effectiveStatus === 'overdue' || i.status === 'overdue')}
            onSelectDossier={setDossierItem}
            onUpdateStatus={(item) => {
              setActiveItem(item)
              setNewStatus('under_review')
            }}
            isOfficerOrManager={isOfficerOrManager}
          />
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* A. REGISTER OBLIGATION MODAL (With MongoDB Document Storage) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Register Statutory Obligation</h3>
                <p className="text-xs text-slate-500">Record license, permit or DGMS safety clearance (Saved in MongoDB)</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Requirement Title */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Obligation Title / Permit Mandate <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PESO Explosive Magazine License Renewal"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-minsos-500/20"
                />
              </div>

              {/* Mine & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Colliery / Mine Site <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mineId}
                    onChange={(e) => setMineId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  >
                    <option value="">-- Choose Mine --</option>
                    {mines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Regulatory Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsible Officer & Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Responsible Officer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={responsiblePersonId}
                    onChange={(e) => setResponsiblePersonId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  >
                    <option value="">-- Select Officer --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Statutory Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">License / Clearance Validity Expiry</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                />
              </div>

              {/* Drag & Drop Clearance Document Upload (Stored in MongoDB) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Upload Clearance Document / Permit (.pdf, .jpg, .png)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-minsos-500 transition cursor-pointer relative bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {filePreview ? (
                    <div className="space-y-1.5">
                      <img src={filePreview} alt="Preview" className="max-h-32 mx-auto rounded-lg shadow-sm border border-slate-200 object-cover" />
                      <p className="text-xs text-slate-700 font-semibold">{selectedFile?.name}</p>
                    </div>
                  ) : selectedFile ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for MongoDB</p>
                    </div>
                  ) : (
                    <div className="space-y-1 py-1">
                      <CameraUploadIcon className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="font-semibold text-slate-700">Click or drag certificate here</p>
                      <p className="text-[11px] text-slate-400">Will be saved directly to MongoDB Atlas database</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Statutory Conditions & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reference DGMS circular, permit numbers, statutory conditions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-minsos-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-minsos-600 hover:bg-minsos-700 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving to MongoDB...' : 'Save Obligation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. UPDATE STATUS & ATTACH RENEWAL MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Update Compliance Status</h3>
                <p className="text-xs text-slate-500">Record regulatory progression or renewal certificate</p>
              </div>
              <button onClick={() => setActiveItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{activeItem.requirement}</div>
                <div className="text-slate-500">
                  Colliery: <strong>{activeItem.mineName}</strong> • Category: <strong>{activeItem.category}</strong>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  New Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ComplianceStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="compliant">Compliant (Approved & Clearance Active)</option>
                  <option value="under_review">Under Review (Submitted to Regulator)</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Attach Renewal Certificate (Stored in MongoDB) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Attach Renewal Certificate / NOC (Saved in MongoDB)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center hover:border-minsos-500 transition cursor-pointer relative bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={handleUpdateFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {updateFilePreview ? (
                    <img src={updateFilePreview} alt="Preview" className="max-h-24 mx-auto rounded shadow-sm object-cover" />
                  ) : updateFile ? (
                    <p className="font-bold text-slate-800">{updateFile.name}</p>
                  ) : (
                    <div className="space-y-1 py-1">
                      <CameraUploadIcon className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-700 font-semibold">Upload renewal permit / NOC</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Verification Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter audit approval remarks, certificate reference or regulator order number..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-minsos-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-minsos-600 hover:bg-minsos-700 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. COMPLIANCE DOSSIER DRAWER */}
      {dossierItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getComplianceBadge(dossierItem.effectiveStatus || dossierItem.status).classes}`}>
                    {getComplianceBadge(dossierItem.effectiveStatus || dossierItem.status).icon}
                    {dossierItem.effectiveStatus || dossierItem.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {dossierItem.category}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900">{dossierItem.requirement}</h3>
                <p className="text-slate-500">Colliery: {dossierItem.mineName} ({dossierItem.mineCode})</p>
              </div>
              <button onClick={() => setDossierItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Timeline Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 text-[11px] block">Statutory Due Date</span>
                <span className="font-bold text-slate-800">{dossierItem.dueDate}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">License Expiry</span>
                <span className="font-bold text-slate-800">{dossierItem.expiryDate}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Responsible Officer</span>
                <span className="font-bold text-slate-800">{dossierItem.responsiblePersonName}</span>
              </div>
            </div>

            {/* Notes */}
            {dossierItem.notes && (
              <div className="space-y-1">
                <span className="font-bold text-slate-700 block">Statutory Notes & Regulatory Remarks</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {dossierItem.notes}
                </div>
              </div>
            )}

            {/* Clearance Certificates Gallery (From MongoDB) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-700 block">Attached Clearance Certificates (Stored in MongoDB)</span>
              {dossierItem.evidence && dossierItem.evidence.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dossierItem.evidence.map((ev, i) => {
                    const fileUrl = ev.dataUri || ev.url || `/api/uploads/${ev.storageKey}`
                    return (
                      <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        {ev.mimeType?.startsWith('image/') || ev.fileName?.match(/\.(jpg|jpeg|png)$/i) ? (
                          <img
                            src={fileUrl}
                            alt={ev.fileName}
                            className="w-full h-32 object-cover rounded-lg bg-slate-200"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                            <AuditIcon className="w-8 h-8" />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 truncate" title={ev.fileName}>{ev.fileName}</span>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-minsos-600 hover:bg-minsos-700 text-white rounded-lg font-bold text-[11px] shrink-0"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-400">
                  No clearance documents currently uploaded for this obligation.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDossierItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Close
              </button>
              {isOfficerOrManager && (
                <button
                  onClick={() => {
                    setActiveItem(dossierItem)
                    setDossierItem(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-minsos-600 hover:bg-minsos-700 text-white font-bold"
                >
                  Update Status & Attach Proof
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= HELPER BADGE RESOLVER ================= */
function getComplianceBadge(status: string) {
  switch (status) {
    case 'compliant':
      return { classes: 'bg-emerald-100 text-emerald-800 border border-emerald-200', label: 'Compliant', icon: <CheckCircleIcon className="w-3.5 h-3.5" /> }
    case 'under_review':
      return { classes: 'bg-purple-100 text-purple-800 border border-purple-200', label: 'Under Review', icon: <ClockIcon className="w-3.5 h-3.5" /> }
    case 'overdue':
      return { classes: 'bg-rose-100 text-rose-800 border border-rose-200', label: 'Overdue', icon: <ClockIcon className="w-3.5 h-3.5" /> }
    default:
      return { classes: 'bg-slate-100 text-slate-800 border border-slate-200', label: 'Pending', icon: <AuditIcon className="w-3.5 h-3.5" /> }
  }
}

/* ================= KANBAN COLUMN COMPONENT ================= */
interface ComplianceKanbanColumnProps {
  title: string
  badgeColor: string
  count: number
  items: WorkflowCompliance[]
  onSelectDossier: (item: WorkflowCompliance) => void
  onUpdateStatus?: (item: WorkflowCompliance) => void
  isOfficerOrManager: boolean
}

function ComplianceKanbanColumn({
  title,
  badgeColor,
  count,
  items,
  onSelectDossier,
  onUpdateStatus,
  isOfficerOrManager
}: ComplianceKanbanColumnProps) {
  return (
    <div className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col h-[660px]">
      <div className="flex items-center justify-between p-2 mb-2">
        <h3 className="font-bold text-xs text-slate-800">{title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${badgeColor}`}>
          {count}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition space-y-2.5 text-xs group"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] text-slate-400 uppercase">{item.id.slice(-6)}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 truncate max-w-[120px]">
                {item.mineName}
              </span>
            </div>

            <h4
              onClick={() => onSelectDossier(item)}
              className="font-bold text-slate-900 group-hover:text-minsos-700 cursor-pointer line-clamp-2"
            >
              {item.requirement}
            </h4>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>{item.category}</span>
              <span>Due: {item.dueDate}</span>
            </div>

            {item.evidenceCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                <CameraUploadIcon className="w-3 h-3 text-teal-600" />
                <span>{item.evidenceCount} Certificate(s) Stored in MongoDB</span>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                onClick={() => onSelectDossier(item)}
                className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold hover:underline"
              >
                Inspect Dossier
              </button>

              {isOfficerOrManager && onUpdateStatus && (
                <button
                  onClick={() => onUpdateStatus(item)}
                  className="px-2 py-1 bg-minsos-600 hover:bg-minsos-700 text-white rounded-md text-[11px] font-bold"
                >
                  Advance
                </button>
              )}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">
            No obligations in this stage
          </div>
        )}
      </div>
    </div>
  )
}
