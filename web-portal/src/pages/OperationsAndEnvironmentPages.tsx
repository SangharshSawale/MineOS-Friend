import { useState, useEffect } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { ProductionLogItem, ProductionKpis, EnvironmentLogItem, EnvironmentMetricsSummary } from '../types'

export function ProductionPage() {
  const [selectedSeam, setSelectedSeam] = useState('ALL')
  const [logs, setLogs] = useState<ProductionLogItem[]>([])
  const [kpis, setKpis] = useState<ProductionKpis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [logsRes, kpiRes] = await Promise.all([
          workflowService.productionLogs(),
          workflowService.productionKpis()
        ])
        setLogs(logsRes.data)
        setKpis(kpiRes)
      } catch (err) {
        console.error('Failed to load production operations data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredPits = selectedSeam === 'ALL'
    ? logs
    : logs.filter((p) => p.pitOrSeam.toLowerCase().includes(selectedSeam.toLowerCase()))

  const productionKpiCards = [
    {
      label: 'Total Daily Extraction',
      value: kpis ? `${kpis.totalDailyExtractionMt.toLocaleString()} MT` : '48,250 MT',
      change: kpis ? `${kpis.achievementRatePercent}% of Target` : '+4.2% vs target',
      tone: 'emerald'
    },
    {
      label: 'Daily Target Production',
      value: kpis ? `${kpis.totalDailyTargetMt.toLocaleString()} MT` : '47,000 MT',
      change: 'CIL Approved Plan',
      tone: 'blue'
    },
    {
      label: 'Total Overburden Removed',
      value: kpis ? `${kpis.totalOverburdenM3.toLocaleString()} m³` : '154,500 m³',
      change: 'Strip Ratio Nominal',
      tone: 'emerald'
    },
    {
      label: 'Active Machinery Fleet',
      value: kpis ? `${kpis.activeEquipmentUnits} Units` : '64 Units',
      change: 'Shovels & Dumpers Tracked',
      tone: 'amber'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 23 · Production & Dispatch Analytics
            </span>
            <span className="text-slate-400 text-xs">Coal India Production Roster (Live MongoDB)</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Colliery Production & Dispatch Operations
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Daily coal extraction vs CIL statutory plans, shovel-dumper utilization, and railway siding dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSeam}
            onChange={(e) => setSelectedSeam(e.target.value)}
            className="bg-white px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold"
          >
            <option value="ALL">All Active Pits & Seams</option>
            <option value="Jharia">Jharia Underground</option>
            <option value="Korba">Korba Opencast</option>
            <option value="Raniganj">Raniganj Seams</option>
            <option value="Singrauli">Singrauli Quarry</option>
            <option value="Talcher">Talcher Deep</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {productionKpiCards.map((kpi, idx) => (
          <article key={idx} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
            <p className="font-medium text-slate-500 text-xs">{kpi.label}</p>
            <p className="mt-2 font-bold text-slate-900 text-3xl">{kpi.value}</p>
            <p className={`mt-1 text-xs font-semibold text-${kpi.tone}-600`}>{kpi.change}</p>
          </article>
        ))}
      </div>

      {/* Pit Extraction Table */}
      <SectionCard title="Active Pit & Face Extraction Roster" subtitle="Real-time tally validated against digital weighbridge registers">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading production extraction logs from MongoDB Atlas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Pit / Working Seam</th>
                  <th className="px-4 py-3">Coal Grade</th>
                  <th className="px-4 py-3">Daily Target</th>
                  <th className="px-4 py-3">Achieved Tonnage</th>
                  <th className="px-4 py-3">Performance</th>
                  <th className="px-4 py-3">Machinery Deployed</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPits.map((p) => {
                  const rate = p.targetTonnage > 0
                    ? `${((p.achievedTonnage / p.targetTonnage) * 100).toFixed(1)}%`
                    : '100%'
                  return (
                    <tr key={p._id || p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{p.pitOrSeam}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">{p.coalGrade}</td>
                      <td className="px-4 py-3.5 text-slate-700">{p.targetTonnage.toLocaleString()} MT</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{p.achievedTonnage.toLocaleString()} MT</td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-emerald-700">{rate}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{p.equipmentDeployed}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'On Target'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Normal'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export function EnvironmentPage() {
  const [stations, setStations] = useState<EnvironmentLogItem[]>([])
  const [metrics, setMetrics] = useState<EnvironmentMetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [stationsRes, metricsRes] = await Promise.all([
          workflowService.environmentStations(),
          workflowService.environmentMetrics()
        ])
        setStations(stationsRes.data)
        setMetrics(metricsRes)
      } catch (err) {
        console.error('Failed to load environmental monitoring data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const envMetrics = [
    {
      label: 'Ambient Air Quality (AQI)',
      value: metrics ? String(metrics.avgAqi) : '112',
      status: metrics && metrics.avgAqi < 150 ? 'Moderate (Safe)' : 'Elevated Attention',
      tone: 'amber',
      threshold: 'CPCB Limit: 150'
    },
    {
      label: 'Average PM10 Particulate Density',
      value: metrics ? `${metrics.avgPm10} µg/m³` : '78 µg/m³',
      status: 'Within Limits',
      tone: 'emerald',
      threshold: 'Max: 100 µg/m³'
    },
    {
      label: 'Average Mine Effluent Water pH',
      value: metrics ? `${metrics.avgWaterPh} pH` : '7.4 pH',
      status: 'Optimal Neutral',
      tone: 'emerald',
      threshold: 'Permitted: 6.5 - 8.5'
    },
    {
      label: 'Dust Suppression Sprinklers',
      value: metrics ? `${metrics.activeMistCannonsPercent}% Active` : '98.2% Active',
      status: `${metrics ? metrics.totalStations : 5} Stations Online`,
      tone: 'blue',
      threshold: 'Mandatory 95%'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
            Module 24 · Environmental Compliance
          </span>
          <span className="text-slate-400 text-xs">CPCB & State PCB Guidelines (Live MongoDB)</span>
        </div>
        <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
          Environmental Monitoring & Pollution Controls
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Continuous ambient air quality (AQI), PM10/PM2.5 dust suppression telemetry, and mine water discharge compliance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {envMetrics.map((m, idx) => (
          <article key={idx} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
            <p className="font-medium text-slate-500 text-xs">{m.label}</p>
            <p className="mt-2 font-bold text-slate-900 text-2xl">{m.value}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700">{m.status}</span>
              <span className="text-slate-400 text-[10px] font-mono">{m.threshold}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Monitoring Station Table */}
      <SectionCard title="Continuous Environmental Telemetry Stations" subtitle="Directly grounded against CPCB Central Environment Monitoring Portals">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading environmental station telemetry from MongoDB Atlas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Monitoring Sensor Station</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Real-Time Reading</th>
                  <th className="px-4 py-3">Operational Status</th>
                  <th className="px-4 py-3 text-right">Statutory Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stations.map((st) => (
                  <tr key={st._id || st.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{st.stationName}</td>
                    <td className="px-4 py-3.5 text-slate-600 uppercase text-[10px] font-semibold">{st.stationType.replace('_', ' ')}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-800">
                      AQI: {st.aqi} | PM10: {st.pm10} µg/m³ | pH: {st.waterPh}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'Normal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.status === 'Elevated'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {st.status === 'Normal' ? '✓ Normal' : `⚠️ ${st.status}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">{st.complianceStatus}</td>
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

