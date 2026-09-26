import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'
import { RoleIcon } from '../components/icons'

interface RoleScopeOption {
  role: Role
  label: string
  subtitle: string
  icon: string
  email: string
  password: string
  description: string
  badgeColor: string
}

const STATUTORY_SCOPES: RoleScopeOption[] = [
  {
    role: 'safety_officer',
    label: 'Safety Officer',
    subtitle: 'DGMS Certified Lead',
    icon: '🛡️',
    email: 'safety@minsos.coal.gov.in',
    password: 'Password@12345',
    description: 'Statutory Section 22 stop-work orders, hazard mitigation, and corrective action verification.',
    badgeColor: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    role: 'mine_manager',
    label: 'Mine Manager',
    subtitle: 'Statutory First Class',
    icon: '⛏️',
    email: 'manager@minsos.coal.gov.in',
    password: 'Password@12345',
    description: 'Leasehold operational management, monthly DGMS returns sign-off, and contractor oversight.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    role: 'corporate_officer',
    label: 'Corporate Officer',
    subtitle: 'Coal India Directorate',
    icon: '🏛️',
    email: 'corporate@minsos.coal.gov.in',
    password: 'Password@12345',
    description: 'Enterprise governance across Eastern & Central subsidiaries, AI risk models, and GIS tracking.',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    role: 'regulator',
    label: 'Regulator',
    subtitle: 'DGMS Inspectorate',
    icon: '⚖️',
    email: 'regulator@minsos.coal.gov.in',
    password: 'Password@12345',
    description: 'Independent statutory audits, violation notices, non-compliance penalties, and Ministry reporting.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    role: 'worker',
    label: 'Mine Worker',
    subtitle: 'Pit & Frontline Operator',
    icon: '👷',
    email: 'worker@minsos.coal.gov.in',
    password: 'Password@12345',
    description: 'Rapid near-miss and incident reporting with GPS photo evidence and shift safety notifications.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    role: 'admin',
    label: 'Administrator',
    subtitle: 'System & Security Admin',
    icon: '⚙️',
    email: 'admin@minsos.coal.gov.in',
    password: 'Password@12345',
    description: 'Root access to mine master records, contractor rosters, user provisioning, and immutable audit logs.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300'
  }
]

