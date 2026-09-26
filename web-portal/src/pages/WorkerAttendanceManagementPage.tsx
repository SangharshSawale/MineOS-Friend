import { useEffect, useMemo, useState } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { GeoAttendanceRecord } from '../types'
import { AttendanceIcon, CloseIcon, RefreshIcon } from '../components/icons'

type ViewMode = 'pending' | 'all'

function formatTimestamp(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getPopulatedWorker(record: GeoAttendanceRecord) {
  if (record.worker && typeof record.worker === 'object') {
    return record.worker
  }
  if (record.workerId && typeof record.workerId === 'object' && 'name' in record.workerId) {
    return record.workerId
  }
  return null
}

function getWorkerName(record: GeoAttendanceRecord): string {
  return getPopulatedWorker(record)?.name ?? 'Unknown Worker'
}

function getWorkerEmail(record: GeoAttendanceRecord): string {
  return getPopulatedWorker(record)?.email ?? '—'
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    AUTO_VERIFIED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '✓ Auto-Verified' },
    MANUAL_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-800', label: '⏳ Manual Review' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: '✕ Rejected' },
    Present: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Present' },
    Absent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' },
    Pending: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Pending' },
  }
  const cfg = map[status] ?? { bg: 'bg-slate-100', text: 'text-slate-700', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

export function WorkerAttendanceManagementPage() {
  const [items, setItems] = useState<GeoAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('pending')

  const loadData = async (mode: ViewMode = viewMode) => {
    try {
      setLoading(true)
      setError('')
      if (mode === 'pending') {
        const records = await workflowService.pendingGeoAttendance()
        setItems(records)
      } else {
        const records = await workflowService.allGeoAttendance()
        setItems(records)
      }
    } catch {
      setError('Unable to load attendance records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(viewMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'Pending' || item.status === 'MANUAL_REVIEW').length,
    [items]
  )

  const handleMarkPresent = async (record: GeoAttendanceRecord) => {
    const id = record._id || record.id
    if (!id) return
    setUpdatingId(id)
    setSuccess('')
    setError('')
    try {
      await workflowService.updateGeoAttendanceStatus(id, 'Present')
      await loadData(viewMode)
      setSuccess(`Marked ${getWorkerName(record)} as Present.`)
    } catch {
      setError('Failed to update attendance status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleMarkAbsent = async (record: GeoAttendanceRecord) => {
    const id = record._id || record.id
    if (!id) return
    setUpdatingId(id)
    setSuccess('')
    setError('')
    try {
      await workflowService.updateGeoAttendanceStatus(id, 'Absent')
      await loadData(viewMode)
      setSuccess(`Marked ${getWorkerName(record)} as Absent.`)
    } catch {
      setError('Failed to update attendance status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const canAction = (status: string) => ['Pending', 'MANUAL_REVIEW'].includes(status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-minsos-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold">
                Module 30 · GPS Geo-Attendance
              </span>
              <span className="text-xs text-white/70">Safety Officer Review Queue</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Worker Attendance</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Review GPS + photo attendance submissions. AUTO_VERIFIED records are inside the mine geofence.
              MANUAL_REVIEW records need your decision.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadData(viewMode)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            <RefreshIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Awaiting Review</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{loading ? '...' : pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Loaded</p>
          <p className="mt-1 text-2xl font-bold text-minsos-700">{loading ? '...' : items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Auto-Verified</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {loading ? '...' : items.filter(i => i.status === 'AUTO_VERIFIED').length}
          </p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setViewMode('pending')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${viewMode === 'pending' ? 'bg-minsos-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          Pending Review
        </button>
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${viewMode === 'all' ? 'bg-minsos-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          All Records
        </button>
      </div>

      <SectionCard
        title={viewMode === 'pending' ? 'Pending Geo-tagged Attendance' : 'All Attendance Records'}
        subtitle="GPS distance and accuracy shown for each check-in. Auto-verified = inside geofence with good GPS."
      >
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-minsos-600 border-t-transparent" />
            Loading attendance records...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <AttendanceIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No records found</p>
            <p className="mt-1 text-sm text-slate-500">
              Workers submit geo-tagged attendance from the mobile app.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">GPS Accuracy</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((record) => {
                  const id = record._id || record.id || ''
                  const imageUrl = record.imageUrl
                  const latitude = record.location?.latitude
                  const longitude = record.location?.longitude
                  const dist = (record as GeoAttendanceRecord & { distanceFromMine?: number }).distanceFromMine
                  const accuracy = (record as GeoAttendanceRecord & { gpsAccuracy?: number }).gpsAccuracy
                  const method = (record as GeoAttendanceRecord & { verificationMethod?: string }).verificationMethod

                  return (
                    <tr key={id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{getWorkerName(record)}</p>
                        <p className="text-xs text-slate-500">{getWorkerEmail(record)}</p>
                        {method && <p className="text-xs text-minsos-600 mt-0.5">{method}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedImage(imageUrl)}
                            className="overflow-hidden rounded-lg border border-slate-200 shadow-xs transition hover:ring-2 hover:ring-minsos-500"
                          >
                            <img
                              src={imageUrl}
                              alt={`Attendance photo for ${getWorkerName(record)}`}
                              className="h-16 w-16 object-cover"
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No image</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700">
                        {typeof latitude === 'number' && typeof longitude === 'number'
                          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {dist !== undefined && dist !== null
                          ? <span className={`font-semibold ${dist <= 100 ? 'text-emerald-700' : dist <= 300 ? 'text-amber-700' : 'text-red-700'}`}>{dist}m</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {accuracy !== undefined && accuracy !== null
                          ? <span className={accuracy <= 50 ? 'text-emerald-700' : accuracy <= 200 ? 'text-amber-700' : 'text-red-700'}>±{Math.round(accuracy)}m</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {formatTimestamp(record.timestamp ?? record.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <VerificationBadge status={record.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {canAction(record.status) ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={updatingId === id}
                              onClick={() => handleMarkPresent(record)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {updatingId === id ? '...' : 'Present'}
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === id}
                              onClick={() => handleMarkAbsent(record)}
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                            >
                              Absent
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow"
              aria-label="Close image preview"
            >
              <CloseIcon className="h-5 w-5 text-slate-700" />
            </button>
            <img
              src={selectedImage}
              alt="Full geotagged attendance photo"
              className="max-h-[90vh] w-full object-contain bg-slate-100"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
