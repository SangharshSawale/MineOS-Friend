import { useEffect, useRef, useState } from 'react'
import { workflowService, type WorkflowLookup } from '../services/workflow'
import type { AiAssistantQueryResponse } from '../types'
import {
  MinesIcon,
  ComplianceIcon,
  ViolationsIcon,
  IncidentsIcon,
  AiInsightsIcon,
  InspectionsIcon,
  ReportsIcon
} from '../components/icons'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  timestamp: string
  text?: string
  response?: AiAssistantQueryResponse
}

interface CapabilityChip {
  id: string
  label: string
  icon: string
  query: string
  mode: string
  description: string
}

const CAPABILITY_CHIPS: CapabilityChip[] = [
  {
    id: 'mines',
    label: 'Ask questions about mines',
    icon: '⛏️',
    query: 'Provide an operational and safety profile of all active colliery leases and coalfields.',
    mode: 'mines',
    description: 'Profiles, locations, telemetry & risk tiers'
  },
  {
    id: 'compliance',
    label: 'Ask compliance questions',
    icon: '📜',
    query: 'What are the statutory compliance requirements, PESO clearances, and DGMS mandates currently in effect?',
    mode: 'compliance',
    description: 'Statutory rules, PESO licenses & PCB norms'
  },
  {
    id: 'overdue_compliance',
    label: 'Find overdue compliances',
    icon: '⚠️',
    query: 'Find all overdue statutory clearances, expired licenses, and delinquent compliance obligations.',
    mode: 'overdue_compliance',
    description: 'Delinquent filings & Section 22 exposure'
  },
  {
    id: 'high_risk_mines',
    label: 'Find high-risk mines',
    icon: '🚨',
    query: 'Identify all high-risk and critical colliery sites requiring urgent statutory intervention.',
    mode: 'high_risk_mines',
    description: 'Critical colliery ranking & hazard hotspots'
  },
  {
    id: 'explain_risk_score',
    label: 'Explain risk score',
    icon: '📊',
    query: 'Explain the DGMS risk score calculation formula and break down the contributing factors for our mines.',
    mode: 'explain_risk_score',
    description: 'Multi-factor algorithm & weight breakdown'
  },
  {
    id: 'summarize_inspections',
    label: 'Summarize inspection reports',
    icon: '🔍',
    query: 'Summarize recent statutory safety inspections, DGMS inquiries, and audit follow-up notices.',
    mode: 'summarize_inspections',
    description: 'Audit outcomes, strata checks & inspector logs'
  },
  {
    id: 'summarize_violations',
    label: 'Summarize violations',
    icon: '⚡',
    query: 'Summarize all open hazard violations, critical methane spikes, and outstanding remedial deadlines.',
    mode: 'summarize_violations',
    description: 'Hazard register, severity breakdown & deadlines'
  },
  {
    id: 'management_insights',
    label: 'Generate management insights',
    icon: '💡',
    query: 'Generate executive management insights, contractor safety posture, and strategic board recommendations.',
    mode: 'management_insights',
    description: 'C-level risk briefing & resource allocation'
  }
]

function renderChipIcon(id: string) {
  switch (id) {
    case 'mines':
      return <MinesIcon className="h-4 w-4 text-minsos-700" />
    case 'compliance':
      return <ComplianceIcon className="h-4 w-4 text-minsos-700" />
    case 'overdue_compliance':
      return <ViolationsIcon className="h-4 w-4 text-amber-700" />
    case 'high_risk_mines':
      return <IncidentsIcon className="h-4 w-4 text-red-700" />
    case 'explain_risk_score':
      return <AiInsightsIcon className="h-4 w-4 text-minsos-700" />
    case 'summarize_inspections':
      return <InspectionsIcon className="h-4 w-4 text-minsos-700" />
    case 'summarize_violations':
      return <ViolationsIcon className="h-4 w-4 text-orange-700" />
    default:
      return <ReportsIcon className="h-4 w-4 text-minsos-700" />
  }
}

