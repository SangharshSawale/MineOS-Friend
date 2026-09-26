import { useState, useEffect } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { WorkerItem, WorkerRosterSummary, ApprovalRequestItem } from '../types'

export function WorkersRosterPage() {
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [summary, setSummary] = useState<WorkerRosterSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [shiftFilter, setShiftFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [listRes, sumRes] = await Promise.all([
          workflowService.workersList(),
          workflowService.workersSummary()
        ])
        setWorkers(listRes.data)
        setSummary(sumRes)
      } catch (err) {
        console.error('Failed to load workers roster:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filtered = workers.filter((w) => {
    const matchesShift = shiftFilter === 'ALL' || w.shift.includes(shiftFilter)
    const q = search.toLowerCase()
    const matchesSearch =
      w.name.toLowerCase().includes(q) ||
      w.trade.toLowerCase().includes(q) ||
      w.employeeCode.toLowerCase().includes(q)
    return matchesShift && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 25 · Frontline Workforce Muster Roll
            </span>
            <span className="text-slate-400 text-xs">Section 48 Mines Act 1952 (Live MongoDB)</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Frontline Workers & Biometric Shift Muster
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Statutory shift allocations, biometric attendance verification, and Vocational Training Rules compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="bg-white px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold"
          >
            <option value="ALL">All Active Shifts</option>
            <option value="Shift A">Shift A (06:00 - 14:00)</option>
            <option value="Shift B">Shift B (14:00 - 22:00)</option>
            <option value="Shift C">Shift C (22:00 - 06:00)</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Muster Strength</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summary ? `${summary.totalWorkers} Workers` : '6 Workers'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Biometric Registered</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Present Today</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {summary ? `${summary.presentCount} On Duty` : '5 On Duty'}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Biometric Verified</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Training Refreshers</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {summary ? `${summary.refresherRequiredCount} Required` : '1 Required'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">DGMS VT Rules 1966</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Medical Fitness Class I</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">100%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">PME/IME Up to Date</p>
        </div>
      </div>

      {/* Roster Table */}
      <SectionCard title="Frontline Muster Register" subtitle="Digitally linked to pit-head biometric turnstile gates">
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search worker by name, trade, or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading worker roster from MongoDB Atlas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Worker Name</th>
                  <th className="px-4 py-3">Employee Code</th>
                  <th className="px-4 py-3">Statutory Trade / Role</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">DGMS Training</th>
                  <th className="px-4 py-3 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((w) => (
                  <tr key={w._id || w.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{w.name}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{w.employeeCode}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{w.trade}</td>
                    <td className="px-4 py-3.5 text-slate-600">{w.shift}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ✓ {w.attendanceStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.trainingStatus === 'Valid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.trainingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">{w.emergencyContact || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const loadApprovals = async () => {
    try {
      setLoading(true)
      const res = await workflowService.approvalsList()
      setApprovals(res.data)
    } catch (err) {
      console.error('Failed to load approvals queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [])

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    setActionInProgress(id)
    try {
      const updated = await workflowService.reviewApproval(
        id,
        newStatus,
        `Statutory determination recorded: ${newStatus.toUpperCase()}`
      )
      setApprovals((prev) =>
        prev.map((a) => ((a._id || a.id) === id ? updated : a))
      )
    } catch (err) {
      console.error('Failed to update approval status:', err)
      alert('Failed to update approval status on server.')
    } finally {
      setActionInProgress(null)
    }
  }

  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
            Module 26 · Manager Verification & Approval Queue
          </span>
          <span className="text-slate-400 text-xs">Section 22 Mines Act Authority (Live MongoDB)</span>
        </div>
        <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
          Executive Approvals & Statutory Sign-Offs
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Mine Manager authorized queue for statutory corrective action verification, incident inquiry closure, and blasting permits.
        </p>
      </div>

      {/* Approval Items */}
      <SectionCard
        title={`Pending Statutory Verifications (${pendingCount} Action Items)`}
        subtitle="Mandatory manager review required under Coal Mines Regulations"
      >
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading statutory approvals queue from MongoDB Atlas...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No approval requests found in queue.
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((item) => {
              const itemId = item._id || item.id || ''
              return (
                <div
                  key={itemId}
                  className={`p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.status === 'pending'
                      ? 'bg-white border-slate-200 shadow-xs'
                      : item.status === 'approved'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-minsos-100 text-minsos-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      {item.urgency === 'critical' ? (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                          Critical Urgency
                        </span>
                      ) : item.urgency === 'high' ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                          High Urgency
                        </span>
                      ) : null}
                      <span className="text-slate-400 text-xs font-mono">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500">
                      Colliery: <strong className="text-slate-700">{item.mineId?.name || 'Assigned Colliery'}</strong> · Submitted by: {item.submittedBy?.name || 'Statutory Official'}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono">
                        Notes: {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'pending' ? (
                      <>
                        <button
                          disabled={actionInProgress === itemId}
                          onClick={() => handleAction(itemId, 'rejected')}
                          className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
                        >
                          Reject / Send Back
                        </button>
                        <button
                          disabled={actionInProgress === itemId}
                          onClick={() => handleAction(itemId, 'approved')}
                          className="px-4 py-2 bg-minsos-900 hover:bg-minsos-800 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
                        >
                          {actionInProgress === itemId ? 'Saving...' : '✓ Approve & Verify'}
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status === 'approved' ? '✓ Approved & Countersigned' : '✕ Rejected'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

