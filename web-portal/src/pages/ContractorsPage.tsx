import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { SectionCard, StatusBadge } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { WorkflowContractor, WorkflowLookup } from '../types'

export function ContractorsPage() {
  const { user } = useAuth()
  const isManagerOrAdmin =
    user?.role === 'admin' || user?.role === 'mine_manager' || user?.role === 'safety_officer'

  const [contractors, setContractors] = useState<WorkflowContractor[]>([])
  const [mines, setMines] = useState<WorkflowLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Contractor Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [mineId, setMineId] = useState('')
  const [workType, setWorkType] = useState('Overburden Removal')
  const [safetyRating, setSafetyRating] = useState<number>(85)
  const [activeWorkers, setActiveWorkers] = useState<number>(25)
  const [insuranceExpiry, setInsuranceExpiry] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
  )
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit / Status Update Modal state
  const [editingContractor, setEditingContractor] = useState<WorkflowContractor | null>(null)
  const [editStatus, setEditStatus] = useState<'compliant' | 'pending' | 'suspended'>('compliant')
  const [editRating, setEditRating] = useState<number>(85)
  const [editUpdating, setEditUpdating] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [contRes, mineRes] = await Promise.all([
        workflowService.contractors({ complianceStatus: statusFilter || undefined }),
        workflowService.mines()
      ])
      setContractors(contRes.data)
      setMines(mineRes)
      if (mineRes.length > 0 && !mineId) {
        setMineId(mineRes[0].id)
      }
    } catch {
      setError('Unable to load contractor compliance roster.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      const q = searchQuery.toLowerCase()
      const matchSearch =
        c.companyName.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.workType.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q)
      return matchSearch
    })
  }, [contractors, searchQuery])

  // Aggregate stats
  const totalWorkers = useMemo(() => {
    return contractors.reduce((acc, c) => acc + (c.activeWorkers || 0), 0)
  }, [contractors])

  const compliantRate = useMemo(() => {
    if (contractors.length === 0) return 0
    const compCount = contractors.filter((c) => c.complianceStatus === 'compliant').length
    return Math.round((compCount / contractors.length) * 100)
  }, [contractors])

  const suspendedCount = useMemo(() => {
    return contractors.filter((c) => c.complianceStatus === 'suspended').length
  }, [contractors])

  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName || !contractNumber || !mineId || !workType) {
      alert('Please fill out all required contractor details.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await workflowService.createContractor({
        companyName: companyName.trim(),
        contractNumber: contractNumber.trim().toUpperCase(),
        mineId,
        workType: workType.trim(),
        safetyRating: Number(safetyRating),
        activeWorkers: Number(activeWorkers),
        complianceStatus: 'compliant',
        insuranceExpiry: new Date(insuranceExpiry).toISOString(),
        contactName: contactName.trim() || 'Contractor Supervisor',
        contactPhone: contactPhone.trim() || 'N/A',
        contactEmail: contactEmail.trim() || 'contractor@mine.org'
      })
      setSuccess(`Contractor "${companyName}" enrolled successfully.`)
      setShowAddModal(false)
      setCompanyName('')
      setContractNumber('')
      setContactName('')
      setContactPhone('')
      setContactEmail('')
      loadData()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to enroll contractor.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContractor) return

    try {
      setEditUpdating(true)
      await workflowService.updateContractor(editingContractor._id, {
        complianceStatus: editStatus,
        safetyRating: Number(editRating)
      })
      setSuccess(`Updated status for ${editingContractor.companyName}.`)
      setEditingContractor(null)
      loadData()
    } catch {
      setError('Failed to update contractor record.')
    } finally {
      setEditUpdating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to de-register contractor "${name}"?`)) return

    try {
      await workflowService.deleteContractor(id)
      setSuccess(`Contractor "${name}" removed.`)
      loadData()
    } catch {
      setError('Unable to delete contractor record.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-xs tracking-wider text-minsos-600 uppercase">
            Contractual Oversight & Safety Vetting
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Contractor Compliance Roster & Workforce Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            DGMS safety auditing, statutory insurance tracking, and performance certification for outsource mining agencies.
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-minsos-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-minsos-700"
          >
            <span>+</span> Register New Contractor
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Registered Contractors</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{contractors.length}</p>
          <p className="mt-1 text-xs text-slate-400">DGMS Verified Firms</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Compliance Rate</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{compliantRate}%</p>
          <p className="mt-1 text-xs text-slate-400">Full Audit Cleared</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Outsource Headcount</p>
          <p className="mt-2 text-2xl font-bold text-minsos-600">{totalWorkers}</p>
          <p className="mt-1 text-xs text-slate-400">Active Pit Workers</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Suspended / Barred</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{suspendedCount}</p>
          <p className="mt-1 text-xs text-slate-400">Safety Hold Orders</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search company, contract #, or work type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-minsos-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-minsos-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="pending">Pending Audit</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredContractors.length} active records
        </span>
      </div>

      {/* Contractor Table Card */}
      <SectionCard
        title="Contractor Safety & Compliance Register"
        subtitle="Monitored against DGMS Circular standards & Coal India safety rating guidelines"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Agency Details</th>
                <th className="px-5 py-3">Assigned Mine Site</th>
                <th className="px-5 py-3">Work Scope</th>
                <th className="px-5 py-3 text-center">Safety Rating</th>
                <th className="px-5 py-3 text-center">Workforce</th>
                <th className="px-5 py-3">Statutory Status</th>
                <th className="px-5 py-3">Insurance Expiry</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading contractor compliance records...
                  </td>
                </tr>
              ) : filteredContractors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No contractors found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredContractors.map((c) => {
                  const mine =
                    typeof c.mineId === 'object' && c.mineId !== null
                      ? c.mineId
                      : { name: 'Assigned Site', code: '' }

                  const expiryDate = new Date(c.insuranceExpiry)
                  const isExpiringSoon =
                    expiryDate.getTime() - Date.now() < 30 * 86400000 && expiryDate.getTime() > Date.now()
                  const isExpired = expiryDate.getTime() <= Date.now()

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{c.companyName}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          ID: {c.contractNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {c.contactName} ({c.contactPhone})
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">{mine.name}</span>
                        {mine.code && (
                          <span className="block font-mono text-[10px] text-slate-400">
                            {mine.code}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {c.workType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            c.safetyRating >= 85
                              ? 'text-emerald-600'
                              : c.safetyRating >= 70
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {c.safetyRating}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-800">
                        {c.activeWorkers}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge value={c.complianceStatus} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-mono ${
                            isExpired
                              ? 'font-bold text-red-600'
                              : isExpiringSoon
                              ? 'font-bold text-amber-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {expiryDate.toLocaleDateString()}
                        </span>
                        {isExpired && (
                          <span className="block text-[10px] text-red-500 font-semibold">EXPIRED</span>
                        )}
                        {isExpiringSoon && (
                          <span className="block text-[10px] text-amber-500 font-semibold">&lt; 30 Days</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingContractor(c)
                              setEditStatus(c.complianceStatus)
                              setEditRating(c.safetyRating)
                            }}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Review
                          </button>
                          {isManagerOrAdmin && (
                            <button
                              onClick={() => handleDelete(c._id, c.companyName)}
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Modal: Register Contractor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Enroll New Mining Contractor</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContractor} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Contractor Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Western Coalfield Earthmovers Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Contract / Tender # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CIL-WCL-2026-44"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-900 uppercase focus:border-minsos-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Operating Mine Site *</label>
                  <select
                    value={mineId}
                    onChange={(e) => setMineId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  >
                    {mines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Work Scope *</label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  >
                    <option value="Overburden Removal">Overburden Removal</option>
                    <option value="Haulage Fleet">Haulage Fleet</option>
                    <option value="Shaft Sinking">Shaft Sinking</option>
                    <option value="Conveyor Maintenance">Conveyor Maintenance</option>
                    <option value="Dust Suppression">Dust Suppression</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-slate-700">Active Workers</label>
                  <input
                    type="number"
                    min="1"
                    value={activeWorkers}
                    onChange={(e) => setActiveWorkers(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Safety Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={safetyRating}
                    onChange={(e) => setSafetyRating(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Statutory Insurance Expiry Date</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Supervisor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. R. Sharma"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    placeholder="agency@cil.gov.in"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-minsos-600 px-4 py-2 font-semibold text-white hover:bg-minsos-700 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Contractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Status / Rating */}
      {editingContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Audit Review: {editingContractor.companyName}
              </h3>
              <button
                onClick={() => setEditingContractor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Statutory Compliance Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'compliant' | 'pending' | 'suspended')}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                >
                  <option value="compliant">Compliant (Clear to operate)</option>
                  <option value="pending">Pending DGMS Safety Audit</option>
                  <option value="suspended">Suspended (Stop-Work Order Active)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700">Updated Safety Rating (0-100%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editRating}
                  onChange={(e) => setEditRating(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-minsos-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContractor(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUpdating}
                  className="rounded-lg bg-minsos-600 px-4 py-2 font-semibold text-white hover:bg-minsos-700 disabled:opacity-50"
                >
                  {editUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
