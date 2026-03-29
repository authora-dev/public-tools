// Known AI/LLM API key patterns for the Key Scanner tool

export interface KeyPattern {
  provider: string
  pattern: RegExp
  severity: 'critical' | 'warning'
  docs: string
}

export const KEY_PATTERNS: KeyPattern[] = [
  // OpenAI
  { provider: 'OpenAI', pattern: /sk-[a-zA-Z0-9]{20,}/, severity: 'critical', docs: 'https://platform.openai.com/api-keys' },
  { provider: 'OpenAI (project)', pattern: /sk-proj-[a-zA-Z0-9_-]{20,}/, severity: 'critical', docs: 'https://platform.openai.com/api-keys' },
  // Anthropic
  { provider: 'Anthropic', pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/, severity: 'critical', docs: 'https://console.anthropic.com/settings/keys' },
  // Google AI
  { provider: 'Google AI', pattern: /AIzaSy[a-zA-Z0-9_-]{33}/, severity: 'critical', docs: 'https://ai.google.dev/gemini-api/docs/api-key' },
  // HuggingFace
  { provider: 'HuggingFace', pattern: /hf_[a-zA-Z0-9]{34}/, severity: 'critical', docs: 'https://huggingface.co/settings/tokens' },
  // Cohere
  { provider: 'Cohere', pattern: /[a-zA-Z0-9]{40}/, severity: 'warning', docs: 'https://dashboard.cohere.com/api-keys' },
  // Replicate
  { provider: 'Replicate', pattern: /r8_[a-zA-Z0-9]{37}/, severity: 'critical', docs: 'https://replicate.com/account/api-tokens' },
  // GitHub (PAT)
  { provider: 'GitHub PAT', pattern: /ghp_[a-zA-Z0-9]{36}/, severity: 'critical', docs: 'https://github.com/settings/tokens' },
  { provider: 'GitHub PAT (fine-grained)', pattern: /github_pat_[a-zA-Z0-9_]{80,}/, severity: 'critical', docs: 'https://github.com/settings/tokens' },
  // AWS
  { provider: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical', docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html' },
  // Azure
  { provider: 'Azure Key', pattern: /[a-f0-9]{32}/, severity: 'warning', docs: 'https://portal.azure.com' },
  // Slack
  { provider: 'Slack Bot Token', pattern: /xoxb-[0-9]+-[a-zA-Z0-9]+/, severity: 'critical', docs: 'https://api.slack.com/authentication/token-types' },
  { provider: 'Slack App Token', pattern: /xapp-[0-9]+-[a-zA-Z0-9]+/, severity: 'critical', docs: 'https://api.slack.com/authentication/token-types' },
  // SendGrid
  { provider: 'SendGrid', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/, severity: 'critical', docs: 'https://app.sendgrid.com/settings/api_keys' },
  // Stripe
  { provider: 'Stripe', pattern: /sk_live_[a-zA-Z0-9]{24,}/, severity: 'critical', docs: 'https://dashboard.stripe.com/apikeys' },
  { provider: 'Stripe (test)', pattern: /sk_test_[a-zA-Z0-9]{24,}/, severity: 'warning', docs: 'https://dashboard.stripe.com/apikeys' },
  // Twilio
  { provider: 'Twilio', pattern: /SK[a-f0-9]{32}/, severity: 'critical', docs: 'https://www.twilio.com/console' },
  // Pinecone
  { provider: 'Pinecone', pattern: /pcsk_[a-zA-Z0-9_-]{50,}/, severity: 'critical', docs: 'https://app.pinecone.io' },
  // Generic private key
  { provider: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, severity: 'critical', docs: '' },
  // Generic password in env
  { provider: 'Env Password', pattern: /(?:PASSWORD|SECRET|TOKEN)\s*[=:]\s*['"]?[^\s'"]{8,}/, severity: 'warning', docs: '' },
]

export interface KeyFinding {
  line: number
  column: number
  snippet: string
  provider: string
  severity: 'critical' | 'warning'
  docs: string
}

export function scanForKeys(code: string): KeyFinding[] {
  const findings: KeyFinding[] = []
  const lines = code.split('\n')
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip comments
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('#') || line.trimStart().startsWith('*')) continue

    for (const pat of KEY_PATTERNS) {
      const match = pat.pattern.exec(line)
      if (match) {
        const key = `${pat.provider}:${i}:${match.index}`
        if (seen.has(key)) continue
        seen.add(key)

        // Don't flag obvious variable references like process.env.OPENAI_API_KEY
        const before = line.slice(Math.max(0, match.index - 30), match.index)
        if (/process\.env\.|os\.environ|getenv|env\[/i.test(before)) continue

        // Don't flag placeholder values
        if (/YOUR_|REPLACE_|xxx|example|placeholder/i.test(match[0])) continue

        findings.push({
          line: i + 1,
          column: match.index + 1,
          snippet: line.slice(Math.max(0, match.index - 10), match.index + match[0].length + 10),
          provider: pat.provider,
          severity: pat.severity,
          docs: pat.docs,
        })
      }
    }
  }

  return findings
}
