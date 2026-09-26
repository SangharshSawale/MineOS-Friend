import { useEffect, useState } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { AlertItem } from '../types'

export function NotificationsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [error, setError] = useState('')

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const res = await workflowService.alertsList({
        severity: severityFilter || undefined,
        isRead: unreadOnly ? false : undefined
      })
      setAlerts(res.data)
    } catch {
      setError('Unable to retrieve notifications feed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [severityFilter, unreadOnly])

  const handleMarkAsRead = async (id: string) => {
    try {
      await workflowService.markAlertRead(id)
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      )
    } catch {
      // Optimistic update fallback
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      )
    }
  }

  const markAllRead = async () => {
    const unread = alerts.filter((a) => !a.isRead)
    for (const a of unread) {
      await workflowService.markAlertRead(a._id).catch(() => undefined)
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 22 · Statutory Notifications & Alerts
            </span>
            <span className="text-slate-400 text-xs">Real-Time Dispatch Engine</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Safety Notifications & Broadcast Alerts
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Statutory sirens, threshold exceedance notices, and supervisory dispatches across monitored colliery sites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            ✓ Mark All as Read ({unreadCount})
          </button>
          <button
            onClick={loadAlerts}
            className="px-3 py-2 bg-minsos-900 hover:bg-minsos-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            🔄 Refresh Feed
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-slate-600 text-xs font-medium">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical Sirens</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium</option>
            <option value="low">Low Advisory</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-300 text-minsos-600"
            />
            <span>Unread notifications only</span>
          </label>
        </div>

        <span className="text-slate-400 text-xs font-medium">
          {unreadCount} unread / {alerts.length} total
        </span>
      </div>

      {/* Alerts Feed */}
      <SectionCard title="Live Colliery Alert Dispatch" subtitle="Generated automatically from sensor thresholds and supervisory actions">
        {loading && (
          <div className="py-12 text-center text-slate-400 text-xs">
            Retrieving real-time statutory alert dispatches...
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            ✓ No outstanding notifications matching current filters.
          </div>
        )}

        {!loading && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isCritical = alert.severity === 'critical'
              const isHigh = alert.severity === 'high'

              return (
                <div
                  key={alert._id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !alert.isRead
                      ? isCritical
                        ? 'bg-red-50/80 border-red-200'
                        : isHigh
                        ? 'bg-amber-50/80 border-amber-200'
                        : 'bg-minsos-50/60 border-minsos-200'
                      : 'bg-white border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="text-xl shrink-0 mt-0.5">
                      {isCritical ? '🚨' : isHigh ? '⚠️' : '🔔'}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isCritical
                              ? 'bg-red-600 text-white'
                              : isHigh
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        {alert.mineId && (
                          <span className="text-[11px] font-semibold text-slate-700">
                            {alert.mineId.name} ({alert.mineId.code})
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                        {!alert.isRead && (
                          <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{alert.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    {!alert.isRead ? (
                      <button
                        onClick={() => handleMarkAsRead(alert._id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs"
                      >
                        Mark as Read
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">✓ Read</span>
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
