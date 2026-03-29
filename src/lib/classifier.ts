// Tool risk classifier -- shared between Inspector and CLI

const DANGEROUS = [
  'delete', 'remove', 'drop', 'exec', 'execute', 'shell', 'command',
  'run_command', 'kill', 'terminate', 'destroy', 'purge', 'wipe', 'force',
  'override', 'revoke', 'suspend', 'deactivate', 'disable', 'deny', 'reject',
  'reset', 'unregister', 'detach', 'disconnect',
]

const SAFE = [
  'read', 'get', 'list', 'search', 'query', 'fetch', 'check', 'verify',
  'status', 'health', 'describe', 'count', 'view', 'show', 'inspect', 'find',
  'lookup', 'validate', 'export', 'audit', 'log', 'monitor', 'history',
  'report', 'resolve', 'whoami', 'me', 'info', 'version', 'ping', 'echo',
  'help', 'capabilities', 'schema', 'metadata', 'stats', 'summary',
  'discover', 'enumerate', 'batch_get', 'batch_list',
]

const REVIEW = [
  'create', 'write', 'modify', 'send', 'deploy', 'publish', 'update',
  'assign', 'grant', 'approve', 'set', 'add', 'configure', 'delegate',
  'escalate', 'notify', 'alert', 'rotate', 'renew', 'generate', 'import',
  'register', 'trigger', 'enable', 'activate', 'reactivate', 'connect',
  'attach', 'invite', 'enroll', 'submit', 'request', 'initiate', 'provision',
  'emit', 'push', 'post', 'put', 'patch', 'insert', 'upsert', 'merge',
  'sync', 'transfer', 'move', 'copy', 'clone', 'fork', 'sign', 'issue',
  'mint', 'encode', 'encrypt', 'authorize', 'consent', 'accept',
  'acknowledge', 'confirm', 'start', 'stop', 'pause', 'resume', 'schedule',
  'cancel', 'retry', 'replay', 'release', 'promote', 'demote', 'tag',
  'label', 'annotate', 'comment', 'flag', 'pin', 'bookmark', 'subscribe',
  'unsubscribe', 'follow', 'unfollow', 'mute', 'unmute', 'archive', 'restore',
]

export type ToolLevel = 'safe' | 'warn' | 'danger'

function wordBoundary(text: string, word: string): boolean {
  return new RegExp(`(^|[_\\-\\s.])${word}([_\\-\\s.]|$)`).test(text)
}

export function classifyTool(name: string, description?: string): ToolLevel {
  const text = `${name} ${description ?? ''}`.toLowerCase()
  for (const kw of DANGEROUS) { if (wordBoundary(text, kw)) return 'danger' }
  for (const kw of SAFE) { if (wordBoundary(text, kw)) return 'safe' }
  for (const kw of REVIEW) { if (wordBoundary(text, kw)) return 'warn' }
  return 'warn'
}

export function gradeScore(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: 'A+', color: '#22c55e' }
  if (score >= 80) return { letter: 'A', color: '#22c55e' }
  if (score >= 70) return { letter: 'B+', color: '#22c55e' }
  if (score >= 60) return { letter: 'B', color: '#84cc16' }
  if (score >= 50) return { letter: 'C', color: '#eab308' }
  if (score >= 30) return { letter: 'D', color: '#f97316' }
  return { letter: 'F', color: '#ef4444' }
}

export function computeScore(safe: number, dangerous: number, total: number, authenticated: boolean): number {
  const safeRatio = safe / total
  const dangerRatio = dangerous / total
  let score = Math.round(safeRatio * 60 + (1 - dangerRatio) * 30)
  if (authenticated) score += 10
  if (dangerRatio > 0.3) score -= 15
  else if (dangerRatio > 0.2) score -= 5
  return Math.max(0, Math.min(100, score))
}
