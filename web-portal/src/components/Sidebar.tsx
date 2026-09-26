import { NavLink } from 'react-router-dom'
import { roleDetails } from '../data/mockUsers'
import { useAuth } from '../context/AuthContext'
import { getRoleNavItems } from '../config/navigationConfig'
import { NavIcon, SettingsIcon, LogoutIcon } from './icons'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()

  if (!user) return null
  const role = user.role
  const navItems = getRoleNavItems(role)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-white/20 text-white shadow-xs font-bold ring-1 ring-white/20'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`

  return (
    <>
      <button
        aria-label="Close navigation"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-950/40 lg:hidden ${open ? '' : 'hidden'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col bg-minsos-900 text-slate-100 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              className="h-10 w-10 rounded-lg object-cover"
              src="/logo.jpeg"
              alt="MINSOS logo"
            />
            <div>
              <p className="text-base font-bold tracking-[.14em]">MINSOS</p>
              <p className="text-xs text-slate-400">Governance & Compliance</p>
            </div>
          </div>
        </div>

        {/* Active Workspace Tag */}
        <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Active Workspace
            </p>
            <span className="text-[10px] bg-white/10 text-minsos-200 px-1.5 py-0.5 rounded font-mono font-bold">
              RBAC
            </span>
          </div>
          <p className="mt-0.5 text-xs font-bold text-white truncate">
            {roleDetails[role]?.label ?? role}
          </p>
        </div>

        {/* Navigation List Tailored to Current Role */}
        <nav aria-label="Main navigation" className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Permitted Capabilities ({navItems.length})
          </p>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              onClick={onClose}
              to={`/${role}/${item.path}`}
              className={linkClass}
            >
              <span className="flex h-5 w-5 items-center justify-center text-white/90" aria-hidden>
                <NavIcon path={item.path} className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Settings & Sign Out */}
        <div className="border-t border-white/10 p-3">
          <NavLink
            onClick={onClose}
            to={`/${role}/settings`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <SettingsIcon className="h-4 w-4 text-slate-300" />
            <span>Settings</span>
          </NavLink>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <LogoutIcon className="h-4 w-4 text-slate-300" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
