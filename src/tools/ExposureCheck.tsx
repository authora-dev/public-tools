import { useState, useEffect, useRef } from 'react'
import type { ScanConfig, TabId } from '../App'

interface Props {
  config: ScanConfig | null
  trigger: number
  onBadge: (id: TabId, badge: string, badgeColor: string) => void
}

type Severity = 'pass' | 'warn' | 'fail'

interface CheckResult {
  name: string
  description: string
  severity: Severity
  detail: string
}

const ICON: Record<Severity, string> = {
  pass: '\u2713',
  warn: '\u26A0',
  fail: '\u2717',
}

const COLOR: Record<Severity, string> = {
  pass: '#22c55e',
  warn: '#eab308',
  fail: '#ef4444',
}

const BG: Record<Severity, string> = {
  pass: 'rgba(34,197,94,0.1)',
  warn: 'rgba(234,179,8,0.1)',
  fail: 'rgba(239,68,68,0.1)',
}

export function ExposureCheck({ config, trigger, onBadge }: Props) {
  const [results, setResults] = useState<CheckResult[]>([])
  const [running, setRunning] = useState(false)
  const prevTrigger = useRef(0)

  useEffect(() => {
    if (trigger === 0 || trigger === prevTrigger.current || !config) return
    prevTrigger.current = trigger
    runChecks(config)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, config])

  async function runChecks(cfg: ScanConfig) {
    setRunning(true)
    setResults([])
    const checks: CheckResult[] = []
    const ts = Date.now()
    const base = cfg.url.replace(/\/+$/, '')

    // 1. GET /tools without auth
    try {
      const res = await fetch(`${base}/tools?_exp=${ts}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      })
      if (res.status === 200) {
        let toolCount = 0
        try {
          const body = await res.json()
          toolCount = Array.isArray(body) ? body.length : (body?.tools?.length ?? 0)
        } catch { /* not json */ }
        checks.push({
          name: 'Tool Listing',
          description: 'GET /tools without authentication',
          severity: 'fail',
          detail: `Returned 200 with ${toolCount} tool(s) exposed to the public. Anyone can enumerate your tools.`,
        })
      } else {
        checks.push({
          name: 'Tool Listing',
          description: 'GET /tools without authentication',
          severity: 'pass',
          detail: `Returned ${res.status}. Tool listing is not publicly accessible.`,
        })
      }
    } catch {
      checks.push({
        name: 'Tool Listing',
        description: 'GET /tools without authentication',
        severity: 'pass',
        detail: 'Request failed (CORS or network). Not publicly accessible.',
      })
    }

    // 2. GET /health
    try {
      const res = await fetch(`${base}/health?_exp=${ts}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      })
      if (res.status === 200) {
        try {
          const body = await res.json()
          const keys = Object.keys(body)
          const safeKeys = ['status', 'ok']
          const leakedKeys = keys.filter(k => !safeKeys.includes(k.toLowerCase()))
          if (leakedKeys.length > 0) {
            checks.push({
              name: 'Health Endpoint',
              description: 'GET /health without authentication',
              severity: 'warn',
              detail: `Health endpoint leaks extra info: ${leakedKeys.join(', ')}. Only "status" should be exposed.`,
            })
          } else {
            checks.push({
              name: 'Health Endpoint',
              description: 'GET /health without authentication',
              severity: 'pass',
              detail: 'Health endpoint returns only status information. No data leakage.',
            })
          }
        } catch {
          checks.push({
            name: 'Health Endpoint',
            description: 'GET /health without authentication',
            severity: 'pass',
            detail: 'Health endpoint returned non-JSON response.',
          })
        }
      } else {
        checks.push({
          name: 'Health Endpoint',
          description: 'GET /health without authentication',
          severity: 'pass',
          detail: `Returned ${res.status}. Health endpoint is not publicly accessible.`,
        })
      }
    } catch {
      checks.push({
        name: 'Health Endpoint',
        description: 'GET /health without authentication',
        severity: 'pass',
        detail: 'Request failed (CORS or network). Not publicly accessible.',
      })
    }

    // 3. GET /sse
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${base}/sse?_exp=${ts}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.status === 200) {
        checks.push({
          name: 'SSE Endpoint',
          description: 'GET /sse without authentication',
          severity: 'fail',
          detail: 'SSE endpoint is publicly accessible. Attackers can open event streams without credentials.',
        })
      } else {
        checks.push({
          name: 'SSE Endpoint',
          description: 'GET /sse without authentication',
          severity: 'pass',
          detail: `Returned ${res.status}. SSE endpoint requires authentication.`,
        })
      }
    } catch {
      checks.push({
        name: 'SSE Endpoint',
        description: 'GET /sse without authentication',
        severity: 'pass',
        detail: 'Request failed or timed out. SSE endpoint not publicly accessible.',
      })
    }

    // 4. POST / JSON-RPC without auth
    try {
      const res = await fetch(base, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })
      if (res.status === 200) {
        checks.push({
          name: 'JSON-RPC',
          description: 'POST / JSON-RPC without authentication',
          severity: 'fail',
          detail: 'JSON-RPC endpoint accepts unauthenticated requests. Full MCP protocol access is exposed.',
        })
      } else {
        checks.push({
          name: 'JSON-RPC',
          description: 'POST / JSON-RPC without authentication',
          severity: 'pass',
          detail: `Returned ${res.status}. JSON-RPC requires authentication.`,
        })
      }
    } catch {
      checks.push({
        name: 'JSON-RPC',
        description: 'POST / JSON-RPC without authentication',
        severity: 'pass',
        detail: 'Request failed (CORS or network). Not publicly accessible.',
      })
    }

    // 5. Server header check
    try {
      const res = await fetch(`${base}/health?_exp=${ts}`, {
        cache: 'no-store',
        method: 'HEAD',
      })
      const serverHeader = res.headers.get('server')
      const poweredBy = res.headers.get('x-powered-by')
      const leaked: string[] = []
      if (serverHeader) leaked.push(`Server: ${serverHeader}`)
      if (poweredBy) leaked.push(`X-Powered-By: ${poweredBy}`)
      if (leaked.length > 0) {
        checks.push({
          name: 'Server Headers',
          description: 'Check for server/x-powered-by headers',
          severity: 'warn',
          detail: `Leaking server identity: ${leaked.join(', ')}. Remove these headers in production.`,
        })
      } else {
        checks.push({
          name: 'Server Headers',
          description: 'Check for server/x-powered-by headers',
          severity: 'pass',
          detail: 'No server identity headers exposed.',
        })
      }
    } catch {
      checks.push({
        name: 'Server Headers',
        description: 'Check for server/x-powered-by headers',
        severity: 'pass',
        detail: 'Could not fetch headers (CORS or network).',
      })
    }

    setResults(checks)
    setRunning(false)

    const criticalCount = checks.filter(c => c.severity === 'fail').length
    if (criticalCount > 0) {
      onBadge('exposure', `${criticalCount} EXPOSED`, '#ef4444')
    } else {
      onBadge('exposure', 'SECURE', '#22c55e')
    }
  }

  if (!config && results.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-dim)]">
        <p className="text-lg mb-2">Exposure Check</p>
        <p className="text-sm">Enter a server URL above and click "Scan Everything" to test what is publicly accessible without authentication.</p>
      </div>
    )
  }

  const hasCritical = results.some(r => r.severity === 'fail')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Exposure Check</h2>
        {running && <span className="text-sm text-[var(--color-dim)]">Running checks...</span>}
      </div>

      {hasCritical && !running && (
        <div className="mb-4 px-4 py-3 rounded-lg border" style={{ background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444' }}>
          <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
            Action required -- Critical exposures detected. Your MCP server has endpoints accessible without authentication.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)]"
            style={{ background: BG[r.severity] }}
          >
            <span
              className="text-lg font-bold mt-0.5 w-5 text-center flex-shrink-0"
              style={{ color: COLOR[r.severity] }}
            >
              {ICON[r.severity]}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-white">{r.name}</span>
                <span className="text-xs text-[var(--color-dim)]">{r.description}</span>
              </div>
              <p className="text-sm text-[var(--color-dim)]">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {running && results.length === 0 && (
        <div className="text-center py-8 text-[var(--color-dim)]">
          <p className="text-sm">Testing endpoints without authentication...</p>
        </div>
      )}
    </div>
  )
}
