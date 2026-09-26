import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { roleDetails } from '../data/mockUsers'
import { SectionCard, StatusBadge } from '../components/ui'
import {
  workflowService,
  type DashboardSummary
} from '../services/workflow'
import type { AlertItem, MineRiskItem } from '../types'

export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [mineRanking, setMineRanking] = useState<MineRiskItem[]>([])
  const [alertsList, setAlertsList] = useState<AlertItem[]>([])
  const [inspectionsList, setInspectionsList] = useState<
    Array<{ id: string; mine: string; type: string; date: string; status: string }>
  >([])
  const [actionsList, setActionsList] = useState<
    Array<{ id: string; action: string; mine: string; owner: string; due: string; status: string }>
  >([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [sum, ranking, alerts, recInspections, opActions] = await Promise.all([
        workflowService.dashboardSummary(),
        workflowService.mineRiskRanking().catch(() => []),
        workflowService.recentAlerts().catch(() => []),
        workflowService.recentInspections().catch(() => []),
        workflowService.openActions().catch(() => [])
      ])
      setSummary(sum)
      setMineRanking(ranking)
      setAlertsList(alerts)
      setInspectionsList(recInspections)
      setActionsList(opActions)
    } catch {
      setError('Unable to load live dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await workflowService.markAlertRead(alertId)
      setAlertsList((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, isRead: true } : a))
      )
    } catch {
      // ignore
    }
  }

  if (!user) return null

  const greeting = roleDetails[user.role]?.greeting ?? 'Operational overview'

  const metrics = summary
    ? [
        {
          label: 'Total mines',
          value: String(summary.totalMines),
          change: 'Monitored operations in network',
          tone: 'blue',
          icon: 'M'
        },
        {
          label: 'Compliance rate',
          value: `${summary.compliancePercent ?? 0}%`,
          change: 'Completed inspections without critical violations',
          tone: (summary.compliancePercent ?? 0) >= 80 ? 'green' : 'amber',
          icon: '✓'
        },
        {
          label: 'System risk score',
          value: `${summary.riskScore ?? 0} / 100`,
          change: `Level: ${summary.riskLevel ?? 'LOW'}`,
          tone:
            summary.riskLevel === 'CRITICAL'
              ? 'red'
              : summary.riskLevel === 'HIGH'
              ? 'red'
              : summary.riskLevel === 'MEDIUM'
              ? 'amber'
              : 'green',
          icon: '⚡'
        },
        {
          label: 'Open violations',
          value: String(summary.openViolations),
          change: 'Unresolved safety & statutory violations',
          tone: summary.openViolations > 0 ? 'amber' : 'green',
          icon: '!'
        },
        {
          label: 'Critical violations',
          value: String(summary.criticalViolations),
          change: 'Requires immediate regulatory intervention',
          tone: summary.criticalViolations > 0 ? 'red' : 'green',
          icon: '⚠'
        },
        {
          label: 'Overdue actions',
          value: String(summary.overdueActions),
          change: 'Deadline passed without completion',
          tone: summary.overdueActions > 0 ? 'red' : 'green',
          icon: '⏱'
        }
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-end gap-3">
        <div>
          <p className="font-medium text-minsos-600 text-sm">{greeting}</p>
          <h2 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Good morning, {user.name.split(' ')[0]}
          </h2>
          <p className="mt-1 text-slate-500 text-sm">
            Live priority signals, risk metrics and statutory compliance across Coal India operations.
          </p>
        </div>
        <p className="text-slate-500 text-xs">
          {summary
            ? `Synced ${new Date(summary.generatedAt).toLocaleTimeString()}`
            : 'Loading live metrics...'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="gap-4 grid sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs"
          >
            <div className="flex justify-between items-start">
              <p className="font-medium text-slate-600 text-sm">{metric.label}</p>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  metric.tone === 'red'
                    ? 'bg-red-50 text-red-600'
                    : metric.tone === 'amber'
                    ? 'bg-amber-50 text-amber-600'
                    : metric.tone === 'green'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-minsos-50 text-minsos-600'
                }`}
              >
                {metric.icon}
              </span>
            </div>
            <p className="mt-4 font-bold text-slate-900 text-3xl tracking-tight">
              {metric.value}
            </p>
            <p className="mt-1.5 text-slate-500 text-xs">{metric.change}</p>
          </article>
        ))}
        {!summary && !error && (
          <div className="col-span-full py-8 text-center text-slate-400 text-sm">
            Loading real-time metrics...
          </div>
        )}
      </div>

      {/* Row 1: Live Mine Risk Ranking & Recent Persistent Alerts */}
      <div className="gap-6 grid xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard
          title="Mine Risk Ranking"
          subtitle="Dynamic risk scores calculated from critical violations, open incidents, and overdue actions"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mine Site</th>
                  <th className="px-4 py-3 font-semibold">Compliance</th>
                  <th className="px-4 py-3 font-semibold">Risk Level</th>
                  <th className="px-5 py-3 font-semibold text-right">Open Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      Loading mine ranking data...
                    </td>
                  </tr>
                )}
                {!loading && mineRanking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      No mine sites registered.
                    </td>
                  </tr>
                )}
                {!loading &&
                  mineRanking.map((mine) => (
                    <tr key={mine.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{mine.name}</p>
                        <p className="text-slate-400 text-xs">
                          {mine.code} · {mine.location}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-700">{mine.compliance}%</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            mine.risk === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : mine.risk === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : mine.risk === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {mine.risk} ({mine.riskScore})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 text-right">
                        {mine.openItems}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Recent Persistent Alerts */}
        <SectionCard
          title="Recent System Alerts"
          subtitle="Persistent statutory notifications and priority triggers"
        >
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {loading && (
              <p className="py-6 text-center text-slate-400 text-xs">Loading alerts...</p>
            )}
            {!loading && alertsList.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                ✓ No active alerts. All operations within threshold.
              </div>
            )}
            {!loading &&
              alertsList.map((alert) => (
                <div
                  key={alert._id}
                  className={`flex gap-3 px-5 py-3.5 transition ${
                    alert.isRead ? 'opacity-60 bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      alert.severity === 'critical'
                        ? 'bg-red-600'
                        : alert.severity === 'high'
                        ? 'bg-orange-500'
                        : alert.severity === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-minsos-600'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-slate-800 text-xs">{alert.title}</p>
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAlertRead(alert._id)}
                          className="text-[11px] text-minsos-600 hover:text-minsos-800 underline shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-slate-500 text-xs line-clamp-2">
                      {alert.message}
                    </p>
                    <p className="mt-1 text-slate-400 text-[10px]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Recent Inspections & Open Corrective Actions */}
      <div className="gap-6 grid xl:grid-cols-2">
        <SectionCard
          title="Recent Inspections"
          subtitle="Live register of statutory inspections across sites"
        >
          <div className="divide-y divide-slate-100">
            {loading && (
              <p className="py-6 text-center text-slate-400 text-xs">Loading inspections...</p>
            )}
            {!loading && inspectionsList.length === 0 && (
              <p className="py-6 text-center text-slate-400 text-xs">No recent inspections logged.</p>
            )}
            {!loading &&
              inspectionsList.map((insp) => (
                <div
                  key={insp.id}
                  className="flex justify-between items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition"
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{insp.mine}</p>
                    <p className="mt-0.5 text-slate-500 text-xs">
                      {insp.type} · Scheduled {insp.date}
                    </p>
                  </div>
                  <StatusBadge
                    value={
                      insp.status === 'completed'
                        ? 'Compliant'
                        : insp.status === 'follow_up_required'
                        ? 'Follow-up required'
                        : 'Observations'
                    }
                  />
                </div>
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Open Corrective Actions"
          subtitle="Remediations pending completion or supervisor verification"
        >
          <div className="divide-y divide-slate-100">
            {loading && (
              <p className="py-6 text-center text-slate-400 text-xs">Loading corrective actions...</p>
            )}
            {!loading && actionsList.length === 0 && (
              <p className="py-6 text-center text-slate-400 text-xs">No pending corrective actions.</p>
            )}
            {!loading &&
              actionsList.map((action) => (
                <div
                  key={action.id}
                  className="flex justify-between items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{action.action}</p>
                    <p className="mt-0.5 text-slate-500 text-xs">
                      {action.mine} · Owner: {action.owner} · Due {action.due}
                    </p>
                  </div>
                  <StatusBadge value={action.status} />
                </div>
              ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}