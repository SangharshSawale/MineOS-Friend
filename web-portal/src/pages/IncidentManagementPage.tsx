import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  workflowService,
  type WorkflowLookup
} from '../services/workflow'
import type { Severity, WorkflowIncident } from '../types'
import {
  IncidentsIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  CloseIcon,
  CheckCircleIcon,
  EyeIcon,
  MapPinIcon,
  TableIcon,
  KanbanIcon,
  DownloadIcon,
  RefreshIcon,
  CameraUploadIcon,
  PaperclipIcon,
  UpgradeIcon,
  AlertTriangleIcon,
  FileTextIcon,
  ClockIcon
} from '../components/icons'

type ViewMode = 'table' | 'kanban'

export function IncidentManagementPage() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<WorkflowIncident[]>([])
  const [mines, setMines] = useState<WorkflowLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMine, setSelectedMine] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mineId, setMineId] = useState('')
  const [severity, setSeverity] = useState<Severity>('Medium')
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16))
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Active Incident Dossier Drawer
  const [activeIncident, setActiveIncident] = useState<WorkflowIncident | null>(null)
  const [investigationNotes, setInvestigationNotes] = useState('')
  const [investigationFile, setInvestigationFile] = useState<File | null>(null)
  const [closureNotes, setClosureNotes] = useState('')
  const [closureFile, setClosureFile] = useState<File | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Photo Lightbox State
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [incidentRes, mineRes] = await Promise.all([
        workflowService.incidents({
          severity: severityFilter.toLowerCase() || undefined,
          status: statusFilter.toLowerCase() || undefined
        }),
        workflowService.mines().catch(() => [])
      ])
      setIncidents(incidentRes.data)
      setMines(mineRes)
      if (mineRes.length > 0 && !mineId) setMineId(mineRes[0].id)
    } catch {
      setError('Unable to load incident records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [severityFilter, statusFilter])

  // Handle local file preview cleanup
  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null)
      return
    }
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile)
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setFilePreview(null)
    }
  }, [selectedFile])

  // Geolocation capture
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        })
        setGpsLoading(false)
      },
      (err) => {
        console.warn('GPS error', err)
        alert('Could not obtain GPS coordinates. Ensure location permissions are granted.')
        setGpsLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Handle drag and drop in file upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  // Submit Incident Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || !mineId) {
      alert('Please fill out all required fields.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const evidenceList: Array<Record<string, unknown>> = []
      if (selectedFile) {
        const uploadRes = await workflowService.uploadEvidence(selectedFile, gps ?? undefined)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.createIncident({
        title,
        description,
        mineId,
        severity: severity.toLowerCase(),
        occurredAt: new Date(occurredAt).toISOString(),
        evidence: evidenceList
      })

      setSuccess(
        severity === 'Critical' || severity === 'High'
          ? `Emergency ${severity} Incident reported! On-site Priority Inspection has been auto-dispatched & saved to MongoDB.`
          : 'Incident reported successfully with evidence persisted in MongoDB.'
      )
      setShowReportModal(false)
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setGps(null)
      loadData()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to report incident. Please verify server connectivity.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Start Investigation
  const handleInvestigate = async () => {
    if (!activeIncident) return
    try {
      setActionLoading(true)
      const evidenceList: Array<Record<string, unknown>> = []
      if (investigationFile) {
        const uploadRes = await workflowService.uploadEvidence(investigationFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.investigateIncident(activeIncident.id, {
        investigationNotes: investigationNotes || 'Investigation commenced by safety officer.',
        evidence: evidenceList.length > 0 ? evidenceList : undefined
      })
      setSuccess('Incident status updated to Investigating with case evidence saved.')
      setActiveIncident(null)
      setInvestigationFile(null)
      loadData()
    } catch {
      setError('Failed to update incident investigation.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Incident Closure
  const handleClose = async () => {
    if (!activeIncident) return
    if (!closureNotes) {
      alert('Closure remediation notes are required.')
      return
    }
    try {
      setActionLoading(true)
      const evidenceList: Array<Record<string, unknown>> = []
      if (closureFile) {
        const uploadRes = await workflowService.uploadEvidence(closureFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.closeIncident(activeIncident.id, {
        closureNotes,
        evidence: evidenceList.length > 0 ? evidenceList : undefined
      })
      setSuccess('Incident closed successfully. Related alerts and risks resolved.')
      setActiveIncident(null)
      setClosureFile(null)
      loadData()
    } catch {
      setError('Failed to close incident.')
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered & Searched records
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.mineName && item.mineName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.mineCode && item.mineCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.reportedByName && item.reportedByName.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesMine = !selectedMine || item.mineId === selectedMine
      return matchesSearch && matchesMine
    })
  }, [incidents, searchQuery, selectedMine])

  // KPIs
  const stats = useMemo(() => {
    const total = incidents.length
    const criticalHigh = incidents.filter(
      (i) => i.severity?.toLowerCase() === 'critical' || i.severity?.toLowerCase() === 'high'
    ).length
    const investigating = incidents.filter((i) => i.status?.toLowerCase() === 'investigating').length
    const closed = incidents.filter((i) => i.status?.toLowerCase() === 'closed').length
    const priorityDispatched = incidents.filter((i) => Boolean(i.priorityInspectionId)).length
    return { total, criticalHigh, investigating, closed, priorityDispatched }
  }, [incidents])

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Mine Name', 'Mine Code', 'Severity', 'Status', 'Occurred At', 'Reported By', 'Investigator', 'Priority Inspection', 'Evidence Count']
    const rows = filteredIncidents.map((i) => [
      `"${i.id}"`,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.mineName || '').replace(/"/g, '""')}"`,
      `"${i.mineCode || ''}"`,
      `"${i.severity}"`,
      `"${i.status}"`,
      `"${i.occurredAt || ''}"`,
      `"${i.reportedByName || ''}"`,
      `"${i.investigatorName || ''}"`,
      `"${i.priorityInspectionId ? 'Yes' : 'No'}"`,
      i.evidenceCount || 0
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `incidents_audit_register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const userRole = user?.role ?? 'worker'
  const canReport = [
    'worker',
    'inspector',
    'safety_officer',
    'mine_manager',
    'contractor',
    'admin',
    'safety',
    'manager'
  ].includes(userRole)
  const canInvestigate = [
    'inspector',
    'safety_officer',
    'mine_manager',
    'admin',
    'safety',
    'manager'
  ].includes(userRole)
  const canClose = [
    'safety_officer',
    'mine_manager',
    'admin',
    'safety',
    'manager'
  ].includes(userRole)

  return (
    <div className="space-y-6">
      {/* 1. Executive Emergency Command Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-6 shadow-xl text-white">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              EMERGENCY OPERATIONS & INCIDENT REGISTER
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <IncidentsIcon className="w-7 h-7 text-red-400" />
              Mine Incident Management & Emergency Dispatch
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time frontline hazard reporting, automated priority inspection dispatch, geotagged photographic evidence stored in MongoDB Atlas, and regulatory case closure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              title="Download Incident Audit Trail as CSV"
            >
              <DownloadIcon className="w-4 h-4 text-slate-300" />
              Export CSV
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 p-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              title="Refresh Records"
            >
              <RefreshIcon className="w-4 h-4 text-slate-300" />
            </button>
            {canReport && (
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusIcon className="w-4 h-4 text-white" />
                Report Incident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Clickable KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Incidents */}
        <button
          onClick={() => {
            setSeverityFilter('')
            setStatusFilter('')
          }}
          className={`text-left p-4 rounded-xl border transition-all ${
            !severityFilter && !statusFilter
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-75">All Incidents</span>
            <IncidentsIcon className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{stats.total}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Across all mining sites</p>
        </button>

        {/* Critical & High Emergencies */}
        <button
          onClick={() => {
            setSeverityFilter(severityFilter === 'Critical' ? '' : 'Critical')
          }}
          className={`text-left p-4 rounded-xl border transition-all ${
            severityFilter === 'Critical'
              ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400'
              : 'bg-white border-slate-200 hover:border-red-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Critical / High</span>
            <span className="flex h-2 w-2 rounded-full bg-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">{stats.criticalHigh}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Urgent containment required</p>
        </button>

        {/* Under Investigation */}
        <button
          onClick={() => {
            setStatusFilter(statusFilter === 'investigating' ? '' : 'investigating')
          }}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === 'investigating'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Investigating</span>
            <ClockIcon className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.investigating}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">On-site team deployed</p>
        </button>

        {/* Closed / Resolved */}
        <button
          onClick={() => {
            setStatusFilter(statusFilter === 'closed' ? '' : 'closed')
          }}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === 'closed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Closed</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.closed}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Fully remediated & signed</p>
        </button>

        {/* Priority Inspections Dispatched */}
        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 text-purple-950 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">Priority Inspections</span>
            <UpgradeIcon className="w-4 h-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-purple-800">{stats.priorityDispatched}</p>
          <p className="text-[11px] text-purple-600 mt-0.5">Auto-dispatched to field</p>
        </div>
      </div>

      {/* 3. Search, Mine Filter & Dual View Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, description, reporter, site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 bg-slate-50/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMine}
              onChange={(e) => setSelectedMine(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
            >
              <option value="">All Mines</option>
              {mines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
          </select>

          {(searchQuery || selectedMine || severityFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedMine('')
                setSeverityFilter('')
                setStatusFilter('')
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-end md:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table Matrix
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            Response Pipeline
          </button>
        </div>
      </div>

      {/* 4. Main Content: Table View vs Kanban Board */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Incident / Hazard</th>
                  <th className="px-4 py-3.5">Mine Site</th>
                  <th className="px-4 py-3.5">Severity</th>
                  <th className="px-4 py-3.5">Operational Status</th>
                  <th className="px-4 py-3.5">Occurred At</th>
                  <th className="px-4 py-3.5">Reported By</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                      Loading incident records...
                    </td>
                  </tr>
                )}
                {!loading && filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                      No matching incident records found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredIncidents.map((incident) => {
                    const isCritical = incident.severity?.toLowerCase() === 'critical'
                    const isHigh = incident.severity?.toLowerCase() === 'high'
                    return (
                      <tr key={incident.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            {isCritical ? (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-600 flex-shrink-0 animate-pulse" />
                            ) : isHigh ? (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                            ) : (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{incident.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1 max-w-sm mt-0.5">
                                {incident.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {incident.priorityInspectionId && (
                                  <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                                    <UpgradeIcon className="w-3 h-3 text-purple-600" />
                                    Priority Inspection Dispatched
                                  </span>
                                )}
                                {incident.evidenceCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                                    <CameraUploadIcon className="w-3 h-3 text-blue-600" />
                                    {incident.evidenceCount} Mongo Evidence File(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800 text-xs">{incident.mineName}</p>
                          <span className="inline-block mt-0.5 font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {incident.mineCode}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isCritical
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : isHigh
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : incident.severity?.toLowerCase() === 'medium'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {incident.severity}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                              incident.status === 'closed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : incident.status === 'investigating'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                incident.status === 'closed'
                                  ? 'bg-emerald-500'
                                  : incident.status === 'investigating'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            {incident.status === 'closed'
                              ? 'Closed / Resolved'
                              : incident.status === 'investigating'
                              ? 'Under Investigation'
                              : 'Reported / Triage'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {incident.occurredAt ? new Date(incident.occurredAt).toLocaleString() : 'N/A'}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-medium text-slate-800">{incident.reportedByName || 'Field Reporter'}</p>
                          <p className="text-[11px] text-slate-400 capitalize">{incident.reportedByRole || 'Worker'}</p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              setActiveIncident(incident)
                              setInvestigationNotes(incident.investigationNotes ?? '')
                              setClosureNotes(incident.closureNotes ?? '')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
                          >
                            <EyeIcon className="w-3.5 h-3.5 text-slate-500" />
                            Case Dossier
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Reported */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <h3 className="text-sm font-bold text-slate-800">Reported / Triage</h3>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {filteredIncidents.filter((i) => i.status === 'reported').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredIncidents
                .filter((i) => i.status === 'reported')
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          incident.severity?.toLowerCase() === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : incident.severity?.toLowerCase() === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {incident.severity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{incident.mineCode}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{incident.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{incident.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <span>{incident.mineName}</span>
                      {incident.evidenceCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                          <PaperclipIcon className="w-3 h-3" />
                          {incident.evidenceCount} Files
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setActiveIncident(incident)
                        setInvestigationNotes(incident.investigationNotes ?? '')
                      }}
                      className="w-full rounded-lg bg-blue-50 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition text-center"
                    >
                      Review & Investigate
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: Investigating */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Under Investigation</h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {filteredIncidents.filter((i) => i.status === 'investigating').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredIncidents
                .filter((i) => i.status === 'investigating')
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {incident.severity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{incident.mineCode}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{incident.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{incident.description}</p>
                    </div>

                    {incident.investigationNotes && (
                      <div className="rounded bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200/60">
                        <span className="font-semibold">Notes: </span>
                        {incident.investigationNotes}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <span>By: {incident.investigatorName || 'Safety Team'}</span>
                      {incident.evidenceCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                          <PaperclipIcon className="w-3 h-3" />
                          {incident.evidenceCount} Files
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setActiveIncident(incident)
                        setClosureNotes(incident.closureNotes ?? '')
                      }}
                      className="w-full rounded-lg bg-amber-50 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition text-center"
                    >
                      Remediate & Close Case
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: Closed */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">Closed / Remediated</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {filteredIncidents.filter((i) => i.status === 'closed').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredIncidents
                .filter((i) => i.status === 'closed')
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs opacity-90 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Remediated
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{incident.mineCode}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{incident.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">{incident.description}</p>
                    </div>

                    {incident.closureNotes && (
                      <div className="rounded bg-emerald-50 p-2 text-[11px] text-emerald-900 border border-emerald-200/60">
                        <span className="font-semibold">Closure: </span>
                        {incident.closureNotes}
                      </div>
                    )}

                    <button
                      onClick={() => setActiveIncident(incident)}
                      className="w-full rounded-lg bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition text-center"
                    >
                      View Case Record
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <IncidentsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Report Unplanned Incident / Hazard</h2>
                  <p className="text-xs text-slate-500">Record frontline hazards, upload site photos to MongoDB, and dispatch emergency response</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Roof fall in Haulage Road 4, Hydraulic leak at Longwall Excavator"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mining Site *
                  </label>
                  <select
                    value={mineId}
                    onChange={(e) => setMineId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  >
                    {mines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Severity Level *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  >
                    <option value="Low">Low - Minor Hazard / No Injury</option>
                    <option value="Medium">Medium - Equipment Stoppage</option>
                    <option value="High">High - Major Damage / Lost Time</option>
                    <option value="Critical">Critical - Life Safety / Structural Failure</option>
                  </select>
                </div>
              </div>

              {(severity === 'Critical' || severity === 'High') && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900">
                  <AlertTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Emergency Protocol Engaged: </span>
                    Submitting this {severity} incident will instantly trigger an on-site Priority Inspection, notify the DGMS coordinator, and alert mine management.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Detailed Field Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the nature of the hazard, location, machinery involved, worker injuries, and initial containment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date & Time Occurred
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    GPS Geotagging
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCaptureGps}
                      disabled={gpsLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <MapPinIcon className="w-4 h-4 text-slate-500" />
                      {gpsLoading ? 'Acquiring...' : gps ? `${gps.latitude}, ${gps.longitude}` : 'Capture Mine GPS'}
                    </button>
                    {gps && (
                      <button
                        type="button"
                        onClick={() => setGps(null)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Clear GPS"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Drag-and-Drop Photographic Evidence (Persisted to MongoDB) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Photographic / Document Evidence (Saved in MongoDB)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                    isDragging
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                  />

                  {filePreview ? (
                    <div className="relative group">
                      <img
                        src={filePreview}
                        alt="Evidence Preview"
                        className="h-32 w-auto object-cover rounded-xl shadow-md border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFile(null)
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <div className="p-3 rounded-full bg-white shadow-xs border border-slate-200 text-slate-600">
                        <CameraUploadIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        Drag & drop hazard photos here, or <span className="text-red-600 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports PNG, JPG, WEBP, PDF up to 10MB · Automatically stored in MongoDB Atlas
                      </p>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="mt-2 text-xs font-semibold text-slate-700">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting & Persisting...' : 'Submit Incident to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Active Incident Case Dossier Modal */}
      {activeIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {activeIncident.mineCode}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      activeIncident.severity?.toLowerCase() === 'critical'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : activeIncident.severity?.toLowerCase() === 'high'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {activeIncident.severity}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                      activeIncident.status === 'closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeIncident.status === 'investigating'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activeIncident.status === 'closed'
                      ? 'Closed / Resolved'
                      : activeIncident.status === 'investigating'
                      ? 'Under Investigation'
                      : 'Reported / Triage'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2">{activeIncident.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{activeIncident.mineName}</p>
              </div>

              <button
                onClick={() => setActiveIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Description & Case Metadata */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Incident Description</h4>
                <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  {activeIncident.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-slate-500 font-semibold uppercase">Reporter Profile</span>
                  <p className="font-bold text-slate-800 text-sm">{activeIncident.reportedByName || 'Field Worker'}</p>
                  <p className="text-slate-500 capitalize">{activeIncident.reportedByRole || 'Worker'}</p>
                  <p className="text-slate-400 text-[11px] pt-1">
                    Occurred: {activeIncident.occurredAt ? new Date(activeIncident.occurredAt).toLocaleString() : 'N/A'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-slate-500 font-semibold uppercase">Investigation Assignment</span>
                  <p className="font-bold text-slate-800 text-sm">{activeIncident.investigatorName || 'Pending Assignment'}</p>
                  {activeIncident.priorityInspectionId && (
                    <div className="inline-flex items-center gap-1.5 text-purple-700 font-semibold text-xs pt-1">
                      <UpgradeIcon className="w-4 h-4 text-purple-600" />
                      Priority Inspection Dispatched
                    </div>
                  )}
                </div>
              </div>

              {/* Chronological Notes */}
              {activeIncident.investigationNotes && (
                <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-amber-800">Investigation Findings</span>
                  <p className="text-amber-900 whitespace-pre-wrap leading-relaxed">{activeIncident.investigationNotes}</p>
                </div>
              )}

              {activeIncident.closureNotes && (
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-emerald-800">
                    Remediation & Case Closure (Closed by {activeIncident.closedByName || 'Manager'} on {activeIncident.closedAt})
                  </span>
                  <p className="text-emerald-900 whitespace-pre-wrap leading-relaxed">{activeIncident.closureNotes}</p>
                </div>
              )}

              {/* Photographic & Field Evidence Gallery (From MongoDB) */}
              {activeIncident.evidence && activeIncident.evidence.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <CameraUploadIcon className="w-4 h-4 text-blue-600" />
                      Photographic & Field Evidence ({activeIncident.evidence.length} items in MongoDB Atlas)
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeIncident.evidence.map((ev, idx) => {
                      const fileSrc = ev.dataUri || ev.url || `http://localhost:5000/api/uploads/${ev.storageKey}`
                      const isImage = ev.mimeType?.startsWith('image/') || ev.fileName?.match(/\.(png|jpe?g|webp|gif)$/i)

                      return (
                        <div
                          key={ev.id || idx}
                          className="group relative rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden shadow-xs hover:border-slate-400 transition"
                        >
                          {isImage ? (
                            <button
                              type="button"
                              onClick={() => setLightboxSrc(fileSrc)}
                              className="block w-full overflow-hidden rounded-lg bg-slate-200 aspect-video relative text-left"
                            >
                              <img
                                src={fileSrc}
                                alt={ev.fileName}
                                className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `http://localhost:5000/uploads/${ev.storageKey}`
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                                View Full Size
                              </div>
                            </button>
                          ) : (
                            <a
                              href={fileSrc}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-100 aspect-video text-slate-600 hover:text-blue-600 transition"
                            >
                              <FileTextIcon className="w-8 h-8 text-slate-400" />
                              <span className="text-[10px] mt-1 font-semibold truncate max-w-full">PDF Report</span>
                            </a>
                          )}

                          <div className="mt-2 text-[11px]">
                            <p className="font-medium text-slate-800 truncate" title={ev.fileName}>
                              {ev.fileName}
                            </p>
                            <div className="flex items-center justify-between text-slate-400 mt-0.5">
                              <span>{(ev.sizeBytes / 1024).toFixed(1)} KB</span>
                              {ev.gps && (
                                <span className="inline-flex items-center gap-0.5 text-blue-600 font-mono text-[10px]">
                                  <MapPinIcon className="w-3 h-3" />
                                  {ev.gps.latitude.toFixed(2)}, {ev.gps.longitude.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Controls: Investigation initiation or Incident Closure */}
              {activeIncident.status === 'reported' && canInvestigate && (
                <div className="border-t border-slate-100 pt-4 space-y-3 bg-blue-50/40 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Initiate Field Investigation
                  </h4>
                  <textarea
                    rows={2}
                    placeholder="Enter preliminary notes or assign technical investigation team..."
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs text-slate-900 bg-white"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-semibold">
                      <CameraUploadIcon className="w-4 h-4" />
                      {investigationFile ? `Attached: ${investigationFile.name}` : 'Attach Investigation Photo/Report'}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => setInvestigationFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      onClick={handleInvestigate}
                      disabled={actionLoading}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
                    >
                      {actionLoading ? 'Processing...' : 'Commence Investigation'}
                    </button>
                  </div>
                </div>
              )}

              {activeIncident.status === 'investigating' && canClose && (
                <div className="border-t border-slate-100 pt-4 space-y-3 bg-emerald-50/40 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Remediate & Close Incident
                  </h4>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide root-cause summary, containment confirmation, and regulatory clearance notes..."
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-xs text-slate-900 bg-white"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold">
                      <CameraUploadIcon className="w-4 h-4" />
                      {closureFile ? `Attached: ${closureFile.name}` : 'Attach Remediated Closure Evidence'}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => setClosureFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      onClick={handleClose}
                      disabled={actionLoading}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition"
                    >
                      {actionLoading ? 'Closing...' : 'Close & Finalize Case'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Image Lightbox Modal */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-2 shadow-lg hover:bg-slate-100 transition z-10"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <img
              src={lightboxSrc}
              alt="Incident Evidence Full View"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  )
}
