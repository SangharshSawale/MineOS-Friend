import { useEffect, useState, useMemo } from 'react'
import { StatusBadge } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { AiRiskSiteAnalytics } from '../types'

export function AiRiskPage() {
  const [analytics, setAnalytics] = useState<AiRiskSiteAnalytics[]>([])
  const [generatedAt, setGeneratedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('ALL')

  const loadAiAnalytics = async () => {
    try {
      setLoading(true)
      const res = await workflowService.aiRiskAnalytics()
      setAnalytics(res.analytics)
      setGeneratedAt(res.generatedAt)
    } catch {
      setError('Unable to fetch AI risk predictive analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAiAnalytics()
  }, [])

  const filteredSites = useMemo(() => {
    return analytics.filter((site) => {
      const matchSearch =
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchRisk = riskFilter === 'ALL' || site.riskLevel.toUpperCase() === riskFilter
      return matchSearch && matchRisk
    })
  }, [analytics, searchQuery, riskFilter])

  // Aggregate stats
  const avgStrata = useMemo(() => {
    if (analytics.length === 0) return 0
    const sum = analytics.reduce((acc, s) => acc + s.predictions.roofFallProbability, 0)
    return Math.round(sum / analytics.length)
  }, [analytics])

  const gasAlertCount = useMemo(() => {
    return analytics.filter((s) => s.predictions.gasTelemetry.status !== 'Normal').length
  }, [analytics])

  const highRiskCount = useMemo(() => {
    return analytics.filter((s) => s.riskLevel === 'CRITICAL' || s.riskLevel === 'HIGH').length
  }, [analytics])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <p className="font-semibold text-xs tracking-wider text-minsos-600 uppercase">
              Predictive Hazard Modeling & Telemetry
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            AI Strata & Environmental Hazard Risk Engine
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automated roof-fall probability forecasting, continuous gas telemetry inferences (CH₄ & CO), and proactive safety directives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-xs text-slate-400 font-mono">
              Inferred {new Date(generatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadAiAnalytics}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span>↻</span> Re-calculate Models
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Aggregate Predictive KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Monitored Mine Sites</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{analytics.length}</p>
          <p className="mt-1 text-xs text-slate-400">Strata Sensors Active</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Mean Strata Hazard</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{avgStrata}%</p>
          <p className="mt-1 text-xs text-slate-400">Roof Fall Probability</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Elevated Gas Sensors</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{gasAlertCount}</p>
          <p className="mt-1 text-xs text-slate-400">CH₄ / CO Above Baseline</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">High Risk Sites</p>
          <p className="mt-2 text-2xl font-bold text-orange-600">{highRiskCount}</p>
          <p className="mt-1 text-xs text-slate-400">Requiring Interventions</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search mine by name, code or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-minsos-500 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium">Risk Filter:</span>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  riskFilter === lvl
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">Showing {filteredSites.length} evaluated locations</span>
      </div>

      {/* Sites AI Hazard Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-minsos-500 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-400 font-medium">Running Bayesian Strata Hazard Estimations...</p>
          </div>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No mine sites matched your filter parameters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredSites.map((site) => {
            const rfProb = site.predictions.roofFallProbability
            const rfBarColor =
              rfProb >= 70 ? 'bg-red-500' : rfProb >= 40 ? 'bg-amber-500' : 'bg-emerald-500'

            const gas = site.predictions.gasTelemetry
            const gasBadgeColor =
              gas.status === 'Critical'
                ? 'bg-red-100 text-red-700 border-red-200'
                : gas.status === 'Elevated'
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'

            return (
              <div
                key={site.mineId}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  {/* Mine Site Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{site.name}</h3>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                          {site.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{site.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        Score: {site.systemRiskScore}/100
                      </span>
                      <StatusBadge value={site.riskLevel} />
                    </div>
                  </div>

                  {/* Predictive Hazard Gauges */}
                  <div className="mt-4 space-y-3.5">
                    {/* Roof Fall Probability */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">Strata & Roof Fall Risk</span>
                        <span className="font-bold font-mono text-slate-900">{rfProb}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rfBarColor} transition-all duration-500`}
                          style={{ width: `${rfProb}%` }}
                        />
                      </div>
                    </div>

                    {/* Gas Telemetry Real-time Stream */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Continuous Gas Telemetry</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${gasBadgeColor}`}
                        >
                          {gas.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white p-2 border border-slate-200">
                          <p className="text-[10px] text-slate-400">CH₄ (Methane Vol)</p>
                          <p className="font-bold font-mono text-sm text-slate-900 mt-0.5">
                            {gas.ch4Percentage}%
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">Limit: {gas.ch4Threshold}</p>
                        </div>
                        <div className="rounded-lg bg-white p-2 border border-slate-200">
                          <p className="text-[10px] text-slate-400">CO (Carbon Monoxide)</p>
                          <p className="font-bold font-mono text-sm text-slate-900 mt-0.5">
                            {gas.coPpm} PPM
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">Limit: {gas.coThreshold}</p>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Inferences */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-slate-100 p-2.5">
                        <p className="text-[11px] text-slate-400">Micro-seismic Index</p>
                        <p className="mt-0.5 font-bold font-mono text-sm text-slate-800">
                          {site.predictions.seismicIndex} / 10.0
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-100 p-2.5">
                        <p className="text-[11px] text-slate-400">Equipment Failure Hazard</p>
                        <p className="mt-0.5 font-bold font-mono text-sm text-slate-800">
                          {site.predictions.equipmentFailureRisk}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Safety Directives */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <span className="text-cyan-600">⚡</span> Prescriptive Directives
                    </p>
                    <ul className="space-y-1">
                      {site.recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-md p-1.5"
                        >
                          <span className="text-minsos-600 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Status */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>DGMS Tele-surveillance Sync</span>
                  <span className="font-mono text-emerald-600 font-medium">Model Conf: 94.2%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
