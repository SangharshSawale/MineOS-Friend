import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard, StatusBadge } from '../components/ui'
import { workflowService, type WorkflowLookup } from '../services/workflow'
import type { Severity, WorkflowInspection, WorkflowViolation } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  ViolationsIcon,
  InspectionsIcon,
  UpgradeIcon,
  KanbanIcon,
  TableIcon,
  DownloadIcon,
  SearchIcon,
  PlusIcon,
  CloseIcon,
  CheckIcon,
  EyeIcon,
  RefreshIcon
} from '../components/icons'

const VIOLATION_CATEGORIES = [
  'All',
  'Strata Control',
  'Ventilation Standard',
  'Electrical Safety',
  'Haulage & Machinery',
  'Explosives & Blasting',
  'DGMS Statutory',
  'Dust & Environmental'
] as const

export function ViolationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<WorkflowViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // View Mode: 'table' or 'kanban'
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [upgradeItem, setUpgradeItem] = useState<WorkflowViolation | null>(null)
  const [statusItem, setStatusItem] = useState<WorkflowViolation | null>(null)
  const [detailItem, setDetailItem] = useState<WorkflowViolation | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await workflowService.violations()
      setItems(res.data)
      setError('')
    } catch {
      setError('Unable to load statutory violations from the backend database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Risk Score Calculator (1 to 10 scale)
  const calculateRiskScore = (item: WorkflowViolation): { score: number; label: string; color: string } => {
    let base = 3.0
    if (item.severity === 'Critical') base = 8.5
    else if (item.severity === 'High') base = 6.5
    else if (item.severity === 'Medium') base = 4.5
    else base = 2.5

    const isOverdue = item.status !== 'Resolved' && item.deadline && new Date(item.deadline).getTime() < Date.now()
    if (isOverdue) base = Math.min(base + 1.5, 10.0)

    if (item.status === 'Resolved') return { score: 1.0, label: 'Low / Cleared', color: 'emerald' }
    if (base >= 8.0) return { score: Number(base.toFixed(1)), label: 'Critical Stop-Work Risk', color: 'rose' }
    if (base >= 6.0) return { score: Number(base.toFixed(1)), label: 'High Priority Hazard', color: 'amber' }
    if (base >= 4.0) return { score: Number(base.toFixed(1)), label: 'Moderate Operational Risk', color: 'blue' }
    return { score: Number(base.toFixed(1)), label: 'Routine Advisory', color: 'slate' }
  }

  // KPI calculations
  const kpis = useMemo(() => {
    const total = items.length
    const critical = items.filter((i) => i.severity === 'Critical').length
    const high = items.filter((i) => i.severity === 'High').length
    const open = items.filter((i) => i.status === 'Open').length
    const underReview = items.filter((i) => i.status === 'Under review').length
    const resolved = items.filter((i) => i.status === 'Resolved').length
    const overdue = items.filter(
      (i) => i.status !== 'Resolved' && i.deadline && new Date(i.deadline).getTime() < Date.now()
    ).length
    const clearanceRate = total > 0 ? Math.round((resolved / total) * 100) : 0
    return { total, critical, high, open, underReview, resolved, overdue, clearanceRate }
  }, [items])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length }
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1
    }
    return counts
  }, [items])

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
      if (severityFilter && item.severity !== severityFilter) return false
      if (statusFilter && item.status !== statusFilter) return false
      if (overdueOnly) {
        const isOverdue = item.status !== 'Resolved' && item.deadline && new Date(item.deadline).getTime() < Date.now()
        if (!isOverdue) return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchMine = item.mine.toLowerCase().includes(query)
        const matchCat = item.category.toLowerCase().includes(query)
        const matchAssigned = item.assignedTo.toLowerCase().includes(query)
        const matchId = item.id.toLowerCase().includes(query)
        if (!matchTitle && !matchMine && !matchCat && !matchAssigned && !matchId) return false
      }
      return true
    })
  }, [items, selectedCategory, severityFilter, statusFilter, overdueOnly, searchQuery])

  // Export to CSV Function
  const exportCsv = () => {
    if (filteredItems.length === 0) return
    const headers = ['Record ID', 'Title', 'Mine', 'Category', 'Severity', 'Status', 'Assignee', 'Deadline', 'Closure Reason']
    const rows = filteredItems.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.mine.replace(/"/g, '""')}"`,
      `"${i.category.replace(/"/g, '""')}"`,
      i.severity,
      i.status,
      `"${i.assignedTo.replace(/"/g, '""')}"`,
      i.deadline,
      `"${(i.closureReason || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `DGMS_Violations_Register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const userRole = user?.role ?? 'worker'
  const canManage = ['admin', 'mine_manager', 'safety_officer', 'inspector', 'safety', 'manager'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Top Executive Command Center Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-minsos-900 to-slate-900 p-6 text-white shadow-xl border border-slate-800">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-minsos-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-20 h-48 w-48 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-minsos-500/20 border border-minsos-400/30 px-3 py-1 text-xs font-semibold text-minsos-200 tracking-wide uppercase">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>DGMS Statutory Enforcement Engine · CMR 2017</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <ViolationsIcon className="w-7 h-7 text-minsos-400" />
              <span>Statutory Violation & Remediation Command Hub</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time monitoring of mine site safety breaches, statutory non-compliances, risk escalation matrix, and regulatory remediation sign-offs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-minsos-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Table Matrix View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'kanban'
                    ? 'bg-minsos-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Kanban Pipeline Board"
              >
                <KanbanIcon className="w-3.5 h-3.5" />
                <span>Pipeline</span>
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={exportCsv}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition disabled:opacity-50"
              title="Download official DGMS register"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition"
              title="Refresh register"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Record Violation Primary Action */}
            {canManage && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-minsos-500 to-minsos-600 hover:from-minsos-600 hover:to-minsos-700 px-4 py-2 rounded-xl font-bold text-white text-xs sm:text-sm shadow-md transition transform active:scale-95 border border-minsos-400/40"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Record Violation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-700 font-bold ml-2">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-700 font-bold ml-2">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5 Executive KPI Metric Command Cards (With Click-to-Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Recorded */}
        <button
          type="button"
          onClick={() => {
            setSeverityFilter('')
            setStatusFilter('')
            setOverdueOnly(false)
            setSelectedCategory('All')
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition shadow-xs hover:shadow-md ${
            !severityFilter && !statusFilter && !overdueOnly && selectedCategory === 'All'
              ? 'border-slate-800 ring-2 ring-slate-800/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Recorded</span>
            <span className="text-[10px] font-semibold text-slate-400">All Time</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.total}</span>
            <span className="text-xs text-slate-500 font-medium">infractions</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-700 h-full rounded-full" style={{ width: '100%' }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Click to view all breaches</p>
        </button>

        {/* Card 2: Critical Stop-Work Severity */}
        <button
          type="button"
          onClick={() => {
            setSeverityFilter((prev) => (prev === 'Critical' ? '' : 'Critical'))
            setStatusFilter('')
            setOverdueOnly(false)
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition shadow-xs hover:shadow-md relative overflow-hidden ${
            severityFilter === 'Critical'
              ? 'border-rose-600 ring-2 ring-rose-600/30 bg-rose-50/20'
              : 'border-rose-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Critical Stop-Work</span>
            {kpis.critical > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-700">{kpis.critical}</span>
            <span className="text-xs text-rose-600 font-semibold">Immediate Danger</span>
          </div>
          <div className="w-full bg-rose-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-rose-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((kpis.critical / (kpis.total || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-rose-600 font-medium mt-2">
            {severityFilter === 'Critical' ? '✓ Filter Active' : 'Filter Critical Breaches'}
          </p>
        </button>

        {/* Card 3: High Risk Breaches */}
        <button
          type="button"
          onClick={() => {
            setSeverityFilter((prev) => (prev === 'High' ? '' : 'High'))
            setStatusFilter('')
            setOverdueOnly(false)
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition shadow-xs hover:shadow-md ${
            severityFilter === 'High'
              ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50/20'
              : 'border-amber-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider">
            <span>High Risk</span>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Urgent</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-800">{kpis.high}</span>
            <span className="text-xs text-amber-600 font-medium">Priority Action</span>
          </div>
          <div className="w-full bg-amber-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((kpis.high / (kpis.total || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-2">
            {severityFilter === 'High' ? '✓ Filter Active' : 'Filter High Risk'}
          </p>
        </button>

        {/* Card 4: Overdue Breaches (SLA Breached) */}
        <button
          type="button"
          onClick={() => {
            setOverdueOnly((prev) => !prev)
            setStatusFilter('')
            setSeverityFilter('')
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition shadow-xs hover:shadow-md ${
            overdueOnly
              ? 'border-red-600 ring-2 ring-red-600/30 bg-red-50/30'
              : 'border-red-200 hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-red-700 uppercase tracking-wider">
            <span>Overdue Breaches</span>
            {kpis.overdue > 0 && (
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                SLA Alert
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-red-700">{kpis.overdue}</span>
            <span className="text-xs text-red-600 font-medium">Past Deadline</span>
          </div>
          <div className="w-full bg-red-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-red-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((kpis.overdue / (kpis.total || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-red-600 font-medium mt-2">
            {overdueOnly ? '✓ Showing Overdue Only' : 'Filter Overdue Breaches'}
          </p>
        </button>

        {/* Card 5: Resolved & Cleared */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === 'Resolved' ? '' : 'Resolved'))
            setSeverityFilter('')
            setOverdueOnly(false)
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition shadow-xs hover:shadow-md col-span-2 lg:col-span-1 ${
            statusFilter === 'Resolved'
              ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20'
              : 'border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <span>DGMS Cleared</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              {kpis.clearanceRate}% Rate
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800">{kpis.resolved}</span>
            <span className="text-xs text-emerald-600 font-medium">Verified Cleared</span>
          </div>
          <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((kpis.resolved / (kpis.total || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            {statusFilter === 'Resolved' ? '✓ Filter Active' : 'Filter Resolved'}
          </p>
        </button>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {VIOLATION_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          const count = categoryCounts[cat] || 0
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search & Operational Filter Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, colliery, category, assignee, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-minsos-500 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs font-semibold">Severity:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:ring-2 focus:ring-minsos-500 transition"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical (Stop-Work)</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs font-semibold">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:ring-2 focus:ring-minsos-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Overdue Quick Toggle */}
          <button
            type="button"
            onClick={() => setOverdueOnly((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
              overdueOnly
                ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>⚠️</span>
            <span>Overdue Only</span>
          </button>

          {/* Reset Filters */}
          {(searchQuery || severityFilter || statusFilter || overdueOnly || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSeverityFilter('')
                setStatusFilter('')
                setOverdueOnly(false)
                setSelectedCategory('All')
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 underline transition"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-slate-400 text-xs font-medium">
            Showing <strong className="text-slate-700">{filteredItems.length}</strong> of{' '}
            <strong className="text-slate-700">{items.length}</strong> infractions
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Table Matrix View */}
      {viewMode === 'table' && (
        <SectionCard
          title="Statutory Violations & Remediation Matrix"
          subtitle="Governed under Mines Act 1952, Coal Mines Regulations 2017, and DGMS Technical Standing Orders"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Violation & Category</th>
                  <th className="px-4 py-3.5 font-bold">Colliery / Inspection</th>
                  <th className="px-4 py-3.5 font-bold">Severity & Risk Index</th>
                  <th className="px-4 py-3.5 font-bold">Assignee & Statutory SLA</th>
                  <th className="px-4 py-3.5 font-bold">Workflow Progression</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions & Upgrade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-minsos-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-semibold text-slate-600">Retrieving infractions from database...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-3xl">🔍</p>
                        <p className="font-bold text-slate-800 text-base">No violations match your filter criteria</p>
                        <p className="text-slate-500 text-xs">
                          Try resetting filters or searching for another term.
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            setSeverityFilter('')
                            setStatusFilter('')
                            setOverdueOnly(false)
                            setSelectedCategory('All')
                          }}
                          className="mt-2 text-xs text-minsos-600 font-bold hover:underline"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredItems.map((item) => {
                    const isOverdue =
                      item.status !== 'Resolved' && item.deadline && new Date(item.deadline).getTime() < Date.now()
                    const risk = calculateRiskScore(item)

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/90 transition-colors group">
                        {/* Title & Category */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <button
                              onClick={() => setDetailItem(item)}
                              className="text-left font-bold text-slate-900 group-hover:text-minsos-600 transition text-sm flex items-center gap-1.5"
                            >
                              <span>{item.title}</span>
                            </button>
                            <p className="text-slate-500 text-xs line-clamp-1 max-w-sm">
                              {item.description || 'Statutory breach observation noted.'}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 text-[11px] font-semibold">
                                {item.category || 'General Safety'}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                ID: {item.id.slice(-6).toUpperCase()}
                              </span>
                              {item.evidenceCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-minsos-800 bg-minsos-50 border border-minsos-200 px-1.5 py-0.5 rounded font-medium">
                                  📎 {item.evidenceCount} Proof
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Mine & Inspection */}
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-800 text-sm">{item.mine}</p>
                          {item.inspectionId ? (
                            <Link
                              to={`../inspections/${item.inspectionId}`}
                              className="text-xs text-minsos-600 hover:text-minsos-800 hover:underline inline-flex items-center gap-1 mt-0.5 font-mono"
                            >
                              <InspectionsIcon className="w-3 h-3" />
                              <span>Insp #{item.inspectionId.slice(-6).toUpperCase()}</span>
                            </Link>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Direct Field Observation</span>
                          )}
                        </td>

                        {/* Severity & Risk Index */}
                        <td className="px-4 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <StatusBadge value={item.severity} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  risk.color === 'rose'
                                    ? 'bg-rose-100 text-rose-800'
                                    : risk.color === 'amber'
                                    ? 'bg-amber-100 text-amber-800'
                                    : risk.color === 'blue'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                Risk: {risk.score} / 10
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assignee & Deadline */}
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-800 text-xs">{item.assignedTo}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-slate-500 text-xs">Due: {item.deadline}</span>
                            {isOverdue ? (
                              <span className="bg-rose-100 text-rose-700 font-extrabold text-[10px] px-1.5 py-0.5 rounded uppercase animate-pulse">
                                Overdue
                              </span>
                            ) : (
                              item.status !== 'Resolved' && (
                                <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                  In SLA
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* Workflow Progression Stepper */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <StatusBadge value={item.status} />
                            <div className="flex items-center gap-1 mt-1">
                              <div
                                className={`h-1.5 w-6 rounded-full ${
                                  item.status === 'Open' || item.status === 'Under review' || item.status === 'Resolved'
                                    ? 'bg-rose-500'
                                    : 'bg-slate-200'
                                }`}
                                title="1. Open Breach Logged"
                              />
                              <div
                                className={`h-1.5 w-6 rounded-full ${
                                  item.status === 'Under review' || item.status === 'Resolved'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-200'
                                }`}
                                title="2. Under Field Rectification"
                              />
                              <div
                                className={`h-1.5 w-6 rounded-full ${
                                  item.status === 'Resolved' ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                                title="3. DGMS Sign-off Cleared"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.status === 'Open'
                                ? 'Stage 1: Open'
                                : item.status === 'Under review'
                                ? 'Stage 2: Rectifying'
                                : 'Stage 3: Resolved'}
                            </span>
                          </div>
                        </td>

                        {/* Actions & Upgrade */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => setDetailItem(item)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                              title="View Full Violation Details & Evidence"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* UPGRADE / ESCALATE BUTTON */}
                            {canManage && item.status !== 'Resolved' && (
                              <button
                                onClick={() => setUpgradeItem(item)}
                                className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:shadow transition transform active:scale-95"
                                title="Upgrade Violation Severity / Escalate to DGMS"
                              >
                                <UpgradeIcon className="w-3.5 h-3.5" />
                                <span>Upgrade</span>
                              </button>
                            )}

                            {/* UPDATE STATUS BUTTON */}
                            {canManage && (
                              <button
                                onClick={() => setStatusItem(item)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 ${
                                  item.status === 'Resolved'
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                    : item.status === 'Under review'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                                    : 'bg-gradient-to-r from-minsos-600 to-blue-700 hover:from-minsos-700 hover:to-blue-800 text-white'
                                }`}
                              >
                                <span>
                                  {item.status === 'Resolved'
                                    ? 'Sign-Off Notes'
                                    : item.status === 'Under review'
                                    ? 'Verify & Resolve'
                                    : 'Update Status'}
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* VIEW MODE 2: Kanban Pipeline View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Open Infractions */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <h3 className="font-bold text-slate-900 text-sm">Open Breaches</h3>
              </div>
              <span className="bg-rose-100 text-rose-800 font-extrabold text-xs px-2 py-0.5 rounded-full">
                {filteredItems.filter((i) => i.status === 'Open').length}
              </span>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {filteredItems
                .filter((i) => i.status === 'Open')
                .map((item) => (
                  <KanbanViolationCard
                    key={item.id}
                    item={item}
                    onView={() => setDetailItem(item)}
                    onUpgrade={() => setUpgradeItem(item)}
                    onUpdate={() => setStatusItem(item)}
                    canManage={canManage}
                  />
                ))}
              {filteredItems.filter((i) => i.status === 'Open').length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">No open violations</div>
              )}
            </div>
          </div>

          {/* Column 2: Under Review & Rectification */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Under Review & Remediation</h3>
              </div>
              <span className="bg-amber-100 text-amber-800 font-extrabold text-xs px-2 py-0.5 rounded-full">
                {filteredItems.filter((i) => i.status === 'Under review').length}
              </span>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {filteredItems
                .filter((i) => i.status === 'Under review')
                .map((item) => (
                  <KanbanViolationCard
                    key={item.id}
                    item={item}
                    onView={() => setDetailItem(item)}
                    onUpgrade={() => setUpgradeItem(item)}
                    onUpdate={() => setStatusItem(item)}
                    canManage={canManage}
                  />
                ))}
              {filteredItems.filter((i) => i.status === 'Under review').length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">No violations under review</div>
              )}
            </div>
          </div>

          {/* Column 3: DGMS Verified & Resolved */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-slate-900 text-sm">DGMS Resolved & Cleared</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2 py-0.5 rounded-full">
                {filteredItems.filter((i) => i.status === 'Resolved').length}
              </span>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {filteredItems
                .filter((i) => i.status === 'Resolved')
                .map((item) => (
                  <KanbanViolationCard
                    key={item.id}
                    item={item}
                    onView={() => setDetailItem(item)}
                    onUpgrade={() => setUpgradeItem(item)}
                    onUpdate={() => setStatusItem(item)}
                    canManage={canManage}
                  />
                ))}
              {filteredItems.filter((i) => i.status === 'Resolved').length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">No resolved violations yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: UPGRADE SEVERITY & ESCALATION MODAL */}
      {upgradeItem && (
        <UpgradeViolationModal
          item={upgradeItem}
          onClose={() => setUpgradeItem(null)}
          onUpgraded={(updated) => {
            setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
            setSuccess(`Violation ${updated.id} successfully upgraded to ${updated.severity} severity.`)
            setUpgradeItem(null)
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* MODAL 2: UPDATE STATUS & REMEDIATION WORKFLOW MODAL */}
      {statusItem && (
        <UpdateStatusModal
          item={statusItem}
          onClose={() => setStatusItem(null)}
          onUpdated={(updated) => {
            setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
            setSuccess(`Violation ${updated.id} workflow status updated to ${updated.status}.`)
            setStatusItem(null)
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* MODAL 3: RECORD NEW VIOLATION MODAL */}
      {showCreateModal && (
        <CreateViolationModal
          onCreated={() => {
            setShowCreateModal(false)
            setSuccess('Statutory infraction recorded successfully in database.')
            loadData()
          }}
          onClose={() => setShowCreateModal(false)}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* MODAL 4: VIOLATION DETAILS & EVIDENCE DRAWER */}
      {detailItem && (
        <ViolationDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onOpenUpgrade={(item) => {
            setDetailItem(null)
            setUpgradeItem(item)
          }}
          onOpenUpdate={(item) => {
            setDetailItem(null)
            setStatusItem(item)
          }}
          canManage={canManage}
        />
      )}
    </div>
  )
}

/* =========================================================================
   KANBAN VIOLATION CARD COMPONENT
   ========================================================================= */
function KanbanViolationCard({
  item,
  onView,
  onUpgrade,
  onUpdate,
  canManage
}: {
  item: WorkflowViolation
  onView: () => void
  onUpgrade: () => void
  onUpdate: () => void
  canManage: boolean
}) {
  const isOverdue = item.status !== 'Resolved' && item.deadline && new Date(item.deadline).getTime() < Date.now()

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {item.category}
        </span>
        <StatusBadge value={item.severity} />
      </div>

      <div>
        <button
          onClick={onView}
          className="text-left font-bold text-slate-900 hover:text-minsos-600 text-sm leading-snug line-clamp-2"
        >
          {item.title}
        </button>
        <p className="text-slate-500 text-xs line-clamp-2 mt-1">{item.description}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
        <span className="font-semibold">{item.mine}</span>
        <span className="font-medium text-slate-500">{item.assignedTo}</span>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1">
        <span className="text-slate-500">Due: {item.deadline}</span>
        {isOverdue && (
          <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.2 rounded uppercase">
            Overdue
          </span>
        )}
      </div>

      {item.evidenceCount > 0 && (
        <div className="text-[11px] text-minsos-700 bg-minsos-50 px-2 py-1 rounded font-medium flex items-center gap-1">
          <span>📎 {item.evidenceCount} Photographic Evidence</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
        <button
          onClick={onView}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-semibold"
        >
          View
        </button>
        {canManage && item.status !== 'Resolved' && (
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-2.5 py-1 rounded text-xs font-bold shadow-2xs"
            title="Upgrade Severity"
          >
            <UpgradeIcon className="w-3 h-3" />
            <span>Upgrade</span>
          </button>
        )}
        {canManage && (
          <button
            onClick={onUpdate}
            className="bg-minsos-600 hover:bg-minsos-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-2xs"
          >
            {item.status === 'Resolved' ? 'Review' : 'Advance'}
          </button>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   MODAL 1: UPGRADE SEVERITY & ESCALATION MODAL
   ========================================================================= */
function UpgradeViolationModal({
  item,
  onClose,
  onUpgraded,
  onError
}: {
  item: WorkflowViolation
  onClose: () => void
  onUpgraded: (item: WorkflowViolation) => void
  onError: (msg: string) => void
}) {
  const [targetSeverity, setTargetSeverity] = useState<Severity>(
    item.severity === 'Critical' ? 'Critical' : item.severity === 'High' ? 'Critical' : 'High'
  )
  const [escalationReason, setEscalationReason] = useState(
    'Field inspection confirms condition worsening or repeated breach. Elevating statutory hazard severity level under DGMS norms.'
  )
  const [statutoryNotice, setStatutoryNotice] = useState('DGMS Coal Mines Regulations 2017 Reg 106')
  const [notifyRegulator, setNotifyRegulator] = useState(true)
  const [busy, setBusy] = useState(false)

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setBusy(true)
      const res = await workflowService.updateViolation(item.id, {
        severity: targetSeverity.toLowerCase(),
        description: `${item.description}\n\n[ESCALATION LOG ${new Date().toLocaleDateString()}]: Upgraded to ${targetSeverity}. Citation: ${statutoryNotice}. Reason: ${escalationReason}`
      })

      const updated = {
        ...item,
        severity: targetSeverity,
        description: (res.data as { description?: string })?.description || item.description
      }
      onUpgraded(updated)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      onError(msg || 'Unable to upgrade violation severity. Please check permissions.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white p-6 border border-slate-200 rounded-2xl shadow-2xl space-y-5">
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <UpgradeIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Statutory Hazard Escalation
              </span>
              <h2 className="font-extrabold text-slate-900 text-lg">Upgrade Violation Severity</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm p-1">
            ✕
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
          <p className="font-bold text-slate-800 text-sm">{item.title}</p>
          <p className="text-slate-500">
            {item.mine} · {item.category} · Current Severity:{' '}
            <strong className="text-slate-700">{item.severity}</strong>
          </p>
        </div>

        <form onSubmit={handleUpgrade} className="space-y-4">
          {/* Target Severity Selection */}
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1.5">
              Select Upgraded Severity Level *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetSeverity('Medium')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                  targetSeverity === 'Medium'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Medium Risk
              </button>
              <button
                type="button"
                onClick={() => setTargetSeverity('High')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                  targetSeverity === 'High'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                High Priority
              </button>
              <button
                type="button"
                onClick={() => setTargetSeverity('Critical')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                  targetSeverity === 'Critical'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-600/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                ⚡ Critical (Stop-Work)
              </button>
            </div>
            {targetSeverity === 'Critical' && (
              <p className="mt-2 text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                🚨 Upgrading to Critical will trigger an immediate DGMS Stop-Work notification across all operational command consoles.
              </p>
            )}
          </div>

          {/* Statutory Notice Citation */}
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1">
              Statutory Regulation or Section 22 Reference
            </label>
            <select
              value={statutoryNotice}
              onChange={(e) => setStatutoryNotice(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-minsos-500"
            >
              <option value="CMR 2017 Reg 106 - Bench Height & Slope Stability">
                CMR 2017 Reg 106 - Bench Height & Slope Stability
              </option>
              <option value="DGMS Section 22(1A) - Imminent Danger Stop-Work Order">
                DGMS Section 22(1A) - Imminent Danger Stop-Work Order
              </option>
              <option value="CMR 2017 Reg 130 - Mine Ventilation Standards">
                CMR 2017 Reg 130 - Mine Ventilation Standards
              </option>
              <option value="Central Electricity Authority (Mines) Reg 2010">
                Central Electricity Authority (Mines) Reg 2010
              </option>
              <option value="PESO Explosives Rules 2008 / Magazine Security">
                PESO Explosives Rules 2008 / Magazine Security
              </option>
            </select>
          </div>

          {/* Escalation Reason */}
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1">
              Escalation Rationale & Field Justification *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe why this violation is being upgraded (e.g. fissure widening, water ingress, methane spike)..."
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500 focus:outline-none"
            />
          </div>

          {/* Alert Broadcast Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notifyRegulator"
              checked={notifyRegulator}
              onChange={(e) => setNotifyRegulator(e.target.checked)}
              className="rounded border-slate-300 text-minsos-600 focus:ring-minsos-500"
            />
            <label htmlFor="notifyRegulator" className="text-xs text-slate-700 font-medium">
              Broadcast critical escalation alert to Mine Manager & Safety Directorate
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-50 px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 px-5 py-2 rounded-xl font-bold text-white text-sm shadow-md transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Escalating...</span>
                </>
              ) : (
                <>
                  <UpgradeIcon className="w-4 h-4" />
                  <span>Confirm & Upgrade Severity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================================
   MODAL 2: UPDATE WORKFLOW STATUS MODAL
   ========================================================================= */
function UpdateStatusModal({
  item,
  onClose,
  onUpdated,
  onError
}: {
  item: WorkflowViolation
  onClose: () => void
  onUpdated: (item: WorkflowViolation) => void
  onError: (msg: string) => void
}) {
  const [targetStatus, setTargetStatus] = useState<'open' | 'under_review' | 'resolved'>(
    item.status === 'Open' ? 'under_review' : 'resolved'
  )
  const [closureReason, setClosureReason] = useState(
    item.status === 'Open'
      ? 'Field inspection underway. Corrective machinery and strata teams dispatched.'
      : 'Corrective measures physically verified and completed. Conditions restored to DGMS norms.'
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [updating, setUpdating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUpdating(true)

      const evidenceList: Array<Record<string, unknown>> = []
      if (selectedFile) {
        const uploadRes = await workflowService.uploadEvidence(selectedFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.updateViolation(item.id, {
        status: targetStatus,
        closureReason: targetStatus === 'resolved' ? (closureReason.trim() || 'Resolved under verified DGMS standards.') : undefined,
        ...(evidenceList.length > 0 ? { evidence: evidenceList } : {})
      })

      const displayStatus =
        targetStatus === 'resolved' ? 'Resolved' : targetStatus === 'under_review' ? 'Under review' : 'Open'
      const updatedItem: WorkflowViolation = {
        ...item,
        status: displayStatus,
        closureReason: targetStatus === 'resolved' ? closureReason : item.closureReason,
        evidenceCount: item.evidenceCount + evidenceList.length
      }

      onUpdated(updatedItem)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      onError(msg || 'Unable to update status. Please check permissions or required corrective actions.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white p-6 border border-slate-200 rounded-2xl shadow-2xl space-y-5">
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-minsos-600">
              Workflow Status Progression
            </span>
            <h2 className="font-extrabold text-slate-900 text-lg">{item.title}</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {item.mine} · {item.category}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Status Radios */}
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1.5">
              Select Target Workflow Status *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetStatus('open')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                  targetStatus === 'open'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                1. Open
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('under_review')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                  targetStatus === 'under_review'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                2. Under Review
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('resolved')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                  targetStatus === 'resolved'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                3. Resolved & Cleared
              </button>
            </div>
          </div>

          {/* Remediation Evidence Upload */}
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1">
              Attach Photographic Rectification Proof (.png, .jpg, .pdf)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-700 text-xs"
            />
            {selectedFile && (
              <p className="mt-1 text-slate-500 text-xs">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Remediation Notes / Closure Reason */}
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1">
              Remediation Notes & DGMS Closure Remarks {targetStatus === 'resolved' ? '*' : '(Optional)'}
            </label>
            <textarea
              rows={3}
              required={targetStatus === 'resolved'}
              placeholder="Detail on-site corrective measures, strata measurements, or verification notes..."
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {targetStatus === 'resolved'
                ? 'Required by DGMS guidelines. Recorded immutably in the system audit trail.'
                : 'Progress notes for inspection team and shift incharge.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-50 px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="bg-minsos-600 hover:bg-minsos-700 px-5 py-2 rounded-xl font-bold text-white text-sm shadow-md transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              {updating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Confirm & Update Status</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================================
   MODAL 3: CREATE VIOLATION MODAL
   ========================================================================= */
function CreateViolationModal({
  onCreated,
  onClose,
  onError
}: {
  onCreated: () => void
  onClose: () => void
  onOpen?: () => void
  onError: (msg: string) => void
}) {
  const [inspections, setInspections] = useState<WorkflowInspection[]>([])
  const [users, setUsers] = useState<WorkflowLookup[]>([])
  const [inspectionId, setInspectionId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Strata Control')
  const [severity, setSeverity] = useState<Severity>('Medium')
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    workflowService
      .inspections()
      .then((res) => {
        setInspections(res.data)
        if (res.data.length > 0) setInspectionId(res.data[0].id)
      })
      .catch(() => onError('Unable to load inspections.'))

    workflowService
      .users()
      .then((res) => {
        setUsers(res)
        if (res.length > 0) setAssignedTo(res[0].id)
      })
      .catch(() => undefined)
  }, [onError])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectionId || !assignedTo || !title.trim() || !description.trim()) {
      alert('Please fill out all required fields.')
      return
    }

    try {
      setBusy(true)
      const evidenceList: Array<Record<string, unknown>> = []
      if (selectedFile) {
        const uploadRes = await workflowService.uploadEvidence(selectedFile)
        evidenceList.push(uploadRes.evidence)
      }

      await workflowService.createViolation({
        inspectionId,
        assignedTo,
        title: title.trim(),
        description: description.trim(),
        category,
        severity: severity.toLowerCase(),
        deadline: new Date(deadline).toISOString(),
        evidence: evidenceList
      })

      onCreated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      onError(msg || 'Unable to record statutory violation. Please verify server connectivity.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white p-6 border border-slate-200 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Statutory Non-Compliance Register
            </span>
            <h2 className="font-extrabold text-slate-900 text-lg">Record Statutory Violation</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm p-1">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="block font-bold text-slate-700 text-xs">Violation Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Unanchored Overburden Bench at Haul Road Cut"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500 focus:outline-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 text-xs">Linked Inspection *</label>
              <select
                value={inspectionId}
                onChange={(e) => setInspectionId(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
              >
                <option value="">Select Inspection</option>
                {inspections.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    #{insp.id.slice(-6).toUpperCase()} · {insp.mine} ({insp.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 text-xs">Assigned Rectification Lead *</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
              >
                <option value="">Select Assignee</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role || 'Officer'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 text-xs">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
              >
                <option value="Strata Control">Strata Control</option>
                <option value="Ventilation Standard">Ventilation Standard</option>
                <option value="Electrical Safety">Electrical Safety</option>
                <option value="Haulage & Machinery">Haulage & Machinery</option>
                <option value="Explosives & Blasting">Explosives & Blasting</option>
                <option value="DGMS Statutory">DGMS Statutory</option>
                <option value="Dust & Environmental">Dust & Environmental</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 text-xs">Severity Level *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
                <option value="Critical">Critical (Immediate Stop-Work)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 text-xs">Remediation Deadline *</label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 text-xs">
              Detailed Observation & Statutory Breach Description *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe physical defect, regulation breached (e.g. DGMS Reg 106), location and required remedy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-minsos-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 text-xs">
              Photographic Evidence Attachment (.png, .jpg, .pdf)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-700 text-xs"
            />
            {selectedFile && (
              <p className="mt-1 text-slate-500 text-xs">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-50 px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-minsos-600 hover:bg-minsos-700 px-5 py-2 rounded-xl font-bold text-white text-sm shadow-md transition disabled:opacity-50"
            >
              {busy ? 'Saving Violation...' : 'Record Violation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================================
   MODAL 4: VIOLATION DETAIL & EVIDENCE DRAWER
   ========================================================================= */
function ViolationDetailModal({
  item,
  onClose,
  onOpenUpgrade,
  onOpenUpdate,
  canManage
}: {
  item: WorkflowViolation
  onClose: () => void
  onOpenUpgrade: (item: WorkflowViolation) => void
  onOpenUpdate: (item: WorkflowViolation) => void
  canManage: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white p-6 border border-slate-200 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 text-xs uppercase tracking-wider">{item.mine}</span>
              <StatusBadge value={item.severity} />
              <StatusBadge value={item.status} />
            </div>
            <h2 className="mt-1 font-extrabold text-slate-900 text-xl">{item.title}</h2>
            <p className="text-slate-400 font-mono text-xs mt-0.5">Record ID: {item.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm p-1">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="font-bold text-slate-500 text-xs uppercase tracking-wider">Statutory Breach Description</p>
            <p className="mt-1 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {item.description || 'No detailed narrative provided.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400">Category:</span>
              <p className="font-bold text-slate-800 mt-0.5">{item.category}</p>
            </div>
            <div>
              <span className="text-slate-400">Assigned Rectification Lead:</span>
              <p className="font-bold text-slate-800 mt-0.5">{item.assignedTo}</p>
            </div>
            <div>
              <span className="text-slate-400">Statutory Deadline:</span>
              <p className="font-bold text-slate-800 mt-0.5">{item.deadline}</p>
            </div>
            <div>
              <span className="text-slate-400">Linked Inspection:</span>
              <p className="font-bold text-slate-800 mt-0.5 font-mono">
                {item.inspectionId ? `#${item.inspectionId.slice(-6).toUpperCase()}` : 'Direct Field Notice'}
              </p>
            </div>
          </div>

          {/* Closure Reason (if resolved) */}
          {item.closureReason && (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-emerald-800 uppercase tracking-wider">
                ✓ Verified DGMS Closure & Remediation Sign-Off:
              </span>
              <p className="text-emerald-900 leading-relaxed">{item.closureReason}</p>
            </div>
          )}

          {/* Photographic Evidence Gallery */}
          {item.evidence && item.evidence.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                Attached Photographic & Digital Evidence ({item.evidence.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.evidence.map((ev, idx) => {
                  const fileUrl = ev.url || `http://localhost:5000/api/uploads/${ev.storageKey}`
                  const isImage =
                    ev.mimeType?.startsWith('image/') || ev.fileName?.match(/\.(png|jpe?g|webp|gif)$/i)
                  return (
                    <div
                      key={ev.id || idx}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden shadow-2xs"
                    >
                      {isImage ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-lg aspect-video bg-slate-200"
                        >
                          <img
                            src={fileUrl}
                            alt={ev.fileName}
                            className="w-full h-full object-cover hover:scale-105 transition"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = `http://localhost:5000/uploads/${ev.storageKey}`
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-100 aspect-video text-slate-500 hover:text-minsos-600"
                        >
                          <span className="text-xl">📄</span>
                          <span className="text-[10px] mt-1 font-bold truncate max-w-full">PDF Document</span>
                        </a>
                      )}
                      <p className="font-medium text-slate-800 text-[11px] truncate mt-1.5" title={ev.fileName}>
                        {ev.fileName}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
          {canManage && item.status !== 'Resolved' && (
            <button
              onClick={() => onOpenUpgrade(item)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <UpgradeIcon className="w-3.5 h-3.5" />
              <span>Upgrade Severity</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => onOpenUpdate(item)}
              className="bg-minsos-600 hover:bg-minsos-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
            >
              Update Status
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
