import { useState, useMemo, useEffect } from 'react'
import { fetchModels, estimateCost, type ModelPricing, type CostEstimate } from '../lib/pricing'
import { Select } from '../components/Select'

function fmt(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  if (n < 100) return `$${n.toFixed(2)}`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CostCalculator() {
  const [models, setModels] = useState<ModelPricing[]>([])
  const [lastUpdated, setLastUpdated] = useState('')
  const [loading, setLoading] = useState(true)
  const [modelId, setModelId] = useState('')
  const [inputTokens, setInputTokens] = useState(2000)
  const [outputTokens, setOutputTokens] = useState(500)
  const [callsPerTask, setCallsPerTask] = useState(5)
  const [tasksPerDay, setTasksPerDay] = useState(50)

  useEffect(() => {
    fetchModels().then(({ models: m, lastUpdated: lu }) => {
      setModels(m)
      setLastUpdated(lu)
      if (m.length > 0 && !modelId) setModelId(m[0].id)
      setLoading(false)
    })
  }, [])

  const selectedModel = models.find(m => m.id === modelId) ?? models[0]

  const estimate = useMemo(
    () => selectedModel ? estimateCost(selectedModel, inputTokens, outputTokens, callsPerTask, tasksPerDay) : null,
    [selectedModel, inputTokens, outputTokens, callsPerTask, tasksPerDay],
  )

  const allEstimates: CostEstimate[] = useMemo(
    () =>
      models.map(m => estimateCost(m, inputTokens, outputTokens, callsPerTask, tasksPerDay))
        .sort((a, b) => a.monthlyCost - b.monthlyCost),
    [models, inputTokens, outputTokens, callsPerTask, tasksPerDay],
  )

  if (loading) {
    return (
      <div className="text-center py-12 text-[var(--color-dim)]">
        Loading model pricing from LiteLLM...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">LLM Cost Calculator</h2>
        <p className="text-sm text-[var(--color-dim)]">
          Estimate costs for your AI agent workflows across {models.length} models.
          {lastUpdated && (
            <span className="ml-1">
              Pricing via{' '}
              <a href="https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json" className="text-blue-500 hover:underline" target="_blank" rel="noopener">LiteLLM</a>
              {lastUpdated !== 'fallback' && <span className="text-[var(--color-dim2)]"> (updated {lastUpdated})</span>}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="col-span-2">
          <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
            Model
          </label>
          <Select
            value={modelId}
            onChange={setModelId}
            searchable
            options={models.map(m => ({
              value: m.id,
              label: m.name,
              sublabel: `${m.provider} -- $${m.inputPer1M}/$${m.outputPer1M} per 1M`,
            }))}
            placeholder="Select model..."
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
            Avg input tokens/call
          </label>
          <input
            type="number"
            value={inputTokens}
            onChange={e => setInputTokens(Math.max(0, Number(e.target.value)))}
            min={0}
            className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
            Avg output tokens/call
          </label>
          <input
            type="number"
            value={outputTokens}
            onChange={e => setOutputTokens(Math.max(0, Number(e.target.value)))}
            min={0}
            className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
            Calls per task
          </label>
          <input
            type="number"
            value={callsPerTask}
            onChange={e => setCallsPerTask(Math.max(1, Number(e.target.value)))}
            min={1}
            className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
            Tasks per day
          </label>
          <input
            type="number"
            value={tasksPerDay}
            onChange={e => setTasksPerDay(Math.max(1, Number(e.target.value)))}
            min={1}
            className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Selected model summary */}
      {estimate && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-center">
            <p className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Per Task</p>
            <p className="text-xl font-bold text-white">{fmt(estimate.costPerTask)}</p>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-center">
            <p className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Daily</p>
            <p className="text-xl font-bold text-white">{fmt(estimate.dailyCost)}</p>
          </div>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-center">
            <p className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Monthly</p>
            <p className="text-xl font-bold text-white">{fmt(estimate.monthlyCost)}</p>
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">All models comparison</h3>
        <p className="text-xs text-[var(--color-dim)] mb-3">
          Same workflow ({inputTokens.toLocaleString()} in / {outputTokens.toLocaleString()} out x {callsPerTask} calls x {tasksPerDay} tasks/day)
        </p>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="text-left px-3 py-2 text-[var(--color-dim)] font-medium text-xs">Model</th>
                <th className="text-right px-3 py-2 text-[var(--color-dim)] font-medium text-xs">Per Task</th>
                <th className="text-right px-3 py-2 text-[var(--color-dim)] font-medium text-xs">Daily</th>
                <th className="text-right px-3 py-2 text-[var(--color-dim)] font-medium text-xs">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {allEstimates.map((e) => {
                const isSelected = e.model.id === modelId
                return (
                  <tr
                    key={e.model.id}
                    className="border-b border-[var(--color-border)] last:border-b-0 cursor-pointer hover:bg-white/[0.02]"
                    onClick={() => setModelId(e.model.id)}
                  >
                    <td className="px-3 py-2">
                      <span className={`text-sm ${isSelected ? 'text-blue-400 font-semibold' : 'text-white'}`}>
                        {e.model.name}
                      </span>
                      <span className="text-xs text-[var(--color-dim)] ml-1.5">{e.model.provider}</span>
                    </td>
                    <td className="text-right px-3 py-2 text-white font-mono text-xs">{fmt(e.costPerTask)}</td>
                    <td className="text-right px-3 py-2 text-white font-mono text-xs">{fmt(e.dailyCost)}</td>
                    <td className="text-right px-3 py-2 font-mono text-xs" style={{
                      color: e.monthlyCost < 50 ? '#22c55e' : e.monthlyCost < 500 ? '#eab308' : '#ef4444',
                    }}>
                      {fmt(e.monthlyCost)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
