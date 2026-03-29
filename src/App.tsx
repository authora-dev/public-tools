import { useState, useCallback } from 'react'
import { ScanInput } from './components/ScanInput'
import { Sidebar } from './components/Sidebar'
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

export type ToolId = 'inspector' | 'validator' | 'exposure' | 'keys' | 'cost' | 'compliance' | 'mcp-starter'

// Keep backward compat
export type TabId = ToolId

export interface ToolDef {
  id: ToolId
  label: string
  group: 'mcp' | 'security' | 'developer'
  badge?: string
  badgeColor?: string
}

export interface TabDef extends ToolDef {}

const TOOLS: ToolDef[] = [
  { id: 'inspector', label: 'Security Inspector', group: 'mcp' },
  { id: 'validator', label: 'Spec Validator', group: 'mcp' },
  { id: 'exposure', label: 'Exposure Check', group: 'mcp' },
  { id: 'keys', label: 'Key Scanner', group: 'security' },
  { id: 'compliance', label: 'Compliance Checker', group: 'security' },
  { id: 'cost', label: 'Cost Calculator', group: 'developer' },
  { id: 'mcp-starter', label: 'MCP Server Starter', group: 'developer' },
]

const MCP_TOOLS = new Set<ToolId>(['inspector', 'validator', 'exposure'])

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('inspector')
  const [scanning, setScanning] = useState(false)
  const [scanConfig, setScanConfig] = useState<ScanConfig | null>(null)
  const [scanTrigger, setScanTrigger] = useState(0)
  const [tools, setTools] = useState<ToolDef[]>(TOOLS)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const updateTabBadge = useCallback((id: ToolId, badge: string, badgeColor: string) => {
    setTools(prev => prev.map(t => t.id === id ? { ...t, badge, badgeColor } : t))
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

  const handleToolChange = useCallback((id: ToolId) => {
    setActiveTool(id)
    setSidebarOpen(false)
  }, [])

  const showScanInput = MCP_TOOLS.has(activeTool)
  const activeToolDef = tools.find(t => t.id === activeTool)

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-[var(--color-card)] border-b border-[var(--color-border)] px-4 py-3 lg:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-white">{activeToolDef?.label}</span>
        <a href="https://authora.dev" className="text-xs text-blue-500">Authora</a>
      </div>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 bottom-0 z-50 w-[240px] transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar tools={tools} activeTool={activeTool} onToolChange={handleToolChange} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pt-14 lg:pt-0 flex flex-col">
        <div className="flex-1 px-6 py-6 lg:px-8">
          {showScanInput && <ScanInput onScan={handleScan} scanning={scanning} />}

          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 min-h-[calc(100vh-200px)]">
            {activeTool === 'inspector' && (
              <Inspector config={scanConfig} trigger={scanTrigger} onBadge={updateTabBadge} onComplete={handleScanComplete} />
            )}
            {activeTool === 'validator' && (
              <Validator config={scanConfig} trigger={scanTrigger} onBadge={updateTabBadge} />
            )}
            {activeTool === 'exposure' && (
              <ExposureCheck config={scanConfig} trigger={scanTrigger} onBadge={updateTabBadge} />
            )}
            {activeTool === 'keys' && <KeyScanner onBadge={updateTabBadge} />}
            {activeTool === 'cost' && <CostCalculator />}
            {activeTool === 'compliance' && <ComplianceChecker />}
            {activeTool === 'mcp-starter' && <McpStarter />}
          </div>

        </div>
      </div>
    </div>
  )
}
