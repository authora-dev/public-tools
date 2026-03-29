import { useState } from 'react'
import type { ScanConfig } from '../App'
import { Select } from './Select'

type AuthType = 'none' | 'bearer' | 'api-key' | 'x-api-key'

const AUTH_OPTIONS = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer' },
  { value: 'api-key', label: 'API Key' },
  { value: 'x-api-key', label: 'X-API-Key' },
]

interface Props {
  onScan: (config: ScanConfig) => void
  scanning: boolean
}

export function ScanInput({ onScan, scanning }: Props) {
  const [url, setUrl] = useState('')
  const [authType, setAuthType] = useState<AuthType>('none')
  const [authValue, setAuthValue] = useState('')

  const handleScan = () => {
    let finalUrl = url.trim()
    if (!finalUrl) return
    if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`

    const headers: Record<string, string> = {}
    const authenticated = authType !== 'none' && !!authValue.trim()
    if (authType === 'bearer' && authValue) headers['Authorization'] = `Bearer ${authValue.trim()}`
    if (authType === 'api-key' && authValue) headers['api-key'] = authValue.trim()
    if (authType === 'x-api-key' && authValue) headers['X-API-Key'] = authValue.trim()

    onScan({ url: finalUrl, headers, authenticated })
  }

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 mb-6">
      <div className="mb-3">
        <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Server URL</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScan()}
          placeholder="https://mcp.example.com"
          className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500 placeholder:text-[var(--color-dim2)]"
        />
      </div>
      <div className="mb-3">
        <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Authentication</label>
        <div className="flex gap-2">
          <div className="w-[150px]">
            <Select
              value={authType}
              onChange={v => setAuthType(v as AuthType)}
              options={AUTH_OPTIONS}
              searchable={false}
            />
          </div>
          <input
            type="password"
            value={authValue}
            onChange={e => setAuthValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder="Token or API key"
            className="flex-1 px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500 placeholder:text-[var(--color-dim2)]"
          />
        </div>
      </div>
      <button
        onClick={handleScan}
        disabled={scanning || !url.trim()}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors"
      >
        {scanning ? 'Scanning...' : 'Scan Everything'}
      </button>
    </div>
  )
}
