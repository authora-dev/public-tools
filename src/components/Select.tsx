import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
}

export function Select({ options, value, onChange, placeholder = 'Select...', searchable = true }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.sublabel ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchable && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open, searchable])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-left cursor-pointer hover:border-[var(--color-border2)] transition-colors"
      >
        <span className={selected ? 'text-white' : 'text-[var(--color-dim2)]'}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.sublabel && (
          <span className="text-[var(--color-dim)] text-xs ml-2 truncate">{selected.sublabel}</span>
        )}
        <svg
          className={`w-4 h-4 text-[var(--color-dim)] ml-2 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#1a1a24] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-[var(--color-border)]">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-sm text-white outline-none focus:border-blue-500 placeholder:text-[var(--color-dim2)]"
              />
            </div>
          )}
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-[var(--color-dim)]">No results</div>
            )}
            {filtered.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); setSearch('') }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left cursor-pointer transition-colors ${
                  option.value === value
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-[#ccc] hover:bg-white/5'
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {option.sublabel && (
                  <span className="text-[11px] text-[var(--color-dim)] ml-3 truncate">{option.sublabel}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
