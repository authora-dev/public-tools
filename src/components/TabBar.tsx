import type { TabDef, TabId } from '../App'

interface Props {
  tabs: TabDef[]
  activeTab: TabId
  onTabChange: (id: TabId) => void
}

export function TabBar({ tabs, activeTab, onTabChange }: Props) {
  return (
    <div className="flex bg-[var(--color-card)] border border-[var(--color-border)] border-b-0 rounded-t-xl overflow-hidden">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-4 text-[13px] font-medium text-center border-b-2 transition-all cursor-pointer ${
            activeTab === tab.id
              ? 'text-white bg-blue-500/8 border-b-blue-500'
              : 'text-[var(--color-dim)] hover:text-white hover:bg-white/[0.03] border-b-transparent'
          }`}
        >
          {tab.label}
          {tab.badge && (
            <span
              className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold align-middle"
              style={{
                background: `${tab.badgeColor}18`,
                color: tab.badgeColor,
              }}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
