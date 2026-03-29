// LLM pricing -- fetched live from LiteLLM's maintained dataset

export interface ModelPricing {
  id: string
  name: string
  provider: string
  inputPer1M: number
  outputPer1M: number
  contextWindow: number
}

export interface CostEstimate {
  model: ModelPricing
  dailyCost: number
  monthlyCost: number
  costPerTask: number
  inputTokensPerDay: number
  outputTokensPerDay: number
}

// Models we want to surface -- mapped to LiteLLM keys
const MODEL_MAP: Array<{ key: string; name: string; provider: string; aliases?: string[] }> = [
  // Anthropic (latest: Opus 4.6, Sonnet 4.6, Haiku 4.5)
  { key: 'openrouter/anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'Anthropic', aliases: ['anthropic.claude-opus-4-6-v1'] },
  { key: 'openrouter/anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', aliases: ['anthropic.claude-sonnet-4-6'] },
  { key: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'Anthropic', aliases: ['anthropic.claude-haiku-4-5-20251001-v1:0'] },
  // OpenAI (latest: GPT-5.4, GPT-5, GPT-4.1 series, o-series)
  { key: 'azure/eu/gpt-5-2025-08-07', name: 'GPT-5', provider: 'OpenAI' },
  { key: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
  { key: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { key: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI' },
  { key: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { key: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { key: 'o3', name: 'o3', provider: 'OpenAI' },
  { key: 'o4-mini', name: 'o4-mini', provider: 'OpenAI' },
  // Google (latest: Gemini 3.1 Pro, 3.1 Flash-Lite, 3 Flash, 2.5 series)
  { key: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google', aliases: ['gemini/gemini-3.1-pro-preview'] },
  { key: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', aliases: ['gemini/gemini-3-pro-preview'] },
  { key: 'gemini/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
  { key: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash-Lite', provider: 'Google', aliases: ['gemini/gemini-3.1-flash-lite-preview'] },
  { key: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { key: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  // DeepSeek
  { key: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { key: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'DeepSeek' },
  // Mistral
  { key: 'mistral/mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
  { key: 'mistral/mistral-small-latest', name: 'Mistral Small', provider: 'Mistral' },
  // Meta (via providers)
  { key: 'groq/meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', provider: 'Meta (Groq)' },
  { key: 'groq/meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', provider: 'Meta (Groq)' },
]

const LITELLM_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

let cachedModels: ModelPricing[] | null = null
let cacheTime = 0
let lastUpdated = ''
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function fetchModels(): Promise<{ models: ModelPricing[]; lastUpdated: string }> {
  if (cachedModels && Date.now() - cacheTime < CACHE_TTL) {
    return { models: cachedModels, lastUpdated }
  }

  try {
    const res = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as Record<string, Record<string, unknown>>

    const models: ModelPricing[] = []
    for (const entry of MODEL_MAP) {
      const keys = [entry.key, ...(entry.aliases ?? [])]
      let raw: Record<string, unknown> | undefined
      for (const k of keys) {
        if (data[k]) { raw = data[k]; break }
      }
      if (!raw) continue

      const inputCost = (raw.input_cost_per_token as number) ?? 0
      const outputCost = (raw.output_cost_per_token as number) ?? 0
      const ctx = (raw.max_input_tokens as number) ?? (raw.max_tokens as number) ?? 0

      if (inputCost === 0 && outputCost === 0) continue

      models.push({
        id: entry.key,
        name: entry.name,
        provider: entry.provider,
        inputPer1M: Math.round(inputCost * 1e6 * 100) / 100,
        outputPer1M: Math.round(outputCost * 1e6 * 100) / 100,
        contextWindow: ctx,
      })
    }

    // Get last-modified from GitHub
    const lm = res.headers.get('last-modified')
    lastUpdated = lm ? new Date(lm).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

    cachedModels = models
    cacheTime = Date.now()
    return { models, lastUpdated }
  } catch {
    // Fallback to hardcoded if fetch fails
    if (cachedModels) return { models: cachedModels, lastUpdated }
    return { models: FALLBACK_MODELS, lastUpdated: 'fallback' }
  }
}

// Fallback in case GitHub is unreachable
const FALLBACK_MODELS: ModelPricing[] = [
  { id: 'claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'Anthropic', inputPer1M: 5, outputPer1M: 25, contextWindow: 1000000 },
  { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', inputPer1M: 3, outputPer1M: 15, contextWindow: 1000000 },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', inputPer1M: 1, outputPer1M: 5, contextWindow: 200000 },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', inputPer1M: 1.25, outputPer1M: 10, contextWindow: 1000000 },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', inputPer1M: 2, outputPer1M: 8, contextWindow: 1000000 },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI', inputPer1M: 0.1, outputPer1M: 0.4, contextWindow: 1000000 },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'Google', inputPer1M: 2, outputPer1M: 12, contextWindow: 1000000 },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', provider: 'Google', inputPer1M: 0.25, outputPer1M: 1.5, contextWindow: 1000000 },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', inputPer1M: 0.28, outputPer1M: 0.42, contextWindow: 131072 },
]

export function estimateCost(
  model: ModelPricing,
  avgInputTokensPerCall: number,
  avgOutputTokensPerCall: number,
  callsPerTask: number,
  tasksPerDay: number,
): CostEstimate {
  const inputTokensPerDay = avgInputTokensPerCall * callsPerTask * tasksPerDay
  const outputTokensPerDay = avgOutputTokensPerCall * callsPerTask * tasksPerDay
  const dailyCost = (inputTokensPerDay / 1e6) * model.inputPer1M + (outputTokensPerDay / 1e6) * model.outputPer1M

  return {
    model,
    dailyCost,
    monthlyCost: dailyCost * 30,
    costPerTask: dailyCost / tasksPerDay,
    inputTokensPerDay,
    outputTokensPerDay,
  }
}
