import { useState, useEffect } from 'react'
import { SectionCard } from '../components/ui'
import { workflowService } from '../services/workflow'
import type { SafetyObservationItem } from '../types'

export function SafetyObservationsPage() {
  const [observations, setObservations] = useState<SafetyObservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('Strata Control')
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high')
  const [notes, setNotes] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadObservations = async () => {
    try {
      setLoading(true)
      const res = await workflowService.observations()
      setObservations(res.data)
    } catch (err) {
      console.error('Failed to load safety observations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObservations()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      await workflowService.createObservation({
        title,
        category,
        location: location || 'Active Working Face',
        severity,
        notes: notes || undefined
      })

      setTitle('')
      setLocation('')
      setNotes('')
      setFormOpen(false)
      setSuccessMsg('Safety observation recorded in MongoDB and dispatched to Shift Safety Controller.')
      setTimeout(() => setSuccessMsg(''), 4000)
      await loadObservations()
    } catch (err) {
      console.error('Failed to log safety observation:', err)
      alert('Failed to submit safety observation to backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const updated = await workflowService.updateObservationStatus(id, newStatus)
      setObservations((prev) =>
        prev.map((o) => ((o._id || o.id) === id ? updated : o))
      )
    } catch (err) {
      console.error('Failed to update observation status:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 27 · Frontline Hazard Observation System
            </span>
            <span className="text-slate-400 text-xs">Section 22 Mines Act (Live MongoDB)</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            Safety Observations & Near-Miss Reporting
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Empowering frontline workers and safety officers to log unsafe conditions, strata fractures, and equipment anomalies.
          </p>
        </div>

        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
        >
          <span>⚠️</span> Report New Safety Hazard
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* Observation Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>⚠️</span> Log Frontline Safety Hazard
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hazard Title / Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Loose strata roof fragment near Junction 14"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hazard Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="Strata Control">Strata Control</option>
                    <option value="Gas Telemetry">Gas Telemetry</option>
                    <option value="Haulage Road">Haulage Road</option>
                    <option value="Electrical Flameproof">Electrical Flameproof</option>
                    <option value="Ventilation">Ventilation</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as 'critical' | 'high' | 'medium' | 'low')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="critical">Critical (Immediate Stop Work)</option>
                    <option value="high">High (Attention Required)</option>
                    <option value="medium">Medium (Next Shift Rectify)</option>
                    <option value="low">Low (Routine Fix)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Underground Location / Pit Bench</label>
                <input
                  type="text"
                  placeholder="e.g. Jharia Seam 4 Intake Gallery, West Face"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Immediate Corrective Notes / Action Taken</label>
                <textarea
                  rows={2}
                  placeholder="Describe observed conditions and initial mitigation steps..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Hazard Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Observations Timeline */}
      <SectionCard title="Active Frontline Safety Observations" subtitle="Real-time register dispatching automatic SMS/Siren alerts to Colliery Overmen">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading safety observations from MongoDB Atlas...</p>
          </div>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No safety observations logged currently.
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map((obs) => {
              const obsId = obs._id || obs.id || ''
              const isCrit = obs.severity === 'critical'
              const isHigh = obs.severity === 'high'

              return (
                <div
                  key={obsId}
                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCrit
                            ? 'bg-red-100 text-red-800'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {obs.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {obs.category}
                      </span>
                      <span className="text-slate-400 text-xs font-mono">
                        {obs.createdAt ? new Date(obs.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{obs.title}</h4>
                    <p className="text-xs text-slate-500">
                      Location: <strong className="text-slate-700">{obs.location}</strong> · Reported by: {obs.reportedBy?.name || 'Frontline Reporter'}
                    </p>
                    {obs.notes && (
                      <p className="text-xs text-slate-600 font-mono mt-0.5">
                        Notes: {obs.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        obs.status === 'Rectified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : obs.status === 'Investigating'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {obs.status}
                    </span>
                    {obs.status !== 'Rectified' && (
                      <button
                        onClick={() => handleStatusUpdate(obsId, 'Rectified')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold transition"
                      >
                        Mark Rectified
                      </button>
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