export function LoginPage() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Selected statutory scope (default: Safety Officer)
  const [selectedRole, setSelectedRole] = useState<Role>('safety_officer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('safety@minsos.coal.gov.in')
  const [password, setPassword] = useState('Password@12345')
  const [remember, setRemember] = useState(true)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />

  const currentScope = STATUTORY_SCOPES.find((s) => s.role === selectedRole) || STATUTORY_SCOPES[0]

  const handleSelectRole = (scope: RoleScopeOption) => {
    setSelectedRole(scope.role)
    setError('')
    if (mode === 'login') {
      setEmail(scope.email)
      setPassword(scope.password)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim()) return setError('Enter your registered email address.')
    if (mode === 'register' && name.trim().length < 2)
      return setError('Enter your full name using at least 2 characters.')
    if (password.length < 8)
      return setError('Password must contain at least 8 characters.')

    setWorking(true)
    const result =
      mode === 'login'
        ? await login(email, password, remember)
        : await register(name, email, password, remember, selectedRole)
    setWorking(false)

    if (!result.success) {
      return setError(result.message ?? 'Unable to complete the authentication request.')
    }
    navigate('/dashboard')
  }

  const registerMode = mode === 'register'

  return (
    <main className="lg:grid lg:grid-cols-[1.05fr_.95fr] bg-slate-100 min-h-screen">
      {/* Left Brand Showcase Section */}
      <section className="hidden relative lg:flex lg:flex-col lg:justify-between bg-minsos-900 px-12 py-12 overflow-hidden text-white">
        <div className="-top-24 -right-32 absolute border border-cyan-300/10 rounded-full w-96 h-96" />
        <div className="bottom-0 left-0 absolute bg-[linear-gradient(135deg,transparent_45%,rgba(12,92,156,.18)_45%,rgba(12,92,156,.18)_55%,transparent_55%)] w-full h-64" />
        
        {/* Logo */}
        <div className="relative flex items-center gap-4">
          <img
            src="/logo.jpeg"
            alt="MINSOS logo"
            className="rounded-xl w-14 h-14 object-cover shadow-lg"
          />
          <div>
            <p className="font-bold text-white text-xl tracking-[.14em]">MINSOS</p>
            <p className="text-slate-400 text-sm">
              Mining Intelligence & Smart Operations System
            </p>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Ministry of Coal · Coal India Limited (SIH26024)</span>
          </div>
          <h1 className="mt-5 font-semibold text-white text-4xl leading-tight">
            Comprehensive Statutory Governance & Smart Mine Operations
          </h1>
          <p className="mt-5 text-slate-300 text-sm leading-relaxed">
            Multi-tier role-based intelligence designed for Coal India mine managers, DGMS safety officers, corporate executives, and regulatory inspectors.
          </p>

          {/* Highlights */}
          <div className="gap-4 grid grid-cols-3 mt-8 pt-6 border-white/10 border-t text-sm">
            <div>
              <p className="font-bold text-white text-2xl">5</p>
              <p className="mt-1 text-slate-400 text-xs">Coalfields Active</p>
            </div>
            <div>
              <p className="font-bold text-emerald-400 text-2xl">100%</p>
              <p className="mt-1 text-slate-400 text-xs">DGMS Verified</p>
            </div>
            <div>
              <p className="font-bold text-cyan-300 text-2xl">Real-time</p>
              <p className="mt-1 text-slate-400 text-xs">Gas Telemetry</p>
            </div>
          </div>
        </div>

        <p className="relative text-slate-500 text-xs">
          WGS-84 Leaflet Mapping · Bayesian Strata Hazard Analytics · CMR 2017 Regulatory Framework
        </p>
      </section>

      {/* Right Login Section */}
      <section className="flex justify-center items-center px-4 sm:px-8 py-8 min-h-screen overflow-y-auto">
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img
              src="/logo.jpeg"
              alt="MINSOS logo"
              className="rounded-lg w-10 h-10 object-cover"
            />
            <div>
              <p className="font-bold text-minsos-900 tracking-[.14em]">MINSOS</p>
              <p className="text-slate-500 text-xs">Mining Governance Platform</p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-minsos-600 text-xs uppercase tracking-wider">
              {registerMode ? 'New Officer Onboarding' : 'Statutory Authentication'}
            </p>
            <h2 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
              {registerMode ? 'Create Statutory Account' : 'Select User Scope & Sign In'}
            </h2>
            <p className="mt-1 text-slate-500 text-xs">
              {registerMode
                ? 'Select your designated statutory position and register your workspace access.'
                : 'Choose your operational scope below to authenticate with designated DGMS authorities.'}
            </p>
          </div>

          {/* 1. Interactive Role Scope Selector Grid */}
          <div className="mt-5">
            <label className="block font-semibold text-slate-800 text-xs mb-2">
              Designated Statutory Role Scope:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STATUTORY_SCOPES.map((scope) => {
                const isSelected = selectedRole === scope.role
                return (
                  <button
                    key={scope.role}
                    type="button"
                    onClick={() => handleSelectRole(scope)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition relative ${
                      isSelected
                        ? 'border-minsos-600 bg-minsos-50/70 ring-2 ring-minsos-600/20 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                        isSelected
                          ? 'bg-minsos-600 text-white border-minsos-600'
                          : 'bg-minsos-50 text-minsos-700 border-minsos-200/80'
                      }`}>
                        <RoleIcon role={scope.role} className="h-4 w-4" />
                      </div>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-minsos-600 animate-pulse" />
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-xs mt-1.5 leading-tight">
                      {scope.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-tight truncate w-full">
                      {scope.subtitle}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Scope Authority Description Banner */}
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${currentScope.badgeColor}`}>
                  {currentScope.label} Scope
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  {currentScope.subtitle}
                </span>
              </div>
              <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">
                {currentScope.description}
              </p>
            </div>
          </div>

          {/* 2. Login / Register Form */}
          <form onSubmit={submit} className="space-y-4 mt-5" noValidate>
            {registerMode && (
              <div>
                <label
                  htmlFor="name"
                  className="block mb-1 font-semibold text-slate-700 text-xs"
                >
                  Full Official Name *
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="e.g. Er. Rajesh Kumar"
                  className="bg-white px-3.5 py-2.5 border border-slate-300 focus:border-minsos-500 rounded-lg outline-none focus:ring-2 focus:ring-minsos-100 w-full placeholder:text-slate-400 text-xs transition"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="email"
                  className="font-semibold text-slate-700 text-xs"
                >
                  Official Registered Email *
                </label>
                {mode === 'login' && (
                  <span className="text-[10px] text-minsos-600 font-medium">
                    Pre-filled for demo
                  </span>
                )}
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="name@minsos.coal.gov.in"
                className="bg-white px-3.5 py-2.5 border border-slate-300 focus:border-minsos-500 rounded-lg outline-none focus:ring-2 focus:ring-minsos-100 w-full placeholder:text-slate-400 text-xs font-mono transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-1 font-semibold text-slate-700 text-xs"
              >
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={registerMode ? 'new-password' : 'current-password'}
                  placeholder="Minimum 8 characters"
                  className="bg-white px-3.5 py-2.5 pr-14 border border-slate-300 focus:border-minsos-500 rounded-lg outline-none focus:ring-2 focus:ring-minsos-100 w-full placeholder:text-slate-400 text-xs font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  className="right-0 absolute inset-y-0 px-3.5 font-semibold text-minsos-600 hover:text-minsos-800 text-xs"
                >
                  {visible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-red-50 px-3 py-2 border border-red-200 rounded-lg text-red-700 text-xs"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="border-slate-300 rounded focus:ring-minsos-500 w-3.5 h-3.5 text-minsos-600"
                />
                <span>Remember session on this station</span>
              </label>
            </div>

            <button
              disabled={working}
              type="submit"
              className="bg-minsos-600 hover:bg-minsos-700 disabled:opacity-70 shadow-sm px-4 py-2.5 rounded-lg focus:outline-none focus:ring-4 focus:ring-minsos-200 w-full font-semibold text-white text-xs transition disabled:cursor-wait"
            >
              {working
                ? 'Authenticating with MINSOS Authority…'
                : registerMode
                ? `Register as ${currentScope.label}`
                : `Sign In as ${currentScope.label}`}
            </button>
          </form>

          {/* Toggle Login vs Register */}
          <button
            type="button"
            onClick={() => {
              setMode(registerMode ? 'login' : 'register')
              setError('')
            }}
            className="mt-4 w-full font-semibold text-minsos-600 hover:text-minsos-800 text-xs text-center"
          >
            {registerMode
              ? 'Already registered? Sign in with designated role'
              : 'Need new statutory credential enrollment? Create account'}
          </button>
        </div>
      </section>
    </main>
  )
}
