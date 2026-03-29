import { useState } from 'react'
import type { TabId } from '../App'
import { scanForKeys, type KeyFinding } from '../lib/api-key-patterns'

interface Props {
  onBadge: (id: TabId, badge: string, badgeColor: string) => void
}

function maskSnippet(snippet: string): string {
  // Mask the middle portion of any detected key in the snippet
  return snippet.replace(/([a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]{8,}([a-zA-Z0-9_-]{4})/g, '$1********$2')
}

export function KeyScanner({ onBadge }: Props) {
  const [code, setCode] = useState('')
  const [findings, setFindings] = useState<KeyFinding[] | null>(null)

  function handleScan() {
    const results = scanForKeys(code)
    setFindings(results)
    if (results.length > 0) {
      onBadge('keys', `${results.length} FOUND`, '#ef4444')
    } else {
      onBadge('keys', 'CLEAN', '#22c55e')
    }
  }

  const criticalCount = findings?.filter(f => f.severity === 'critical').length ?? 0
  const warningCount = findings?.filter(f => f.severity === 'warning').length ?? 0

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Key Scanner</h2>
        <p className="text-sm text-[var(--color-dim)]">
          Paste code, config files, or logs below to scan for leaked API keys and secrets.
        </p>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
          Code to scan
        </label>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={'Paste your code, .env file, or config here...\n\nExample:\nOPENAI_API_KEY=sk-proj-abc123def456...'}
          rows={10}
          className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm font-mono outline-none focus:border-blue-500 placeholder:text-[var(--color-dim2)] resize-y"
        />
      </div>

      <button
        onClick={handleScan}
        disabled={!code.trim()}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors mb-4"
      >
        Scan Code
      </button>

      {findings !== null && findings.length === 0 && (
        <div
          className="px-4 py-3 rounded-lg border border-[var(--color-border)] text-center"
          style={{ background: 'rgba(34,197,94,0.1)' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            No leaked keys detected
          </span>
          <p className="text-xs text-[var(--color-dim)] mt-1">
            No known API key patterns were found in the pasted code.
          </p>
        </div>
      )}

      {findings !== null && findings.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-[var(--color-dim)]">
              {findings.length} finding{findings.length !== 1 ? 's' : ''}
            </span>
            {criticalCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                {warningCount} warning
              </span>
            )}
          </div>

          <div className="space-y-2">
            {findings.map((f, i) => (
              <div
                key={i}
                className="px-4 py-3 rounded-lg border border-[var(--color-border)]"
                style={{
                  background: f.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium uppercase"
                    style={{
                      background: f.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
                      color: f.severity === 'critical' ? '#ef4444' : '#eab308',
                    }}
                  >
                    {f.severity}
                  </span>
                  <span className="text-sm font-semibold text-white">{f.provider}</span>
                  <span className="text-xs text-[var(--color-dim)]">Line {f.line}</span>
                </div>
                <code className="text-xs text-[var(--color-dim)] font-mono block mt-1 break-all">
                  {maskSnippet(f.snippet)}
                </code>
                {f.docs && (
                  <a
                    href={f.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1.5 inline-block"
                  >
                    Rotate this key
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
