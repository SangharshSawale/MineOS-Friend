import type { ReactNode } from 'react'

export function StatusBadge({ value }: { value: string }) {
  const valueClass = value.toLowerCase()
  const color = valueClass.includes('high') || valueClass.includes('overdue') || valueClass === 'open' ? 'bg-red-50 text-red-700 ring-red-600/15' : valueClass.includes('medium') || valueClass.includes('review') || valueClass.includes('progress') || valueClass.includes('follow') || valueClass.includes('observation') ? 'bg-amber-50 text-amber-700 ring-amber-600/15' : valueClass.includes('low') || valueClass.includes('complete') || valueClass.includes('compliant') || valueClass.includes('resolved') ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-slate-100 text-slate-700 ring-slate-600/15'
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${color}`}>{value}</span>
}
export function SectionCard({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white ${className}`}><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>{action}</div>{children}</section>
}
export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="px-5 py-12 text-center"><p className="font-medium text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div> }
export function LoadingState() { return <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="mt-4 h-20 rounded bg-slate-100" /></div> }
