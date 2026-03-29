import { useState, useCallback } from 'react'
import { ScanInput } from './components/ScanInput'
import { TabBar } from './components/TabBar'
import { Inspector } from './tools/Inspector'
import { Validator } from './tools/Validator'
import { ExposureCheck } from './tools/ExposureCheck'
import { KeyScanner } from './tools/KeyScanner'
import { CostCalculator } from './tools/CostCalculator'
import { ComplianceChecker } from './tools/ComplianceChecker'
import { McpStarter } from './tools/McpStarter'

export interface ScanConfig {
  url: string
  headers: Record<string, string>
  authenticated: boolean
}

export type TabId = 'inspector' | 'validator' | 'exposure' | 'keys' | 'cost' | 'compliance' | 'mcp-starter'

export interface TabDef {
  id: TabId
  label: string
  badge?: string
  badgeColor?: string
}

const INITIAL_TABS: TabDef[] = [
  { id: 'inspector', label: 'Security Inspector' },
  { id: 'validator', label: 'Spec Validator' },
  { id: 'exposure', label: 'Exposure Check' },
  { id: 'keys', label: 'Key Scanner' },
  { id: 'cost', label: 'Cost Calculator' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'mcp-starter', label: 'MCP Starter' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inspector')
  const [scanning, setScanning] = useState(false)
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null)
  const [scanTrigger, setScanTrigger] = useState(0)
  const [tabs, setTabs] = useState<TabDef[]>(INITIAL_TABS)

  const updateTabBadge = useCallback((id: TabId, badge: string, badgeColor: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, badge, badgeColor } : t))
  }, [])

  const handleScan = useCallback(async (config: ScanConfig) => {
    setScanConfig(config)
    setScanning(true)
    setScanTrigger(prev => prev + 1)
    setTimeout(() => setScanning(false), 30000)
  }, [])

  const handleScanComplete = useCallback(() => {
    setScanning(false)
  }, [])

  return (
    <div className="max-w-[860px] mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Authora Security Tools</h1>
        <p className="text-sm text-[var(--color-dim)]">
          Scan, validate, and audit AI agent infrastructure. Free, open, no signup. By{' '}
          <a href="https://authora.dev" className="text-blue-500 hover:underline">Authora</a>
        </p>
      </header>

      <ScanInput onScan={handleScan} scanning={scanning} />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] border-t-0 rounded-b-xl p-5 min-h-[250px]">
        {activeTab === 'inspector' && (
          <Inspector config={scanConfig} trigger={scanTrigger} onBadge={updateTabBadge} onComplete={handleScanComplete} />
        )}
        {activeTab === 'validator' && (
          <Validator config={scanConfig} trigger={scanTrigger} onBadge={updateTabBadge} />
        )}
        {activeTab === 'exposure' && (
          <ExposureCheck config={scanConfig} trigger={scanTrigger} onBadge={updateTabBadge} />
        )}
        {activeTab === 'keys' && <KeyScanner onBadge={updateTabBadge} />}
        {activeTab === 'cost' && <CostCalculator />}
        {activeTab === 'compliance' && <ComplianceChecker />}
        {activeTab === 'mcp-starter' && <McpStarter />}
      </div>

      <footer className="mt-10 text-center text-xs text-[var(--color-dim2)]">
        <a href="https://authora.dev" className="text-blue-500 hover:underline">Authora</a>
        {' -- Identity, coordination, and security for AI agents'}
        <div className="flex gap-4 justify-center mt-1.5">
          <a href="https://github.com/authora-dev/awesome-agent-security" className="text-blue-500 hover:underline">awesome-agent-security</a>
          <a href="https://www.npmjs.com/package/@authora/agent-audit" className="text-blue-500 hover:underline">npx @authora/agent-audit</a>
          <a href="https://authora.dev/developers/mcp" className="text-blue-500 hover:underline">MCP Docs</a>
        </div>
      </footer>
    </div>
  )
}