export function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString(),
      text: 'Namaste. I am the MINSOS DGMS AI Governance Assistant. I provide real-time, mathematically grounded statutory insights across Coal India Limited collieries. How may I assist your statutory oversight today?'
    }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [mines, setMines] = useState<WorkflowLookup[]>([])
  const [selectedMineId, setSelectedMineId] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    workflowService.mines().then((m) => setMines(m)).catch(() => undefined)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendQuery = async (queryText: string, explicitMode?: string) => {
    if (!queryText.trim() || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      text: queryText
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setLoading(true)

    try {
      const res = await workflowService.aiAssistantQuery({
        query: queryText,
        mode: explicitMode,
        mineId: selectedMineId || undefined
      })

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        response: res
      }

      setMessages((prev) => [...prev, botMsg])
    } catch {
      const errMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Unable to query statutory knowledge base. Please check backend network connectivity and try again.'
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleChipClick = (chip: CapabilityChip) => {
    sendQuery(chip.query, chip.mode)
  }

  const clearChat = () => {
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Conversational ledger cleared. Ready for new statutory governance inquiry.'
      }
    ])
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-minsos-100 text-minsos-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-minsos-200">
              Module 18 · Grounded Conversational AI
            </span>
            <span className="text-slate-400 text-xs">Section 22 Mines Act 1952</span>
          </div>
          <h1 className="mt-1 font-bold text-slate-900 text-2xl tracking-tight">
            DGMS AI Governance Assistant
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Statutory reasoning engine grounded directly in live MongoDB telemetry, DGMS inspection registers, and hazard logs.
          </p>
        </div>

        {/* Scope Selector and Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMineId}
            onChange={(e) => setSelectedMineId(e.target.value)}
            className="bg-white px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs shadow-xs focus:ring-2 focus:ring-minsos-500"
          >
            <option value="">All Subsidiary Coalfields</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label ?? m.name}
              </option>
            ))}
          </select>
          <button
            onClick={clearChat}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            Clear Session
          </button>
        </div>
      </div>

      {/* 8 Statutory Capability Chips Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick Statutory Inquiries (8 Grounded Capabilities)
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            ✓ 100% Grounded in Live Database
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CAPABILITY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleChipClick(chip)}
              disabled={loading}
              className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-minsos-50/50 hover:border-minsos-300 text-left transition group active:scale-98 disabled:opacity-50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-minsos-100/80 border border-minsos-200 text-minsos-700 mt-0.5">
                {renderChipIcon(chip.id)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-800 group-hover:text-minsos-900 leading-tight">
                  {chip.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{chip.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[640px] overflow-hidden">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex justify-end items-start gap-2.5">
                  <div className="max-w-2xl bg-minsos-900 text-white p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-xs sm:text-sm">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[10px] text-minsos-300 mt-1.5 text-right font-mono">
                      {msg.timestamp}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    👤
                  </div>
                </div>
              )
            }

            // Assistant Message
            return (
              <div key={msg.id} className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  💬
                </div>
                <div className="max-w-3xl flex-1 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs space-y-4 text-xs sm:text-sm text-slate-800">
                  {/* Basic text message */}
                  {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                  {/* Rich Grounded Query Response */}
                  {msg.response && (
                    <div className="space-y-4">
                      {/* Intent & Mode Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                            ✓ {msg.response.intent}
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono">
                            Mode: {msg.response.mode}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[10px] font-mono">
                          Grounded: {new Date(msg.response.groundedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Executive Summary */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1 text-minsos-700">
                          Executive Statutory Synthesis
                        </p>
                        <p className="text-slate-700 leading-relaxed">{msg.response.summary}</p>
                      </div>

                      {/* Grounded Key Findings */}
                      {msg.response.keyFindings && msg.response.keyFindings.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Key Verified Findings:
                          </p>
                          <ul className="space-y-1 text-slate-700">
                            {msg.response.keyFindings.map((finding, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                                <span className="leading-snug">{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Data Point KPI Badges */}
                      {msg.response.dataPoints && msg.response.dataPoints.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {msg.response.dataPoints.map((dp, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border ${
                                dp.badgeTone === 'red'
                                  ? 'bg-red-50 border-red-200 text-red-900'
                                  : dp.badgeTone === 'amber'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : dp.badgeTone === 'green'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-blue-50 border-blue-200 text-blue-900'
                              }`}
                            >
                              <p className="text-[10px] font-medium opacity-80">{dp.label}</p>
                              <p className="text-base font-bold mt-0.5">{dp.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tabular Evidence Matrix */}
                      {msg.response.table && msg.response.table.rows.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-2">
                          <div className="overflow-x-auto max-h-60">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0 border-b border-slate-200">
                                <tr>
                                  {msg.response.table.columns.map((c) => (
                                    <th key={c.key} className="px-3 py-2">
                                      {c.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {msg.response.table.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-50/70">
                                    {msg.response!.table!.columns.map((c) => (
                                      <td key={c.key} className="px-3 py-2">
                                        {String(row[c.key] ?? '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Recommended Statutory Actions */}
                      {msg.response.recommendedActions && msg.response.recommendedActions.length > 0 && (
                        <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl space-y-1">
                          <p className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                            <span>🛡️</span> Recommended Statutory Directives
                          </p>
                          <ul className="space-y-1 text-slate-700 text-xs">
                            {msg.response.recommendedActions.map((act, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-amber-600 font-bold shrink-0">→</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Statutory Authority Footer */}
                      <p className="text-[10px] text-slate-400 border-t border-slate-200 pt-2 font-mono">
                        {msg.response.authorityNotice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Thinking State Indicator */}
          {loading && (
            <div className="flex justify-start items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 animate-pulse">
                💬
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-xs space-y-2 text-xs">
                <div className="flex items-center gap-2 text-minsos-800 font-medium">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-minsos-600 border-t-transparent" />
                  <span>Synthesizing DGMS statutory records & calculating telemetry weights...</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Cross-referencing Mines Act 1952, active inspections, and hazard violation registry...
                </p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 p-3 sm:p-4 bg-slate-50/80">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendQuery(inputText)
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask questions about mines, compliance, overdue items, risk scores, or management insights..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white px-4 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-minsos-500 focus:border-minsos-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="bg-minsos-900 hover:bg-minsos-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Send</span>
              <span>→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
