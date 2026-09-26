import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { workflowService, type InspectionDetail, type WorkflowLookup } from '../services/workflow'
import type { EvidenceItem, WorkflowInspection } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  InspectionsIcon,
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
  AlertTriangleIcon,
  FileTextIcon,
  ClockIcon,
  ChevronLeftIcon,
  ActionsIcon,
  ViolationsIcon
} from '../components/icons'

type ViewMode = 'table' | 'kanban'

type EvidenceModalState = {
  images: Array<{ src: string; fileName: string }>
  activeIndex: number
}

function getEvidenceImageSrc(ev: EvidenceItem): string {
  return ev.dataUri || ev.url || `http://localhost:5000/api/uploads/${ev.storageKey}`
}

function isEvidenceImage(ev: EvidenceItem): boolean {
  return Boolean(ev.mimeType?.startsWith('image/') || ev.fileName?.match(/\.(png|jpe?g|webp|gif)$/i))
}

function openEvidenceModal(
  evidence: EvidenceItem[] | undefined,
  setEvidenceModal: (state: EvidenceModalState | null) => void
): void {
  const images = (evidence ?? [])
    .filter(isEvidenceImage)
    .map((ev) => ({ src: getEvidenceImageSrc(ev), fileName: ev.fileName }))

  if (images.length > 0) {
    setEvidenceModal({ images, activeIndex: 0 })
  }
}

