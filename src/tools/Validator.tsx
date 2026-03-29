import { useState, useEffect } from 'react'
import type { ScanConfig, TabId } from '../App'

interface Props {
  config: ScanConfig | null
  trigger: number
  onBadge: (id: TabId, badge: string, badgeColor: string) => void
}

type CheckStatus = 'pass' | 'fail' | 'warn' | 'pending'

interface CheckResult {
  id: string
  label: string
  status: CheckStatus
  detail: string
}

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: '\u2713',   // checkmark
  fail: '\u2717',   // x mark
  warn: '!',
  pending: '\u2026', // ellipsis
}

const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: '#22c55e',
  fail: '#ef4444',
  warn: '#eab308',
  pending: '#666',
}

const INITIAL_CHECKS: CheckResult[] = [
  { id: 'health', label: 'Health endpoint', status: 'pending', detail: '' },
  { id: 'sse', label: 'SSE transport', status: 'pending', detail: '' },
  { id: 'jsonrpc', label: 'JSON-RPC protocol', status: 'pending', detail: '' },
  { id: 'rest', label: 'REST tools endpoint', status: 'pending', detail: '' },
  { id: 'cors', label: 'CORS headers', status: 'pending', detail: '' },
  { id: 'authz', label: 'Auth enforcement', status: 'pending', detail: '' },
  { id: 'descriptions', label: 'Tool descriptions', status: 'pending', detail: '' },
  { id: 'schemas', label: 'Input schemas', status: 'pending', detail: '' },
]

