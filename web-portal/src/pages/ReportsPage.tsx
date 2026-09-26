import { useEffect, useMemo, useState } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService, type WorkflowLookup } from '../services/workflow'
import type { ComplianceAuditReport, DetailedReportResponse, SummaryReport } from '../types'

type ReportCategory =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'compliance'
  | 'inspection'
  | 'safety'
  | 'environmental'
  | 'contractor'
  | 'incident'
  | 'summary'
  | 'audit'

interface ReportTypeMeta {
  id: ReportCategory
  title: string
  subtitle: string
  icon: string
  badge: string
}

const REPORT_CATALOG: ReportTypeMeta[] = [
  { id: 'daily', title: 'Daily Mine Report', subtitle: 'Shift operations, gas telemetry & active shift in-charge logs', icon: '⏱️', badge: 'Daily' },
  { id: 'weekly', title: 'Weekly Report', subtitle: 'Weekly safety walkthroughs, shift rosters & equipment checks', icon: '📅', badge: 'Weekly' },
  { id: 'monthly', title: 'Monthly Report', subtitle: 'DGMS monthly adherence, production output & contractor ratio', icon: '📊', badge: 'Monthly' },
  { id: 'compliance', title: 'Compliance Report', subtitle: 'DGMS clearances, PESO licenses, water & air approvals', icon: '📜', badge: 'Statutory' },
  { id: 'inspection', title: 'Inspection Report', subtitle: 'Internal audits, DGMS inspector visits & formal inquiries', icon: '🔍', badge: 'Audits' },
  { id: 'safety', title: 'Safety Report', subtitle: 'Hazard remediation status, strata bolting & gas telemetry', icon: '🦺', badge: 'Safety' },
  { id: 'environmental', title: 'Environmental Report', subtitle: 'Dust suppression, effluent pH levels & air AQI scores', icon: '🌱', badge: 'Eco' },
  { id: 'contractor', title: 'Contractor Report', subtitle: 'Third-party vendor compliance, workforce counts & insurance', icon: '👷', badge: 'Vendors' },
  { id: 'incident', title: 'Incident Report', subtitle: 'Near-misses, unplanned equipment failures & lost-time injuries', icon: '⚠️', badge: 'Incidents' },
  { id: 'summary', title: 'Executive Safety Summary', subtitle: 'CIL board-level key performance metrics and overview', icon: '🏢', badge: 'Executive' },
  { id: 'audit', title: 'DGMS Statutory Audit Report', subtitle: 'Formal regulatory filing sheet with dual-officer signoff', icon: '📑', badge: 'Legal' }
]

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportCategory>('daily')
  const [mines, setMines] = useState<WorkflowLookup[]>([])
  const [selectedMineId, setSelectedMineId] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  // Data states
  const [detailedData, setDetailedData] = useState<DetailedReportResponse | null>(null)
  const [summaryData, setSummaryData] = useState<SummaryReport | null>(null)
  const [auditData, setAuditData] = useState<ComplianceAuditReport | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load mines lookup
  useEffect(() => {
    workflowService.mines().then((m) => {
      setMines(m)
      if (m.length > 0) setSelectedMineId(m[0].id)
    }).catch(() => undefined)
  }, [])

  // Load active report
  const loadReports = async () => {
    try {
      setLoading(true)
      setError('')

      if (selectedReport === 'summary') {
        const sum = await workflowService.summaryReport({
          mineId: selectedMineId || undefined
        })
        setSummaryData(sum)
      } else if (selectedReport === 'audit') {
        const audit = await workflowService.complianceAuditReport(selectedMineId || undefined)
        setAuditData(audit)
      } else {
        const det = await workflowService.detailedReport(selectedReport, selectedMineId || undefined)
        setDetailedData(det)
      }
    } catch {
      setError('Unable to load statutory report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [selectedReport, selectedMineId])

  // Filtered rows for detailed reports
  const filteredRows = useMemo(() => {
    if (!detailedData || !detailedData.rows) return []
    if (!searchFilter.trim()) return detailedData.rows
    const q = searchFilter.toLowerCase()
    return detailedData.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    )
  }, [detailedData, searchFilter])

  // Excel / CSV Export utility
  const exportToExcel = () => {
    if (selectedReport === 'summary' && summaryData) {
      const csvRows = [
        ['MINSOS - Executive Safety Summary Report'],
        ['Generated At', new Date(summaryData.generatedAt).toLocaleString()],
        ['Total Monitored Mines', summaryData.totalMines],
        [''],
        ['METRIC', 'COMPLETED / COMPLIANT', 'TOTAL / SCHEDULED', 'OVERDUE / CRITICAL'],
        ['Inspections', summaryData.inspections.completed, summaryData.inspections.total, '-'],
        ['Violations (Critical)', summaryData.violations.bySeverity.critical, summaryData.violations.total, summaryData.violations.bySeverity.critical],
        ['Corrective Actions', summaryData.actions.completed, summaryData.actions.total, summaryData.actions.overdue],
        ['Statutory Compliance', summaryData.statutoryCompliance.compliant, summaryData.statutoryCompliance.totalRequirements, summaryData.statutoryCompliance.overdue],
        ['Incidents (Active)', summaryData.incidents.active, summaryData.incidents.total, summaryData.incidents.critical]
      ]
      downloadCsv(csvRows, `MINSOS_Executive_Summary_${Date.now()}.csv`)
      return
    }

    if (selectedReport === 'audit' && auditData) {
      const csvRows = [
        ['MINSOS - DGMS Statutory Safety & Compliance Audit Sheet'],
        ['Report Number', auditData.reportNumber],
        ['Mine Site', `${auditData.mineDetails.name} (${auditData.mineDetails.code})`],
        ['Location', auditData.mineDetails.location],
        ['Statutory Compliance %', `${auditData.metrics.compliancePercentage}%`],
        ['Risk Score', `${auditData.metrics.systemRiskScore} / 100 (${auditData.metrics.riskLevel})`],
        ['Critical Violations', auditData.metrics.criticalViolations],
        ['Overdue Actions', auditData.metrics.overdueActions],
        [''],
        ['1. STATUTORY CLEARANCES'],
        ['Requirement', 'Category', 'Due Date', 'Expiry Date', 'Status', 'Responsible Person'],
        ...auditData.statutoryClearances.map((c) => [
          c.requirement,
          c.category,
          new Date(c.dueDate).toLocaleDateString(),
          new Date(c.expiryDate).toLocaleDateString(),
          c.status.toUpperCase(),
          c.responsiblePerson
        ]),
        [''],
        ['2. UNRESOLVED VIOLATIONS'],
        ['Violation', 'Category', 'Severity', 'Deadline', 'Assignee', 'Status'],
        ...auditData.unresolvedViolations.map((v) => [
          v.title,
          v.category,
          v.severity.toUpperCase(),
          new Date(v.deadline).toLocaleDateString(),
          v.assignee,
          v.status
        ])
      ]
      downloadCsv(csvRows, `MINSOS_Audit_${auditData.mineDetails.code}_${Date.now()}.csv`)
      return
    }

    if (detailedData) {
      const headers = detailedData.columns.map((c) => c.label)
      const keys = detailedData.columns.map((c) => c.key)
      const dataRows = (detailedData.rows || []).map((row) =>
        keys.map((k) => String(row[k] ?? ''))
      )

      const csvRows = [
        [`MINSOS - ${detailedData.title}`],
        ['Cadence / Category', detailedData.cadenceOrCategory],
        ['Mine Site', `${detailedData.mineName} (${detailedData.mineCode})`],
        ['Generated At', new Date(detailedData.generatedAt).toLocaleString()],
        [''],
        ['KEY PERFORMANCE INDICATORS'],
        ...detailedData.summaryKpis.map((kpi) => [kpi.label, String(kpi.value)]),
        [''],
        headers,
        ...dataRows
      ]
      downloadCsv(csvRows, `MINSOS_${selectedReport}_Report_${detailedData.mineCode}_${Date.now()}.csv`)
    }
  }

  const downloadCsv = (rows: Array<Array<string | number>>, filename: string) => {
    const csvContent =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map((val) => {
              const str = String(val ?? '').replace(/"/g, '""')
              return `"${str}"`
            })
            .join(',')
        )
        .join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeMeta = REPORT_CATALOG.find((r) => r.id === selectedReport) ?? REPORT_CATALOG[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 16 · DGMS Statutory Engine
            </span>
            <span className="text-slate-400 text-xs">Coal India Limited</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Governance & Statutory Reports
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Generate, verify, and export official statutory reports with one-click PDF & Excel formatting.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMineId}
            onChange={(e) => setSelectedMineId(e.target.value)}
            className="bg-white px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm shadow-xs focus:ring-2 focus:ring-minsos-500"
          >
            <option value="">All Subsidiary Coalfields</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label ?? m.name}
              </option>
            ))}
          </select>

          {/* Excel Export Button */}
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-xs transition active:scale-95"
            title="Export full data matrix to Excel (.csv)"
          >
            📥 Export Excel
          </button>

          {/* PDF Export Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-xs transition active:scale-95"
            title="Print or Save official PDF document"
          >
            🖨 Export PDF
          </button>
        </div>
      </div>

      {/* 9 Report Types Catalog Selector (Scrollable Horizontal Grid) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs print:hidden">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Statutory Report Type ({REPORT_CATALOG.length} Formats Available)
          </span>
          <span className="text-xs text-minsos-600 font-medium">
            Active: {activeMeta.title}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2">
          {REPORT_CATALOG.map((item) => {
            const isSelected = selectedReport === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSelectedReport(item.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition border ${
                  isSelected
                    ? 'bg-minsos-900 text-white border-minsos-900 shadow-md ring-2 ring-minsos-600/30'
                    : 'bg-slate-50 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="mt-1 font-semibold text-xs leading-tight line-clamp-2">
                  {item.title.replace(' Report', '')}
                </span>
                <span
                  className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-mono uppercase ${
                    isSelected
                      ? 'bg-minsos-800 text-minsos-100'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 border border-slate-200 rounded-2xl text-center space-y-3 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-minsos-600 border-t-transparent" />
          <p className="text-slate-600 font-medium text-sm">
            Retrieving & compiling statutory {activeMeta.title}...
          </p>
          <p className="text-slate-400 text-xs">
            Grounded directly against Coal India & DGMS regulatory records
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETAILED STATUTORY REPORT VIEW (9 STANDARD REPORTS)           */}
      {/* ============================================================ */}
      {!loading && selectedReport !== 'summary' && selectedReport !== 'audit' && detailedData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Printable Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src="/logo.jpeg" alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200 print:w-12 print:h-12" />
              <div>
                <span className="text-[11px] font-bold tracking-widest text-minsos-700 uppercase">
                  MINISTRY OF COAL · COAL INDIA LIMITED · DGMS COMPLIANT
                </span>
                <h2 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                  {detailedData.title}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Scope: {detailedData.mineName} ({detailedData.mineCode}) · {detailedData.cadenceOrCategory}
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="inline-block bg-slate-100 text-slate-800 font-mono font-bold px-2 py-1 rounded border border-slate-300">
                {detailedData.dgmsReference ?? `DGMS-REF-${detailedData.mineCode}-${Date.now().toString().slice(-6)}`}
              </span>
              <p className="text-slate-500 mt-1">
                Generated: {new Date(detailedData.generatedAt).toLocaleString()}
              </p>
              <p className="text-emerald-700 font-semibold mt-0.5">✓ Statutory Verified</p>
            </div>
          </div>

          {/* Key Metric KPI Cards */}
          {detailedData.summaryKpis && detailedData.summaryKpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
              {detailedData.summaryKpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    kpi.status === 'critical'
                      ? 'bg-red-50/80 border-red-200 text-red-950'
                      : kpi.status === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Filter Bar (Hidden in Print) */}
          <div className="flex items-center justify-between gap-4 pt-2 print:hidden">
            <div className="relative max-w-sm flex-1">
              <input
                type="text"
                placeholder="Search records in this report..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-minsos-500"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
            <span className="text-slate-400 text-xs">
              Displaying {filteredRows.length} of {detailedData.rows.length} records
            </span>
          </div>

          {/* Tabular Records Matrix */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    {detailedData.columns.map((col) => (
                      <th key={col.key} className="px-4 py-3">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={detailedData.columns.length}
                        className="py-8 text-center text-slate-400"
                      >
                        No records found matching current criteria.
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                      {detailedData.columns.map((col) => {
                        const val = String(row[col.key] ?? '')
                        const isCritical =
                          val.toLowerCase().includes('critical') ||
                          val.toLowerCase().includes('high') ||
                          val.toLowerCase().includes('exceed')
                        const isOk =
                          val.toLowerCase().includes('compliant') ||
                          val.toLowerCase().includes('normal') ||
                          val.toLowerCase().includes('completed') ||
                          val.toLowerCase().includes('closed')
                        return (
                          <td key={col.key} className="px-4 py-3 align-top">
                            <span
                              className={
                                isCritical
                                  ? 'font-semibold text-red-600'
                                  : isOk
                                  ? 'font-medium text-emerald-700'
                                  : 'text-slate-800'
                              }
                            >
                              {val}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dual Statutory Signatures */}
          <div className="border-t-2 border-slate-200 pt-8 mt-10 grid grid-cols-2 gap-12 text-xs">
            <div className="border-t border-slate-400 pt-3 text-center">
              <p className="font-bold text-slate-800">Mine Safety Officer / Colliery Surveyor</p>
              <p className="text-slate-500 mt-0.5">Government Certified DGMS First-Class Competency</p>
              <p className="text-slate-400 text-[10px] mt-1">Official Stamp & Signature</p>
            </div>
            <div className="border-t border-slate-400 pt-3 text-center">
              <p className="font-bold text-slate-800">Agent / General Mine Manager</p>
              <p className="text-slate-500 mt-0.5">Coal India Limited / BCCL / SECL Authority</p>
              <p className="text-slate-400 text-[10px] mt-1">Authorized Executive Signatory</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: EXECUTIVE SAFETY SUMMARY                                */}
      {/* ============================================================ */}
      {!loading && selectedReport === 'summary' && summaryData && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <p className="font-medium text-slate-500 text-xs">Total Inspections</p>
              <p className="mt-2 font-bold text-slate-900 text-3xl">
                {summaryData.inspections.completed} / {summaryData.inspections.total}
              </p>
              <p className="mt-1 text-slate-400 text-xs">Completed vs Total Scheduled</p>
            </article>

            <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <p className="font-medium text-slate-500 text-xs">Critical Violations</p>
              <p className="mt-2 font-bold text-red-600 text-3xl">
                {summaryData.violations.bySeverity.critical}
              </p>
              <p className="mt-1 text-slate-400 text-xs">
                Total Violations: {summaryData.violations.total}
              </p>
            </article>

            <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <p className="font-medium text-slate-500 text-xs">Remediation Progress</p>
              <p className="mt-2 font-bold text-emerald-600 text-3xl">
                {summaryData.actions.completed} / {summaryData.actions.total}
              </p>
              <p className="mt-1 text-red-600 text-xs font-semibold">
                {summaryData.actions.overdue} actions overdue
              </p>
            </article>

            <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
              <p className="font-medium text-slate-500 text-xs">Statutory Compliance</p>
              <p className="mt-2 font-bold text-minsos-600 text-3xl">
                {summaryData.statutoryCompliance.compliant} / {summaryData.statutoryCompliance.totalRequirements}
              </p>
              <p className="mt-1 text-slate-400 text-xs">
                {summaryData.statutoryCompliance.overdue} clearances overdue
              </p>
            </article>
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <SectionCard title="Violations Distribution" subtitle="Broken down by severity and resolution status">
              <div className="space-y-4 pt-2">
                <div className="gap-3 grid grid-cols-4 text-center">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-red-700 text-xs font-semibold">Critical</p>
                    <p className="font-bold text-red-900 text-2xl mt-1">
                      {summaryData.violations.bySeverity.critical}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <p className="text-orange-700 text-xs font-semibold">High</p>
                    <p className="font-bold text-orange-900 text-2xl mt-1">
                      {summaryData.violations.bySeverity.high}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-amber-700 text-xs font-semibold">Medium</p>
                    <p className="font-bold text-amber-900 text-2xl mt-1">
                      {summaryData.violations.bySeverity.medium}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-slate-600 text-xs font-semibold">Low</p>
                    <p className="font-bold text-slate-800 text-2xl mt-1">
                      {summaryData.violations.bySeverity.low}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between text-xs text-slate-600">
                  <span>Open: <strong>{summaryData.violations.byStatus.open}</strong></span>
                  <span>Under Review: <strong>{summaryData.violations.byStatus.under_review}</strong></span>
                  <span>Resolved: <strong className="text-emerald-700">{summaryData.violations.byStatus.resolved}</strong></span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Unplanned Incident Overview" subtitle="Recorded safety events and investigation status">
              <div className="space-y-4 pt-2">
                <div className="gap-3 grid grid-cols-3 text-center">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-red-700 text-xs font-semibold">Critical Incidents</p>
                    <p className="font-bold text-red-900 text-2xl mt-1">
                      {summaryData.incidents.critical}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-amber-700 text-xs font-semibold">Active Inquiries</p>
                    <p className="font-bold text-amber-900 text-2xl mt-1">
                      {summaryData.incidents.active}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <p className="text-emerald-700 text-xs font-semibold">Closed & Remediated</p>
                    <p className="font-bold text-emerald-900 text-2xl mt-1">
                      {summaryData.incidents.closed}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-2">
                  Total incident events logged: <strong>{summaryData.incidents.total}</strong> across monitored sites.
                </p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: DGMS STATUTORY AUDIT REPORT                             */}
      {/* ============================================================ */}
      {!loading && selectedReport === 'audit' && auditData && (
        <div className="bg-white p-8 border border-slate-200 rounded-2xl shadow-xs space-y-6 text-slate-900 print:border-none print:shadow-none">
          {/* Official Letterhead Banner */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src="/logo.jpeg" alt="Logo" className="w-14 h-14 rounded-lg object-cover" />
              <div>
                <h2 className="font-extrabold text-xl tracking-tight text-slate-900">
                  MINISTRY OF COAL / COAL INDIA LIMITED
                </h2>
                <p className="font-bold text-minsos-700 text-sm">{auditData.reportTitle}</p>
                <p className="text-slate-500 text-xs">
                  In Compliance with the Mines Act 1952 & DGMS Safety Directives
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold font-mono text-slate-800">{auditData.reportNumber}</p>
              <p className="text-slate-500 mt-1">Date: {new Date(auditData.generatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Mine Profile & Scorecard */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Mine Site</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">
                {auditData.mineDetails.name} ({auditData.mineDetails.code})
              </p>
              <p className="text-slate-400 mt-0.5">{auditData.mineDetails.location}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Statutory Compliance</p>
              <p className="font-bold text-sm text-emerald-700 mt-0.5">
                {auditData.metrics.compliancePercentage}%
              </p>
              <p className="text-slate-400 mt-0.5">DGMS Inspection Adherence</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">System Risk Score</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">
                {auditData.metrics.systemRiskScore} / 100
              </p>
              <span className="inline-block mt-0.5 font-semibold text-[11px] text-amber-700">
                Tier: {auditData.metrics.riskLevel}
              </span>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Open Non-Compliances</p>
              <p className="font-bold text-sm text-red-600 mt-0.5">
                {auditData.metrics.criticalViolations} Critical Violations
              </p>
              <p className="text-slate-400 mt-0.5">{auditData.metrics.overdueActions} Overdue Actions</p>
            </div>
          </div>

          {/* Statutory Clearances Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              1. Statutory Clearances & Regulatory Obligations
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-2.5">Requirement</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Due Date</th>
                  <th className="p-2.5">Expiry Date</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Responsible Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditData.statutoryClearances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      No statutory clearance records listed.
                    </td>
                  </tr>
                )}
                {auditData.statutoryClearances.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2.5 font-medium text-slate-800">{c.requirement}</td>
                    <td className="p-2.5">{c.category}</td>
                    <td className="p-2.5">{new Date(c.dueDate).toLocaleDateString()}</td>
                    <td className="p-2.5">{new Date(c.expiryDate).toLocaleDateString()}</td>
                    <td className="p-2.5 uppercase font-semibold">{c.status}</td>
                    <td className="p-2.5">{c.responsiblePerson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Active Violations Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              2. Outstanding Statutory Violations
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-2.5">Violation</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Severity</th>
                  <th className="p-2.5">Deadline</th>
                  <th className="p-2.5">Assigned To</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditData.unresolvedViolations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-emerald-700 font-medium">
                      ✓ No outstanding violations recorded for this site.
                    </td>
                  </tr>
                )}
                {auditData.unresolvedViolations.map((v) => (
                  <tr key={v.id}>
                    <td className="p-2.5 font-medium text-slate-800">{v.title}</td>
                    <td className="p-2.5">{v.category}</td>
                    <td className="p-2.5 uppercase font-semibold text-red-600">{v.severity}</td>
                    <td className="p-2.5">{new Date(v.deadline).toLocaleDateString()}</td>
                    <td className="p-2.5">{v.assignee}</td>
                    <td className="p-2.5">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures & Certification */}
          <div className="border-t-2 border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8 text-xs">
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-800">Mine Safety Officer</p>
              <p className="text-slate-400 mt-0.5">Signature & Official Seal</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-800">Agent / Mine Manager</p>
              <p className="text-slate-400 mt-0.5">Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