export function InspectionListPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<WorkflowInspection[]>([])
  const [mines, setMines] = useState<WorkflowLookup[]>([])
  const [inspectors, setInspectors] = useState<WorkflowLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMine, setSelectedMine] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [mineId, setMineId] = useState('')
  const [inspectorId, setInspectorId] = useState(user?.id ?? '')
  const [type, setType] = useState('Statutory safety')
  const [scheduledFor, setScheduledFor] = useState(new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('')
  const [observations, setObservations] = useState('')
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evidenceModal, setEvidenceModal] = useState<EvidenceModalState | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const [inspRes, mineRes, userRes] = await Promise.all([
        workflowService.inspections(),
        workflowService.mines().catch(() => []),
        workflowService.users('inspector').catch(() => [])
      ])
      setItems(inspRes.data)
      setMines(mineRes)
      if (userRes.length > 0) {
        setInspectors(userRes)
      } else if (user?.id) {
        setInspectors([{ id: user.id, name: user.name, label: `${user.name} (Current User)` }])
      }
      if (mineRes.length > 0 && !mineId) setMineId(mineRes[0].id)
    } catch {
      setError('Unable to load inspection records from backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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

  // GPS Geotag capture
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
        alert('Could not acquire GPS coordinates. Ensure location permissions are active.')
        setGpsLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Handle Drag & Drop
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

  // Schedule Inspection Submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mineId || !inspectorId || !type || !scheduledFor) {
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

      await workflowService.createInspection({
        mineId,
        inspectorId,
        type,
        scheduledFor: new Date(scheduledFor).toISOString(),
        location,
        observations,
        gps: gps ? { latitude: gps.latitude, longitude: gps.longitude } : undefined,
        evidence: evidenceList
      })

      setSuccess('Inspection scheduled successfully with evidence registered in MongoDB Atlas.')
      setShowScheduleModal(false)
      setLocation('')
      setObservations('')
      setSelectedFile(null)
      setGps(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Unable to schedule inspection. Please verify your permissions.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Inspections
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.mine && item.mine.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.mineCode && item.mineCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.inspector && item.inspector.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.observations && item.observations.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesMine = !selectedMine || item.mineId === selectedMine || item.mine === selectedMine
      const matchesStatus = !statusFilter || (item.rawStatus?.toLowerCase() === statusFilter.toLowerCase()) || (item.status.toLowerCase().replace(/\s+/g, '_') === statusFilter.toLowerCase())
      const matchesType = !typeFilter || item.type.toLowerCase() === typeFilter.toLowerCase()

      return matchesSearch && matchesMine && matchesStatus && matchesType
    })
  }, [items, searchQuery, selectedMine, statusFilter, typeFilter])

  // KPIs
  const stats = useMemo(() => {
    const total = items.length
    const scheduled = items.filter((i) => {
      const s = (i.rawStatus || i.status).toLowerCase()
      return s === 'draft' || s === 'scheduled'
    }).length
    const inProgress = items.filter((i) => {
      const s = (i.rawStatus || i.status).toLowerCase()
      return s === 'in_progress' || s === 'in progress'
    }).length
    const followUp = items.filter((i) => {
      const s = (i.rawStatus || i.status).toLowerCase()
      return s === 'follow_up_required' || s === 'follow up required'
    }).length
    const completed = items.filter((i) => {
      const s = (i.rawStatus || i.status).toLowerCase()
      return s === 'completed'
    }).length
    return { total, scheduled, inProgress, followUp, completed }
  }, [items])

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Mine', 'Mine Code', 'Type', 'Inspector', 'Status', 'Scheduled For', 'Completed On', 'Location', 'GPS Lat', 'GPS Long', 'Violations', 'Actions', 'Evidence Count']
    const rows = filteredItems.map((i) => [
      `"${i.id}"`,
      `"${(i.mine || '').replace(/"/g, '""')}"`,
      `"${i.mineCode || ''}"`,
      `"${i.type}"`,
      `"${(i.inspector || '').replace(/"/g, '""')}"`,
      `"${i.status}"`,
      `"${i.scheduledFor || ''}"`,
      `"${i.completedOn || ''}"`,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      i.latitude || 0,
      i.longitude || 0,
      i.violationCount || 0,
      i.actionCount || 0,
      i.photoCount || 0
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inspections_register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const userRole = user?.role ?? 'worker'
  const canSchedule = ['inspector', 'safety_officer', 'mine_manager', 'admin', 'safety', 'manager'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* 1. Executive Inspection Command Hub Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-minsos-950 p-6 shadow-xl text-white">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-minsos-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-minsos-500/30 bg-minsos-950/60 px-3 py-1 text-xs font-semibold text-minsos-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-minsos-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-minsos-500" />
              </span>
              STATUTORY SAFETY & FIELD REGULATORY INSPECTION HUB
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <InspectionsIcon className="w-7 h-7 text-minsos-400" />
              Mine Inspections & Safety Verification
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Schedule DGMS statutory audits, track inspector field investigations, capture GPS geotagged photo evidence in MongoDB Atlas, and monitor linked violations & corrective action resolution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              title="Export Inspection Register as CSV"
            >
              <DownloadIcon className="w-4 h-4 text-slate-300" />
              Export CSV
            </button>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 p-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              title="Refresh Records"
            >
              <RefreshIcon className="w-4 h-4 text-slate-300" />
            </button>
            {canSchedule && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-minsos-600 to-minsos-700 hover:from-minsos-500 hover:to-minsos-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-minsos-900/40 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusIcon className="w-4 h-4 text-white" />
                Schedule Inspection
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
        {/* Total Inspections */}
        <button
          onClick={() => setStatusFilter('')}
          className={`text-left p-4 rounded-xl border transition-all ${
            !statusFilter
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-75">All Audits</span>
            <InspectionsIcon className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{stats.total}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Across registered mines</p>
        </button>

        {/* Scheduled / Draft */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'draft' ? '' : 'draft')}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === 'draft'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Scheduled</span>
            <ClockIcon className="w-4 h-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">{stats.scheduled}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Planned field visits</p>
        </button>

        {/* In Progress */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? '' : 'in_progress')}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">In Progress</span>
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.inProgress}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active on-site audit</p>
        </button>

        {/* Follow-Up Required */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'follow_up_required' ? '' : 'follow_up_required')}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === 'follow_up_required'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Follow-Up</span>
            <AlertTriangleIcon className="w-4 h-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">{stats.followUp}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Violations flagged</p>
        </button>

        {/* Completed */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')}
          className={`text-left p-4 rounded-xl border transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Completed</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.completed}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Certified & closed</p>
        </button>
      </div>

      {/* 3. Search & Filter Bar with Dual View Mode */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search audit ID, type, mine, inspector, location..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
          >
            <option value="">All Inspection Types</option>
            <option value="Statutory safety">Statutory Safety</option>
            <option value="DGMS Electrical">DGMS Electrical</option>
            <option value="Mine Ventilation">Mine Ventilation</option>
            <option value="Haulage & Machinery">Haulage & Machinery</option>
            <option value="Priority Emergency">Priority Emergency</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Scheduled / Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="follow_up_required">Follow-Up Required</option>
            <option value="completed">Completed</option>
          </select>

          {(searchQuery || selectedMine || typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedMine('')
                setTypeFilter('')
                setStatusFilter('')
              }}
              className="text-xs text-minsos-600 hover:text-minsos-700 font-semibold underline px-1"
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
            Audit Pipeline
          </button>
        </div>
      </div>

      {/* 4. Main Inspection Display (Table or Kanban) */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Inspection ID & Type</th>
                  <th className="px-4 py-3.5">Mine Site</th>
                  <th className="px-4 py-3.5">Assigned Inspector</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Schedule / Date</th>
                  <th className="px-4 py-3.5">Violations & Actions</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                      Loading inspection records...
                    </td>
                  </tr>
                )}
                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                      No matching inspection records found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredItems.map((item) => {
                    const statusStr = (item.rawStatus || item.status).toLowerCase()
                    const isCompleted = statusStr === 'completed'
                    const isInProgress = statusStr === 'in_progress' || statusStr === 'in progress'
                    const isFollowUp = statusStr === 'follow_up_required' || statusStr === 'follow up required'

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <Link
                            to={`../inspections/${item.id}`}
                            className="font-bold text-minsos-600 hover:text-minsos-700 hover:underline text-sm inline-flex items-center gap-1.5"
                          >
                            <InspectionsIcon className="w-3.5 h-3.5 text-minsos-500" />
                            {item.id}
                          </Link>
                          <p className="text-xs font-medium text-slate-800 mt-0.5">{item.type}</p>
                          {item.location && (
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3 text-slate-400" />
                              {item.location}
                            </p>
                          )}
                          {item.photoCount > 0 && (
                            <button
                              type="button"
                              onClick={() => openEvidenceModal(item.evidence, setEvidenceModal)}
                              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200 mt-1.5 hover:bg-blue-100 transition cursor-pointer"
                            >
                              <CameraUploadIcon className="w-3 h-3 text-blue-600" />
                              {item.photoCount} Mongo Photo(s)
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-800 text-xs">{item.mine}</p>
                          <span className="inline-block mt-0.5 font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.mineCode}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-medium text-slate-800">{item.inspector}</p>
                          <p className="text-[11px] text-slate-400">DGMS Certified</p>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isInProgress
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : isFollowUp
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-500'
                                  : isInProgress
                                  ? 'bg-amber-500'
                                  : isFollowUp
                                  ? 'bg-rose-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            {item.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {item.completedOn ? (
                            <div>
                              <span className="font-semibold text-emerald-700">Completed: </span>
                              {item.completedOn}
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-blue-700">Scheduled: </span>
                              {item.scheduledFor}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                item.violationCount > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <ViolationsIcon className="w-3 h-3" />
                              {item.violationCount} Violations
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                item.actionCount > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <ActionsIcon className="w-3 h-3" />
                              {item.actionCount} Actions
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`../inspections/${item.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
                          >
                            <EyeIcon className="w-3.5 h-3.5 text-slate-500" />
                            Case Dossier
                          </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Column 1: Scheduled / Draft */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <h3 className="text-sm font-bold text-slate-800">Scheduled</h3>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {items.filter((i) => (i.rawStatus || i.status).toLowerCase() === 'draft').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredItems
                .filter((i) => (i.rawStatus || i.status).toLowerCase() === 'draft')
                .map((item) => (
                  <KanbanCard key={item.id} item={item} />
                ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">In Progress</h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {items.filter((i) => (i.rawStatus || i.status).toLowerCase() === 'in_progress').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredItems
                .filter((i) => (i.rawStatus || i.status).toLowerCase() === 'in_progress')
                .map((item) => (
                  <KanbanCard key={item.id} item={item} />
                ))}
            </div>
          </div>

          {/* Column 3: Follow-Up Required */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <h3 className="text-sm font-bold text-slate-800">Follow-Up Required</h3>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                {items.filter((i) => (i.rawStatus || i.status).toLowerCase() === 'follow_up_required').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredItems
                .filter((i) => (i.rawStatus || i.status).toLowerCase() === 'follow_up_required')
                .map((item) => (
                  <KanbanCard key={item.id} item={item} />
                ))}
            </div>
          </div>

          {/* Column 4: Completed */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">Completed</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {items.filter((i) => (i.rawStatus || i.status).toLowerCase() === 'completed').length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredItems
                .filter((i) => (i.rawStatus || i.status).toLowerCase() === 'completed')
                .map((item) => (
                  <KanbanCard key={item.id} item={item} />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Schedule Inspection Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-minsos-50 text-minsos-600">
                  <InspectionsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Schedule Statutory Mine Inspection</h2>
                  <p className="text-xs text-slate-500">Dispatch field inspectors, upload scope documents to MongoDB, and register coordinates</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mine Site *
                  </label>
                  <select
                    value={mineId}
                    onChange={(e) => setMineId(e.target.value)}
                    required
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
                    Assigned Inspector *
                  </label>
                  <select
                    value={inspectorId}
                    onChange={(e) => setInspectorId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  >
                    {inspectors.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label ?? u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Inspection Scope / Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  >
                    <option value="Statutory safety">Statutory Safety Audit</option>
                    <option value="DGMS Electrical">DGMS Electrical & Substation</option>
                    <option value="Mine Ventilation">Mine Ventilation & Flammable Gas</option>
                    <option value="Haulage & Machinery">Haulage & Heavy Machinery Safety</option>
                    <option value="Explosives & Blasting">Explosives Storage & Blasting Plan</option>
                    <option value="Structural Stability">Strata & Pit Slope Stability</option>
                    <option value="Tailings & Environmental">Tailings Dam & Environmental Clearance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Specific Mine Location / Section
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pit 3 West Face, Haul Road Bench 4"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                      {gpsLoading ? 'Acquiring...' : gps ? `${gps.latitude}, ${gps.longitude}` : 'Capture Pit GPS'}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Preliminary Focus Notes & Guidelines
                </label>
                <textarea
                  rows={2}
                  placeholder="Key areas to inspect, prior violation history, specific machinery to verify..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              {/* Drag & Drop Photo Evidence */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pre-Audit Photo / Checklist Evidence (Saved in MongoDB)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
                    isDragging ? 'border-minsos-500 bg-minsos-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
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
                        alt="Preview"
                        className="h-28 w-auto object-cover rounded-xl shadow-md border border-slate-200"
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
                    <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                      <div className="p-2.5 rounded-full bg-white shadow-xs border border-slate-200 text-slate-600">
                        <CameraUploadIcon className="w-5 h-5 text-minsos-600" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        Drag & drop inspection photos here, or <span className="text-minsos-600 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        PNG, JPG, PDF up to 10MB · Automatically persisted to MongoDB Atlas
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
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-minsos-600 hover:bg-minsos-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Schedule & Save to MongoDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {evidenceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setEvidenceModal(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Inspection Photo Evidence</h3>
                <p className="text-xs text-slate-500">
                  {evidenceModal.images.length} image{evidenceModal.images.length !== 1 ? 's' : ''} stored in MongoDB Atlas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceModal(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <CloseIcon className="w-4 h-4" />
                Close
              </button>
            </div>

            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={evidenceModal.images[evidenceModal.activeIndex]?.src}
                alt={evidenceModal.images[evidenceModal.activeIndex]?.fileName ?? 'Inspection evidence'}
                className="max-h-[60vh] w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  const storageKey = evidenceModal.images[evidenceModal.activeIndex]?.src.split('/').pop()
                  if (storageKey) {
                    target.src = `http://localhost:5000/uploads/${storageKey}`
                  }
                }}
              />
            </div>

            <p className="mb-4 text-sm font-medium text-slate-700">
              {evidenceModal.images[evidenceModal.activeIndex]?.fileName}
            </p>

            {evidenceModal.images.length > 1 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {evidenceModal.images.map((image, index) => (
                  <button
                    key={`${image.fileName}-${index}`}
                    type="button"
                    onClick={() => setEvidenceModal({ ...evidenceModal, activeIndex: index })}
                    className={`overflow-hidden rounded-lg border transition ${
                      evidenceModal.activeIndex === index
                        ? 'border-minsos-500 ring-2 ring-minsos-200'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={image.src} alt={image.fileName} className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function KanbanCard({ item }: { item: WorkflowInspection }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono text-minsos-600 bg-minsos-50 border border-minsos-200 px-1.5 py-0.5 rounded font-bold">
          {item.id}
        </span>
        <span className="text-[11px] font-mono text-slate-400">{item.mineCode}</span>
      </div>

      <div>
        <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.type}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{item.mine}</p>
        {item.location && <p className="text-[11px] text-slate-400 mt-0.5">Loc: {item.location}</p>}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
        <span>By: {item.inspector}</span>
        {item.photoCount > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
            <CameraUploadIcon className="w-3 h-3" />
            {item.photoCount} Photos
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-red-600 font-semibold">{item.violationCount}V</span>
          <span className="text-slate-300">·</span>
          <span className="text-purple-600 font-semibold">{item.actionCount}A</span>
        </div>
        <Link
          to={`../inspections/${item.id}`}
          className="rounded-lg bg-slate-100 hover:bg-minsos-50 hover:text-minsos-700 px-3 py-1 text-xs font-semibold text-slate-700 transition"
        >
          View Dossier
        </Link>
      </div>
    </div>
  )
}

/* =========================================================
   INSPECTION DETAIL PAGE (EXECUTIVE DOSSIER)
   ========================================================= */

export function InspectionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [item, setItem] = useState<InspectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Field Completion Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [observations, setObservations] = useState('')
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'follow_up_required'>('completed')
  const [completedOn, setCompletedOn] = useState(new Date().toISOString().slice(0, 10))
  const [completionFile, setCompletionFile] = useState<File | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Direct Evidence Upload
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const loadDetail = () => {
    if (!id) return
    setLoading(true)
    workflowService
      .inspection(id)
      .then((data) => {
        setItem(data)
        setObservations(data.observations || '')
      })
      .catch(() => setError('Unable to load this inspection dossier.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  // Move to In Progress
  const handleStartInspection = async () => {
    if (!item) return
    try {
      setActionLoading(true)
      await workflowService.updateInspection(item.id, { status: 'in_progress' })
      setSuccess('Inspection marked as In Progress. Field audit commenced.')
      loadDetail()
    } catch {
      setError('Unable to update inspection status.')
    } finally {
      setActionLoading(false)
    }
  }

  // Complete Field Inspection
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    try {
      setActionLoading(true)
      const evidenceList: Array<Record<string, unknown>> = []
      if (completionFile) {
        const uploadRes = await workflowService.uploadEvidence(completionFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.updateInspection(item.id, {
        status: completionStatus,
        completedOn: new Date(completedOn).toISOString(),
        observations,
        evidence: evidenceList.length > 0 ? evidenceList : undefined
      })

      setSuccess(`Inspection successfully certified as ${completionStatus === 'completed' ? 'Completed' : 'Follow-Up Required'}! Evidence saved to MongoDB.`)
      setShowCompleteModal(false)
      setCompletionFile(null)
      loadDetail()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to complete inspection.')
    } finally {
      setActionLoading(false)
    }
  }

  // Upload Additional Photo Evidence to MongoDB
  const handleAddEvidence = async (file: File) => {
    if (!item) return
    try {
      setUploadingEvidence(true)
      const uploadRes = await workflowService.uploadEvidence(file)
      await workflowService.updateInspection(item.id, {
        evidence: [uploadRes.evidence]
      })
      setSuccess('New photographic evidence persisted in MongoDB Atlas.')
      loadDetail()
    } catch {
      setError('Failed to upload evidence file to MongoDB.')
    } finally {
      setUploadingEvidence(false)
    }
  }

  const userRole = user?.role ?? 'worker'
  const canUpdate = ['inspector', 'safety_officer', 'mine_manager', 'admin', 'safety', 'manager'].includes(userRole)

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-minsos-600 border-r-transparent mb-3" />
        <p>Loading inspection dossier from MongoDB...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangleIcon className="w-6 h-6 text-red-600" />
          <p className="font-bold text-base">{error || 'Inspection not found'}</p>
        </div>
        <Link to="../inspections" className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline">
          <ChevronLeftIcon className="w-4 h-4" />
          Return to Inspection Register
        </Link>
      </div>
    )
  }

  const statusStr = (item.rawStatus || item.status).toLowerCase()
  const isCompleted = statusStr === 'completed'
  const isInProgress = statusStr === 'in_progress' || statusStr === 'in progress'
  const isFollowUp = statusStr === 'follow_up_required' || statusStr === 'follow up required'
  const isDraft = statusStr === 'draft' || statusStr === 'scheduled'

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="../inspections"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-minsos-600 hover:text-minsos-700 transition"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Inspection Register
        </Link>
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

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-minsos-950 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-minsos-300 bg-minsos-950 border border-minsos-700/50 px-2.5 py-0.5 rounded font-bold">
                {item.id}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isInProgress
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : isFollowUp
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {item.status}
              </span>
              <span className="text-xs text-slate-400">
                Mine: {item.mine} ({item.mineCode})
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{item.type}</h1>
            <p className="text-xs text-slate-400">
              Assigned Inspector: <span className="text-white font-semibold">{item.inspector}</span> · Scheduled For: {item.scheduledFor}
              {item.completedOn && ` · Completed On: ${item.completedOn}`}
            </p>
          </div>

          {/* Workflow Status Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {canUpdate && isDraft && (
              <button
                onClick={handleStartInspection}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
              >
                <ClockIcon className="w-4 h-4" />
                {actionLoading ? 'Starting...' : 'Commence Field Audit'}
              </button>
            )}

            {canUpdate && isInProgress && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Complete & Sign Off
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Case Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pit Location</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{item.location || 'Site Wide'}</p>
          {item.latitude !== 0 && (
            <p className="mt-1 text-[11px] font-mono text-minsos-600 flex items-center gap-1">
              <MapPinIcon className="w-3 h-3" />
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identified Violations</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{item.violations?.length ?? item.violationCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Issues logged during audit</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corrective Actions</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{item.actions?.length ?? item.actionCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned resolution tasks</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mongo Photo Evidence</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{item.evidence?.length ?? item.photoCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Stored in Atlas cluster</p>
        </div>
      </div>

      {/* Inspector Observations */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileTextIcon className="w-4 h-4 text-minsos-600" />
            Inspector Observations & Audit Findings
          </h3>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {item.observations || 'No written observations logged yet for this inspection.'}
        </div>
      </div>

      {/* Photographic Evidence Gallery (Stored in MongoDB) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CameraUploadIcon className="w-4 h-4 text-blue-600" />
            Photographic & Field Evidence ({item.evidence?.length ?? 0} files in MongoDB Atlas)
          </h3>
          {canUpdate && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs">
              <CameraUploadIcon className="w-3.5 h-3.5 text-blue-600" />
              {uploadingEvidence ? 'Uploading...' : 'Add Field Evidence'}
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                disabled={uploadingEvidence}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleAddEvidence(e.target.files[0])
                  }
                }}
              />
            </label>
          )}
        </div>

        {item.evidence && item.evidence.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {item.evidence.map((ev, idx) => {
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
                      <span className="text-[10px] mt-1 font-semibold truncate max-w-full">PDF Document</span>
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
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            No photographic evidence attached yet.
          </div>
        )}
      </div>

      {/* Linked Violations Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ViolationsIcon className="w-4 h-4 text-red-600" />
            Linked Violations ({item.violations?.length ?? 0})
          </h3>
          <Link
            to="../violations"
            className="text-xs font-semibold text-minsos-600 hover:text-minsos-700 transition"
          >
            Open Violations Register →
          </Link>
        </div>

        {item.violations && item.violations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Violation</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Assigned To</th>
                  <th className="px-4 py-2.5">Deadline</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {item.violations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 text-xs">{v.title}</p>
                      <span className="font-mono text-[10px] text-slate-400">{v.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          v.severity?.toLowerCase() === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : v.severity?.toLowerCase() === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {v.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{v.assignedTo}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{v.deadline}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">No violations were identified during this inspection.</p>
        )}
      </div>

      {/* Linked Corrective Actions Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ActionsIcon className="w-4 h-4 text-purple-600" />
            Linked Corrective Actions ({item.actions?.length ?? 0})
          </h3>
          <Link
            to="../actions"
            className="text-xs font-semibold text-minsos-600 hover:text-minsos-700 transition"
          >
            Open Corrective Actions →
          </Link>
        </div>

        {item.actions && item.actions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Corrective Action</th>
                  <th className="px-4 py-2.5">Responsible Worker</th>
                  <th className="px-4 py-2.5">Deadline</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {item.actions.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 text-xs">{a.title}</p>
                      <span className="font-mono text-[10px] text-slate-400">{a.id}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {a.assignedToName || a.responsiblePerson}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.deadline}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">No corrective action workflows linked.</p>
        )}
      </div>

      {/* Complete Inspection Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Complete & Sign Off Inspection</h2>
                  <p className="text-xs text-slate-500">Record final field observations and attach audit sign-off evidence</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Final Inspection Result / Status *
                </label>
                <select
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value as 'completed' | 'follow_up_required')}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                >
                  <option value="completed">Completed - Satisfactory Field Compliance</option>
                  <option value="follow_up_required">Follow-Up Required - Non-Compliance Detected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Date of Completion *
                </label>
                <input
                  type="date"
                  value={completedOn}
                  onChange={(e) => setCompletedOn(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Detailed Field Observations & Remarks *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record summary of inspection findings, safety conditions, gas readings, machinery clearances..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Completion Audit Report / Photo (Stored in MongoDB)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setCompletionFile(e.target.files?.[0] ?? null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-minsos-50 file:text-minsos-700 hover:file:bg-minsos-100"
                />
                {completionFile && (
                  <p className="mt-1 text-xs text-slate-500 font-semibold">
                    Attached: {completionFile.name} ({(completionFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Certify & Save to MongoDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
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
              alt="Inspection Photo Full View"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  )
}