export function Validator({ config, trigger, onBadge }: Props) {
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL_CHECKS)
  const [loading, setLoading] = useState(false)

  const updateCheck = (id: string, status: CheckStatus, detail: string, prev: CheckResult[]): CheckResult[] =>
    prev.map(c => c.id === id ? { ...c, status, detail } : c)

  useEffect(() => {
    if (trigger === 0 || !config) return

    let cancelled = false
    const run = async () => {
      setLoading(true)
      let current = INITIAL_CHECKS.map(c => ({ ...c }))
      setChecks(current)

      const base = config.url.replace(/\/+$/, '')
      const headers = { ...config.headers }
      const bust = `_cb=${Date.now()}`

      // 1. Health endpoint
      try {
        const res = await fetch(`${base}/health?${bust}`, { cache: 'no-store' })
        if (res.ok) {
          current = updateCheck('health', 'pass', `Status ${res.status}`, current)
        } else {
          current = updateCheck('health', 'fail', `Status ${res.status}`, current)
        }
      } catch (err) {
        current = updateCheck('health', 'fail', err instanceof Error ? err.message : 'Network error', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 2. SSE transport
      try {
        const res = await fetch(`${base}/sse?${bust}`, { headers, cache: 'no-store' })
        if (res.ok) {
          current = updateCheck('sse', 'pass', `Status ${res.status}`, current)
        } else {
          const text = await res.text().catch(() => '')
          if (text.toLowerCase().includes('auth')) {
            current = updateCheck('sse', 'pass', 'Auth required (expected)', current)
          } else {
            current = updateCheck('sse', 'warn', `Status ${res.status}`, current)
          }
        }
      } catch (err) {
        current = updateCheck('sse', 'fail', err instanceof Error ? err.message : 'Network error', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 3. JSON-RPC tools/list
      try {
        const res = await fetch(base, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.result?.tools) {
            current = updateCheck('jsonrpc', 'pass', `${data.result.tools.length} tools`, current)
          } else if (data?.error) {
            current = updateCheck('jsonrpc', 'warn', data.error.message || 'RPC error', current)
          } else {
            current = updateCheck('jsonrpc', 'pass', 'Response OK', current)
          }
        } else if (res.status === 404) {
          current = updateCheck('jsonrpc', 'pass', 'REST-only server', current)
        } else {
          current = updateCheck('jsonrpc', 'fail', `Status ${res.status}`, current)
        }
      } catch (err) {
        current = updateCheck('jsonrpc', 'fail', err instanceof Error ? err.message : 'Network error', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 4. REST /tools
      let toolsList: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> = []
      try {
        const res = await fetch(`${base}/tools?${bust}`, { headers, cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          toolsList = Array.isArray(data) ? data : data?.tools ?? []
          current = updateCheck('rest', 'pass', `${toolsList.length} tools`, current)
        } else {
          current = updateCheck('rest', 'fail', `Status ${res.status}`, current)
        }
      } catch (err) {
        current = updateCheck('rest', 'fail', err instanceof Error ? err.message : 'Network error', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 5. CORS check
      try {
        const res = await fetch(`${base}/health?${bust}`, { mode: 'cors', cache: 'no-store' })
        if (res.ok || res.type === 'cors') {
          current = updateCheck('cors', 'pass', 'CORS working', current)
        } else {
          current = updateCheck('cors', 'warn', `Status ${res.status}`, current)
        }
      } catch {
        current = updateCheck('cors', 'fail', 'CORS blocked or network error', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 6. Auth enforcement -- fetch without auth, expect 401/403
      try {
        const noAuthBust = `_noauth=${Date.now()}`
        const res = await fetch(`${base}/tools?${noAuthBust}`, { cache: 'no-store' })
        if (res.status === 401 || res.status === 403) {
          current = updateCheck('authz', 'pass', `Returned ${res.status} without credentials`, current)
        } else if (res.ok) {
          current = updateCheck('authz', 'fail', 'Tools accessible without auth', current)
        } else {
          current = updateCheck('authz', 'warn', `Status ${res.status}`, current)
        }
      } catch {
        current = updateCheck('authz', 'warn', 'Could not verify (network error)', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 7. Description coverage
      if (toolsList.length > 0) {
        const withDesc = toolsList.filter(t => t.description && t.description.trim().length > 0).length
        const pct = Math.round((withDesc / toolsList.length) * 100)
        if (pct > 80) {
          current = updateCheck('descriptions', 'pass', `${pct}% have descriptions (${withDesc}/${toolsList.length})`, current)
        } else if (pct > 50) {
          current = updateCheck('descriptions', 'warn', `${pct}% have descriptions (${withDesc}/${toolsList.length})`, current)
        } else {
          current = updateCheck('descriptions', 'fail', `${pct}% have descriptions (${withDesc}/${toolsList.length})`, current)
        }
      } else {
        current = updateCheck('descriptions', 'warn', 'No tools to check', current)
      }
      if (cancelled) return
      setChecks([...current])

      // 8. Input schema coverage
      if (toolsList.length > 0) {
        const withSchema = toolsList.filter(t => t.inputSchema && Object.keys(t.inputSchema).length > 0).length
        const pct = Math.round((withSchema / toolsList.length) * 100)
        if (pct > 80) {
          current = updateCheck('schemas', 'pass', `${pct}% have schemas (${withSchema}/${toolsList.length})`, current)
        } else if (pct > 50) {
          current = updateCheck('schemas', 'warn', `${pct}% have schemas (${withSchema}/${toolsList.length})`, current)
        } else {
          current = updateCheck('schemas', 'fail', `${pct}% have schemas (${withSchema}/${toolsList.length})`, current)
        }
      } else {
        current = updateCheck('schemas', 'warn', 'No tools to check', current)
      }
      if (cancelled) return
      setChecks([...current])

      // Update badge
      const passCount = current.filter(c => c.status === 'pass').length
      const total = current.length
      const badgeColor = passCount === total ? '#22c55e' : passCount >= total - 2 ? '#eab308' : '#ef4444'
      onBadge('validator', `${passCount}/${total}`, badgeColor)

      setLoading(false)
    }

    run()
    return () => { cancelled = true }
  }, [trigger])

  if (!config) {
    return <p className="text-[var(--color-dim)] text-sm">No scan results yet. Enter a server URL above and click Scan.</p>
  }

  if (loading && checks.every(c => c.status === 'pending')) {
    return <p className="text-[var(--color-dim)] text-sm animate-pulse">Running validation checks...</p>
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs text-[var(--color-dim)] uppercase tracking-wider mb-3">
        Spec Validation ({checks.filter(c => c.status === 'pass').length}/{checks.length} passed)
      </h3>
      {checks.map(c => (
        <div
          key={c.id}
          className="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5"
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              color: STATUS_COLOR[c.status],
              backgroundColor: STATUS_COLOR[c.status] + '18',
              border: `1.5px solid ${STATUS_COLOR[c.status]}40`,
            }}
          >
            {STATUS_ICON[c.status]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm">{c.label}</div>
            {c.detail && <div className="text-[var(--color-dim)] text-xs mt-0.5">{c.detail}</div>}
          </div>
          {c.status === 'pending' && loading && (
            <span className="text-[var(--color-dim)] text-xs animate-pulse">checking...</span>
          )}
        </div>
      ))}
    </div>
  )
}
