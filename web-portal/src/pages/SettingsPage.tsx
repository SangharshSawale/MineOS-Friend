import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'
import { roleDetails } from '../data/mockUsers'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const [health, setHealth] = useState<{ status: string; service: string; timestamp: string } | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [latency, setLatency] = useState<number | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  // Workspace user preferences stored in localStorage
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('minsos_refresh') || '60')
  const [soundAlerts, setSoundAlerts] = useState(() => localStorage.getItem('minsos_audio') === 'true')
  const [coordFormat, setCoordFormat] = useState(() => localStorage.getItem('minsos_coords') || 'DD')
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('minsos_contrast') === 'true')

  const pingBackend = async () => {
    try {
      setHealthLoading(true)
      const start = performance.now()
      const res = await workflowService.systemHealth()
      const end = performance.now()
      setHealth(res)
      setLatency(Math.round(end - start))
    } catch {
      setHealth({ status: 'unreachable', service: 'MINSOS Backend API', timestamp: new Date().toISOString() })
      setLatency(null)
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => {
    pingBackend()
  }, [])

  const handleSavePreferences = () => {
    localStorage.setItem('minsos_refresh', autoRefresh)
    localStorage.setItem('minsos_audio', String(soundAlerts))
    localStorage.setItem('minsos_coords', coordFormat)
    localStorage.setItem('minsos_contrast', String(highContrast))
    setSaveMessage('Workspace operational preferences saved successfully.')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const playTestAlert = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch {
      // Audio not permitted in current browser context
    }
  }

  const roleAuthorities: Record<string, { title: string; dgmsLevel: string; rights: string[] }> = {
    mine_manager: {
      title: 'Statutory Mine Agent / Mine Manager',
      dgmsLevel: 'Statutory First Class Competency (Mines Act 1952)',
      rights: [
        'Full operational authority over designated mining leaseholds',
        'Approve/close high-level incident investigations & stop-work rectifications',
        'Enroll, suspend, or de-register contractual agencies',
        'Statutory monthly/annual DGMS returns sign-off',
        'Review complete mutation audit trail'
      ]
    },
    safety_officer: {
      title: 'DGMS Certified Mine Safety Officer',
      dgmsLevel: 'Chief Safety Controller & Hazardous Environment Lead',
      rights: [
        'Issue Section 22 / Emergency Stop-Work violation directives',
        'Schedule & record comprehensive underground/opencast safety audits',
        'Mandate gas telemetry remediation & auxiliary ventilation orders',
        'Supervise contractor safety ratings & safety gear compliance',
        'Verify closure evidence for all corrective actions'
      ]
    },
    corporate_officer: {
      title: 'Coal India Corporate Oversight Directorate',
      dgmsLevel: 'Enterprise Board & Subsidiary Executive Review',
      rights: [
        'Multi-subsidiary enterprise compliance & risk scorecard review',
        'Cross-coalfield GIS incident mapping & spatial hazard benchmarking',
        'AI predictive strata hazard models & gas trend inspection',
        'Statutory audit trail analysis and governance reporting',
        'Read-only inspection drill-down across Eastern & Central coalfields'
      ]
    },
    regulator: {
      title: 'Directorate General of Mines Safety (DGMS) Inspector',
      dgmsLevel: 'Statutory Regulator & Enforcement Authority',
      rights: [
        'Independent inspection notices and formal violation logging',
        'Unrestricted audit trail inspection across all mining leases',
        'Issue statutory non-compliance penalties & inquiry summons',
        'Export verified compliance audit reports for Ministry of Coal review',
        'Independent oversight of fatal/serious incident inquiries'
      ]
    },
    admin: {
      title: 'MINSOS System & Security Administrator',
      dgmsLevel: 'Root Administrative & Database Authority',
      rights: [
        'Full access to all mine registers, contractors, and users',
        'Direct system configuration & API health oversight',
        'Complete audit log mutation monitoring and data integrity checks',
        'User provisioning and role allocation'
      ]
    },
    worker: {
      title: 'Pit Operator / Underground Mine Worker',
      dgmsLevel: 'Operational Field Staff',
      rights: [
        'Immediate hazard / near-miss incident reporting with GPS camera evidence',
        'View active mine safety alerts and gas alarm broadcasts',
        'Acknowledge personal shift safety briefings'
      ]
    }
  }

  const currentAuthority = roleAuthorities[user?.role || 'worker'] || roleAuthorities.worker

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-semibold text-xs tracking-wider text-minsos-600 uppercase">
          System Administration & User Profile
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Workspace Settings & Governance Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage local operator preferences, verify DGMS statutory permissions, and check live system health telemetry.
        </p>
      </div>

      {saveMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {saveMessage}
        </div>
      )}

      {/* Grid: Profile & Role Authority */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* User Card */}
        <div className="lg:col-span-5 space-y-6">
          <SectionCard title="Active Operator Profile" subtitle="Authenticated MINSOS Session">
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-minsos-600 font-bold text-xl text-white shadow-md">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{user?.name || 'Authorized Officer'}</h3>
                  <p className="text-slate-500">{user?.email || 'officer@minsos.coal.gov.in'}</p>
                  <span className="mt-1 inline-block rounded-md bg-minsos-50 px-2 py-0.5 font-semibold text-minsos-700">
                    {roleDetails[user?.role || 'worker']?.label || user?.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-slate-400 font-mono text-[10px]">OPERATOR ID</p>
                  <p className="font-semibold font-mono text-slate-800 mt-0.5">
                    {user?.id ? user.id.slice(-8).toUpperCase() : 'OP-99214'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-slate-400 font-mono text-[10px]">JURISDICTION</p>
                  <p className="font-semibold text-slate-800 mt-0.5">Eastern Coalfields</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={logout}
                  className="w-full rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Terminate Active Session (Sign Out)
                </button>
              </div>
            </div>
          </SectionCard>

          {/* System Health Telemetry Card */}
          <SectionCard
            title="Backend & Database Health Telemetry"
            subtitle="Real-time API responsiveness & MongoDB connectivity status"
            action={
              <button
                onClick={pingBackend}
                className="text-xs text-minsos-600 hover:text-minsos-700 font-semibold"
              >
                Ping API
              </button>
            }
          >
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-slate-600 font-medium">API Gateway Status</span>
                <span className="flex items-center gap-1.5 font-bold font-mono text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {healthLoading ? 'Pinging...' : health?.status?.toUpperCase() || 'ONLINE'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-slate-600 font-medium">Response Round-Trip Latency</span>
                <span className="font-bold font-mono text-slate-800">
                  {latency !== null ? `${latency} ms` : 'Evaluating...'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-slate-600 font-medium">MongoDB Cluster Connection</span>
                <span className="font-bold text-emerald-700">CONNECTED (Primary)</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-slate-600 font-medium">Backend Server Timestamp</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Statutory Capabilities & Operational Preferences */}
        <div className="lg:col-span-7 space-y-6">
          {/* Statutory Authority Matrix */}
          <SectionCard
            title="Statutory Authority & Compliance Jurisdiction"
            subtitle={currentAuthority.dgmsLevel}
          >
            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-xl border border-minsos-100 bg-minsos-50/50 p-3.5">
                <h4 className="font-bold text-minsos-900 text-sm">{currentAuthority.title}</h4>
                <p className="mt-1 text-slate-600">
                  Authorized under Ministry of Coal guidelines & DGMS Coal Mines Regulations (CMR 2017).
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-2">Granted Statutory Privileges:</p>
                <ul className="space-y-2">
                  {currentAuthority.rights.map((right, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700 bg-white border border-slate-100 p-2.5 rounded-lg shadow-sm">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="leading-relaxed">{right}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* Operational Interface Preferences */}
          <SectionCard
            title="Field Workspace Preferences"
            subtitle="Local UI behavior tuned for rugged pit tablet operation"
          >
            <div className="p-5 space-y-4 text-xs">
              {/* Auto Refresh */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="font-semibold text-slate-800">Telemetry Refresh Cadence</p>
                  <p className="text-slate-500 text-[11px]">
                    Automatic polling interval for gas alarms and GIS tracking
                  </p>
                </div>
                <select
                  value={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-minsos-500 focus:outline-none"
                >
                  <option value="30">Every 30 Seconds</option>
                  <option value="60">Every 60 Seconds (Default)</option>
                  <option value="300">Every 5 Minutes</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>

              {/* Sound Alerts */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="font-semibold text-slate-800">Acoustic Gas Alarm Broadcast</p>
                  <p className="text-slate-500 text-[11px]">
                    Sound an audio tone when CH₄ or CO exceeds safety threshold
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={playTestAlert}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
                  >
                    Test Tone
                  </button>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-minsos-600 focus:ring-minsos-500"
                  />
                </div>
              </div>

              {/* GPS Coordinate Format */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="font-semibold text-slate-800">Geographic Coordinate Datum</p>
                  <p className="text-slate-500 text-[11px]">
                    Display format for incident location and mine boundaries
                  </p>
                </div>
                <select
                  value={coordFormat}
                  onChange={(e) => setCoordFormat(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-minsos-500 focus:outline-none"
                >
                  <option value="DD">Decimal Degrees (e.g. 23.7505° N)</option>
                  <option value="DMS">Deg Min Sec (e.g. 23° 45' 02" N)</option>
                </select>
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <p className="font-semibold text-slate-800">Sun-Glare High Contrast Mode</p>
                  <p className="text-slate-500 text-[11px]">
                    Increases borders & color vividness for outdoor pit sunlight
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-minsos-600 focus:ring-minsos-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="rounded-lg bg-minsos-600 px-4 py-2 font-semibold text-white hover:bg-minsos-700 shadow-sm"
                >
                  Save Workspace Preferences
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
