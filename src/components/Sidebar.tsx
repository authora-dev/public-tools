import type { ToolDef, ToolId } from '../App'

interface Props {
  tools: ToolDef[]
  activeTool: ToolId
  onToolChange: (id: ToolId) => void
}

const GROUP_LABELS: Record<string, string> = {
  mcp: 'MCP Server',
  security: 'Security',
  developer: 'Developer Tools',
}

const GROUP_ORDER = ['mcp', 'security', 'developer']

export function Sidebar({ tools, activeTool, onToolChange }: Props) {
  const groups = GROUP_ORDER.map(g => ({
    key: g,
    label: GROUP_LABELS[g] ?? g,
    tools: tools.filter(t => t.group === g),
  })).filter(g => g.tools.length > 0)

  return (
    <div className="h-full flex flex-col bg-[var(--color-card)] border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <a href="https://authora.dev" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#g)" />
            <path d="M16 6L26 26H6L16 6Z" fill="white" fillOpacity="0.9" />
            <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
          </svg>
          <span className="text-sm font-semibold">Security Tools</span>
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {groups.map(group => (
          <div key={group.key} className="mb-4">
            <div className="px-2 mb-1.5 text-[10px] font-semibold text-[var(--color-dim)] uppercase tracking-wider">
              {group.label}
            </div>
            {group.tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-left transition-all mb-0.5 ${
                  activeTool === tool.id
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-[#aaa] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="truncate">{tool.label}</span>
                {tool.badge && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0"
                    style={{ background: `${tool.badgeColor}18`, color: tool.badgeColor }}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer links */}
      <div className="px-4 py-4 border-t border-[var(--color-border)] space-y-1.5">
        <a href="https://www.npmjs.com/package/@authora/agent-audit" target="_blank" rel="noopener" className="block text-[11px] text-[var(--color-dim)] hover:text-blue-400 transition-colors">
          npx @authora/agent-audit
        </a>
        <a href="https://github.com/authora-dev/awesome-agent-security" target="_blank" rel="noopener" className="block text-[11px] text-[var(--color-dim)] hover:text-blue-400 transition-colors">
          awesome-agent-security
        </a>
        <a href="https://authora.dev/developers/mcp" target="_blank" rel="noopener" className="block text-[11px] text-[var(--color-dim)] hover:text-blue-400 transition-colors">
          MCP Docs
        </a>
      </div>
    </div>
  )
}
