import { useState, useEffect } from 'react'
import type { ScanConfig, TabId } from '../App'
import { classifyTool, computeScore, gradeScore, type ToolLevel } from '../lib/classifier'

interface Props {
  config: ScanConfig | null
  trigger: number
  onBadge: (id: TabId, badge: string, badgeColor: string) => void
  onComplete?: () => void
}

interface ToolEntry {
  name: string
  description?: string
  level: ToolLevel
  inputSchema?: Record<string, unknown>
}

const LEVEL_LABEL: Record<ToolLevel, string> = { safe: 'SAFE', warn: 'NEEDS REVIEW', danger: 'DANGEROUS' }
const LEVEL_COLOR: Record<ToolLevel, string> = { safe: '#22c55e', warn: '#eab308', danger: '#ef4444' }
const LEVEL_ORDER: Record<ToolLevel, number> = { danger: 0, warn: 1, safe: 2 }

export function Inspector({ config, trigger, onBadge, onComplete }: Props) {
  const [tools, setTools] = useState<ToolEntry[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [grade, setGrade] = useState<{ letter: string; color: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (trigger === 0 || !config) return

    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      setTools([])
      setScore(null)
      setGrade(null)

      try {
        const base = config.url.replace(/\/+$/, '')
        const headers: Record<string, string> = { ...config.headers }
        let rawTools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> = []

        // Try REST GET first
        try {
          const res = await fetch(`${base}/tools`, {
            headers,
            cache: 'no-store',
          })
          if (res.ok) {
            const data = await res.json()
            rawTools = Array.isArray(data) ? data : data?.tools ?? []
          }
        } catch {
          // ignore, try JSON-RPC
        }

        // Fallback: JSON-RPC POST
        if (rawTools.length === 0) {
          try {
            const res = await fetch(base, {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              cache: 'no-store',
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list',
                params: {},
              }),
            })
            if (res.ok) {
              const data = await res.json()
              rawTools = data?.result?.tools ?? []
            }
          } catch {
            // both failed
          }
        }

        if (cancelled) return

        if (rawTools.length === 0) {
          setError('No tools found. The server may not expose a /tools endpoint or JSON-RPC tools/list method.')
          onBadge('inspector', '--', '#666')
          onComplete?.()
          setLoading(false)
          return
        }

        // Deduplicate by name
        const seen = new Set<string>()
        const unique = rawTools.filter(t => {
          if (seen.has(t.name)) return false
          seen.add(t.name)
          return true
        })

        // Classify
        const classified: ToolEntry[] = unique.map(t => ({
          name: t.name,
          description: t.description,
          level: classifyTool(t.name, t.description),
          inputSchema: t.inputSchema,
        }))

        // Sort: dangerous first, then review, then safe
        classified.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])

        const safeCount = classified.filter(t => t.level === 'safe').length
        const dangerCount = classified.filter(t => t.level === 'danger').length
        const total = classified.length

        const s = computeScore(safeCount, dangerCount, total, config.authenticated)
        const g = gradeScore(s)

        if (!cancelled) {
          setTools(classified)
          setScore(s)
          setGrade(g)
          onBadge('inspector', g.letter, g.color)
          onComplete?.()
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Scan failed')
          onBadge('inspector', '!', '#ef4444')
          onComplete?.()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [trigger])

  if (!config) {
    return <p className="text-[var(--color-dim)] text-sm">No scan results yet. Enter a server URL above and click Scan.</p>
  }

  if (loading) {
    return <p className="text-[var(--color-dim)] text-sm animate-pulse">Inspecting tools...</p>
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>
  }

  if (!grade || score === null) {
    return <p className="text-[var(--color-dim)] text-sm">No scan results yet. Enter a server URL above and click Scan.</p>
  }

  const safeCount = tools.filter(t => t.level === 'safe').length
  const warnCount = tools.filter(t => t.level === 'warn').length
  const dangerCount = tools.filter(t => t.level === 'danger').length

  const badgeMd = `![MCP Security: ${grade.letter}](https://img.shields.io/badge/MCP_Security-${encodeURIComponent(grade.letter)}_${score}%2F100-${grade.color.replace('#', '')}?style=flat-square)`

  return (
    <div className="space-y-5">
      {/* Grade card */}
      <div className="flex items-center gap-5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black shrink-0"
          style={{ backgroundColor: grade.color + '18', color: grade.color, border: `2px solid ${grade.color}40` }}
        >
          {grade.letter}
        </div>
        <div>
          <div className="text-white text-lg font-semibold">{score} / 100</div>
          <div className="text-[var(--color-dim)] text-sm mt-0.5">
            Security score based on tool classification{config.authenticated ? ' (authenticated)' : ' (unauthenticated)'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: tools.length, color: '#94a3b8' },
          { label: 'Safe', value: safeCount, color: '#22c55e' },
          { label: 'Review', value: warnCount, color: '#eab308' },
          { label: 'Dangerous', value: dangerCount, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 text-center">
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tool list */}
      <div>
        <h3 className="text-xs text-[var(--color-dim)] uppercase tracking-wider mb-2">Tools ({tools.length})</h3>
        <div className="space-y-1.5">
          {tools.map(t => (
            <div
              key={t.name}
              className="flex items-start gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5"
            >
              <span
                className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5"
                style={{
                  color: LEVEL_COLOR[t.level],
                  backgroundColor: LEVEL_COLOR[t.level] + '18',
                  border: `1px solid ${LEVEL_COLOR[t.level]}30`,
                }}
              >
                {LEVEL_LABEL[t.level]}
              </span>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">{t.name}</div>
                {t.description && (
                  <div className="text-[var(--color-dim)] text-xs mt-0.5 line-clamp-2">{t.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badge section */}
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-xs text-[var(--color-dim)] uppercase tracking-wider mb-2">Badge</h3>
        <p className="text-[var(--color-dim)] text-xs mb-2">Add this to your README:</p>
        <pre className="bg-[#0d0d14] border border-[var(--color-border)] rounded-md px-3 py-2 text-xs text-[var(--color-dim)] overflow-x-auto select-all">
          {badgeMd}
        </pre>
      </div>
    </div>
  )
}
