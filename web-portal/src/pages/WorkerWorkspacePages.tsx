import { useState, useEffect } from 'react'
import { SectionCard } from '../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { workflowService } from '../services/workflow'
import type { WorkerTaskItem, WorkerAttendanceItem } from '../types'

export function WorkerDashboardPage() {
  const { user } = useAuth()
  const role = user?.role ?? 'worker'
  const [tasks, setTasks] = useState<WorkerTaskItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const t = await workflowService.workerTasks()
        setTasks(t)
      } catch (err) {
        console.error('Failed to load worker tasks:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div className="space-y-6">
      {/* Worker Greeting Banner */}
      <div className="bg-gradient-to-r from-minsos-950 via-slate-900 to-minsos-900 text-white p-6 rounded-2xl shadow-md border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              Shift A Active · Biometric Verified
            </span>
            <span className="text-slate-400 text-xs">Jharia Seam 4 Underground (Live MongoDB)</span>
          </div>
          <h1 className="mt-2 font-extrabold text-2xl tracking-tight">
            Welcome back, {user?.name || 'Colliery Frontline Operator'}
          </h1>
          <p className="mt-1 text-slate-300 text-xs sm:text-sm">
            Atmospheric condition: <strong>Normal (CH₄: 0.42%, CO: 8 ppm)</strong> · Air Velocity: 1.8 m/s (Compliant).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to={`/${role}/report-safety`}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
          >
            ⚠️ Report Hazard
          </Link>
          <Link
            to={`/${role}/tasks`}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold border border-white/20 transition"
          >
            📋 My Tasks
          </Link>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">My Shift Assignment</p>
          <p className="text-xl font-bold text-slate-900 mt-1">Shift A</p>
          <p className="text-[11px] text-slate-400 mt-0.5">06:00 - 14:00 IST</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Frontline Safety Score</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">98 / 100</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Zero Safety Breaches</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Assigned Tasks</p>
          <p className="text-xl font-bold text-minsos-700 mt-1">
            {loading ? '...' : `${doneCount} / ${tasks.length} Done`}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pre-Shift Checks</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">DGMS Vocational Training</p>
          <p className="text-xl font-bold text-slate-900 mt-1">Certified</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Valid till Nov 2026</p>
        </div>
      </div>

      {/* Shift Checklist Preview */}
      <SectionCard title="Today's Shift Safety Protocol Checklist" subtitle="Statutory mandatory physical verifications before face operations">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">Loading checklist from MongoDB...</div>
        ) : tasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No shift checklist assigned.</div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => {
              const taskId = task._id || task.id || ''
              return (
                <div
                  key={taskId}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    task.done ? 'bg-emerald-50/60 border-emerald-200 text-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={task.done ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {task.done ? '✓' : '○'}
                    </span>
                    <span className={task.done ? 'line-through text-slate-500' : 'font-semibold text-slate-900'}>
                      {task.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {task.done ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export function WorkerTasksPage() {
  const [tasks, setTasks] = useState<WorkerTaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadTasks = async () => {
    try {
      setLoading(true)
      const t = await workflowService.workerTasks()
      setTasks(t)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const toggleTask = async (id: string) => {
    try {
      const updated = await workflowService.toggleWorkerTask(id)
      setTasks((prev) =>
        prev.map((t) => ((t._id || t.id) === id ? updated : t))
      )
    } catch (err) {
      console.error('Failed to toggle worker task:', err)
    }
  }

  const completed = tasks.filter((t) => t.done).length

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 28 · Frontline Shift Tasks
            </span>
            <span className="text-slate-400 text-xs">Pre-Shift Statutory Checks (Live MongoDB)</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            My Statutory Tasks & Checklists
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Daily pre-shift inspections and physical safety verifications required under DGMS regulations.
          </p>
        </div>

        <span className="text-xs font-bold text-minsos-700 bg-minsos-50 px-3 py-1.5 rounded-xl border border-minsos-200">
          {completed} of {tasks.length} Tasks Verified
        </span>
      </div>

      <SectionCard title="Shift A Task Execution Sheet" subtitle="Tap on any checklist item to complete verification">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading tasks from MongoDB Atlas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No shift tasks currently assigned.</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => {
              const taskId = t._id || t.id || ''
              return (
                <div
                  key={taskId}
                  onClick={() => toggleTask(taskId)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                    t.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-minsos-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => undefined}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
                    />
                    <div>
                      <h4 className={`text-sm font-bold ${t.done ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                        {t.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">Category: {t.category}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg ${t.done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {t.time}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export function WorkerAttendancePage() {
  const [attendanceLogs, setAttendanceLogs] = useState<WorkerAttendanceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const logs = await workflowService.workerAttendanceHistory()
        setAttendanceLogs(logs)
      } catch (err) {
        console.error('Failed to load attendance logs:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
            Module 29 · Biometric Muster Record
          </span>
          <span className="text-slate-400 text-xs">Mines Act Section 48 (Live MongoDB)</span>
        </div>
        <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
          My Biometric Shift Attendance History
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Digital turnstile punch records, shift rosters, and statutory weekly day-of-rest verifications.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Shifts Recorded</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {loading ? '...' : `${attendanceLogs.length} Shifts`}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">100% Biometric Turnstile Verified</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Overtime Hours</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">2.5 Hours</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Approved by Overman</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-medium text-slate-500">Statutory Rest Days</p>
          <p className="text-2xl font-bold text-minsos-700 mt-1">1 Day</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Next Rest: 10 Sep</p>
        </div>
      </div>

      <SectionCard title="Pit Turnstile Muster Log" subtitle="Recorded via biometric facial & fingerprint turnstiles at pit head">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-minsos-600 border-t-transparent rounded-full mb-2"></div>
            <p>Loading biometric muster logs from MongoDB Atlas...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Calendar Date</th>
                  <th className="px-4 py-3">Shift Timing</th>
                  <th className="px-4 py-3">Turnstile In</th>
                  <th className="px-4 py-3">Turnstile Out</th>
                  <th className="px-4 py-3">Muster Gate</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {attendanceLogs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{log.date}</td>
                    <td className="px-4 py-3.5 text-slate-600">{log.shift}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-800">{log.inTime}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-800">{log.outTime}</td>
                    <td className="px-4 py-3.5 text-slate-600">{log.gate}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {log.status}
                      </span>
                    </td>
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

export function WorkerTrainingPage() {
  const certs = [
    { name: 'DGMS Mines Vocational Training Rules 1966 Certificate', issuer: 'BCCL Vocational Training Centre, Dhanbad', validUntil: '14 Nov 2026', status: 'Active & Valid' },
    { name: 'Underground Gas Testing & Multi-Gas Detector Competency', issuer: 'DGMS Board of Mining Examinations', validUntil: '20 Mar 2027', status: 'Active & Valid' },
    { name: 'St. John Ambulance First-Aid in Mines Certificate', issuer: 'St. John Ambulance Association', validUntil: '08 Jan 2027', status: 'Active & Valid' },
    { name: 'Self-Contained Self-Rescuer (SCSR) Donning & Escape Protocol', issuer: 'Colliery Safety Directorate', validUntil: '30 Dec 2026', status: 'Active & Valid' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
            Module 30 · Statutory Vocational Training
          </span>
          <span className="text-slate-400 text-xs">Mines Vocational Training Rules 1966</span>
        </div>
        <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
          My DGMS Safety & Vocational Training Certificates
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Mandatory vocational refresher courses, gas testing certifications, and first-aid badges.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {certs.map((c, idx) => (
          <div key={idx} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-2xl">🎓</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                ✓ {c.status}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{c.issuer}</p>
            </div>
            <div className="border-t border-slate-100 pt-2.5 flex justify-between text-xs">
              <span className="text-slate-400">Validity Expiry:</span>
              <span className="font-semibold text-slate-800 font-mono">{c.validUntil}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WorkerProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
            Module 31 · Digital Smart Identity
          </span>
          <span className="text-slate-400 text-xs">Coal India Frontline Credentials</span>
        </div>
        <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
          Colliery Personnel Profile & Digital ID Card
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Digital colliery badge with medical fitness ratings, emergency blood group, and SOS contacts.
        </p>
      </div>

      {/* Digital ID Card */}
      <div className="max-w-xl bg-gradient-to-br from-slate-900 via-minsos-950 to-slate-900 text-white p-6 rounded-3xl border border-minsos-600/30 shadow-xl space-y-6">
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
            <div>
              <p className="text-[10px] uppercase font-bold text-minsos-400 tracking-widest">MINISTRY OF COAL · COAL INDIA</p>
              <h3 className="font-extrabold text-lg text-white">MINSOS DIGITAL IDENTITY</h3>
            </div>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-400/30 font-bold">
            PME CLASS I
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-4xl shrink-0">
            👷
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-white">{user?.name || 'Ramesh Kumar Murmu'}</h2>
            <p className="text-xs text-minsos-300 font-mono">EMP ID: EMP-BCCL-7821</p>
            <p className="text-xs text-slate-300">Continuous Miner Operator · Jharia Seam 4</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Blood Group</p>
            <p className="font-bold text-red-400 mt-0.5 text-sm">O +ve</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Emergency SOS</p>
            <p className="font-mono text-slate-200 mt-0.5">+91 98351 12345</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">PME Medical</p>
            <p className="font-semibold text-emerald-400 mt-0.5">Valid till 2027</p>
          </div>
        </div>
      </div>
    </div>
  )
}
