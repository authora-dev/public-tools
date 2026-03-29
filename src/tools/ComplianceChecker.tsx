import { useState, useMemo } from 'react'
import { Select } from '../components/Select'

type Framework = 'soc2' | 'gdpr' | 'hipaa' | 'iso27001'

interface Question {
  id: string
  text: string
  recommendation: string
  authoraFeature: string
}

const frameworkLabels: Record<Framework, string> = {
  soc2: 'SOC 2 Type II',
  gdpr: 'GDPR',
  hipaa: 'HIPAA',
  iso27001: 'ISO 27001',
}

const frameworkQuestions: Record<Framework, Question[]> = {
  soc2: [
    {
      id: 'soc2-1',
      text: 'Do your AI agents have unique, verifiable identities (not shared API keys)?',
      recommendation: 'Assign each agent a cryptographic identity tied to its role and lifecycle.',
      authoraFeature: 'Authora Identity provides cryptographic agent identities with Ed25519 keypairs, ensuring every agent is uniquely verifiable.',
    },
    {
      id: 'soc2-2',
      text: 'Are all agent actions logged with who, what, when, and authorization chain?',
      recommendation: 'Implement immutable audit logging for every agent action with full context.',
      authoraFeature: 'Authora Audit Trail captures every action with agent identity, timestamp, resource, and the full authorization chain.',
    },
    {
      id: 'soc2-3',
      text: 'Do agents operate under least-privilege permissions?',
      recommendation: 'Enforce granular, role-based permissions scoped to the minimum required access.',
      authoraFeature: 'Authora Policy Engine enforces least-privilege via declarative RBAC policies evaluated at every tool call.',
    },
    {
      id: 'soc2-4',
      text: 'Is there human approval for high-risk agent actions (data deletion, production deploys)?',
      recommendation: 'Require human-in-the-loop approval gates for destructive or high-impact actions.',
      authoraFeature: 'Authora Approval Gates let you define human approval workflows for any action classified as high-risk.',
    },
    {
      id: 'soc2-5',
      text: 'Are agent credentials rotated on a schedule?',
      recommendation: 'Automate credential rotation with configurable intervals and zero-downtime rollover.',
      authoraFeature: 'Authora Secrets Manager handles automatic credential rotation with configurable TTLs and seamless rollover.',
    },
    {
      id: 'soc2-6',
      text: 'Do you have monitoring/alerting for anomalous agent behavior?',
      recommendation: 'Deploy behavioral baselines and alert on deviations in agent activity patterns.',
      authoraFeature: 'Authora Monitor establishes behavioral baselines per agent and alerts on anomalous patterns in real time.',
    },
    {
      id: 'soc2-7',
      text: 'Are agent-to-agent delegations scoped and time-bounded?',
      recommendation: 'Limit delegated permissions to specific scopes with automatic expiration.',
      authoraFeature: 'Authora Delegation Tokens issue scoped, time-bounded delegation credentials between agents.',
    },
    {
      id: 'soc2-8',
      text: 'Is there an incident response plan for compromised agents?',
      recommendation: 'Document and rehearse runbooks for revoking agent access and containing compromises.',
      authoraFeature: 'Authora Incident Response provides one-click agent revocation and automated containment playbooks.',
    },
    {
      id: 'soc2-9',
      text: 'Are MCP tool calls authorized via policy engine (not just API keys)?',
      recommendation: 'Authorize every tool invocation through a centralized policy engine with context-aware rules.',
      authoraFeature: 'Authora Policy Engine evaluates every MCP tool call against context-aware authorization policies before execution.',
    },
    {
      id: 'soc2-10',
      text: 'Do you maintain an inventory of all AI agents and their permissions?',
      recommendation: 'Keep a living registry of all agents, their roles, permissions, and active credentials.',
      authoraFeature: 'Authora Registry maintains a real-time inventory of all agents with their roles, permissions, and credential status.',
    },
    {
      id: 'soc2-11',
      text: 'Are agent sessions terminated after inactivity?',
      recommendation: 'Enforce session timeouts to prevent stale or abandoned agent sessions from persisting.',
      authoraFeature: 'Authora Session Manager enforces configurable inactivity timeouts with automatic session termination.',
    },
    {
      id: 'soc2-12',
      text: 'Is there segregation of duties between agent roles?',
      recommendation: 'Ensure no single agent can both initiate and approve sensitive operations.',
      authoraFeature: 'Authora Role Separation enforces segregation of duties so no agent can both initiate and approve critical actions.',
    },
  ],
  gdpr: [
    {
      id: 'gdpr-1',
      text: 'Can agents access personal data? If so, is there a lawful basis documented?',
      recommendation: 'Document the lawful basis (consent, contract, legitimate interest) for each agent that processes personal data.',
      authoraFeature: 'Authora Policy Engine lets you attach lawful basis declarations to each agent permission, ensuring documented compliance.',
    },
    {
      id: 'gdpr-2',
      text: 'Do agents log which personal data they process and why?',
      recommendation: 'Log every PII access with the data category, purpose, and processing context.',
      authoraFeature: 'Authora Audit Trail automatically tags and logs personal data access with purpose codes and data categories.',
    },
    {
      id: 'gdpr-3',
      text: 'Can you delete all personal data an agent has accessed (right to erasure)?',
      recommendation: 'Implement data lineage tracking so you can trace and delete all PII an agent has touched.',
      authoraFeature: 'Authora Data Lineage tracks every piece of personal data an agent accesses, enabling complete erasure on request.',
    },
    {
      id: 'gdpr-4',
      text: 'Are agent actions involving PII auditable end-to-end?',
      recommendation: 'Maintain tamper-proof audit logs for all PII processing with full traceability.',
      authoraFeature: 'Authora Audit Trail provides end-to-end traceability for all PII operations with tamper-proof logging.',
    },
    {
      id: 'gdpr-5',
      text: 'Do agents have data minimization controls (only access data they need)?',
      recommendation: 'Restrict agent data access to the minimum fields necessary for their specific task.',
      authoraFeature: 'Authora Policy Engine supports field-level access controls, ensuring agents only see the data columns they need.',
    },
    {
      id: 'gdpr-6',
      text: 'Is there a Data Protection Impact Assessment for your agent workflows?',
      recommendation: 'Conduct a DPIA for any agent workflow that processes personal data at scale.',
      authoraFeature: 'Authora Compliance Reports auto-generate DPIA templates pre-populated with your agent architecture and data flows.',
    },
    {
      id: 'gdpr-7',
      text: 'Are cross-border data transfers by agents documented?',
      recommendation: 'Map all agent data flows that cross jurisdictional boundaries and ensure adequate safeguards.',
      authoraFeature: 'Authora Data Flow Mapper visualizes cross-border agent data transfers and validates transfer mechanisms.',
    },
    {
      id: 'gdpr-8',
      text: 'Can users withdraw consent for agent processing of their data?',
      recommendation: 'Implement consent withdrawal that immediately halts agent processing and triggers data cleanup.',
      authoraFeature: 'Authora Consent Manager propagates consent withdrawal to all agents in real time, halting processing immediately.',
    },
    {
      id: 'gdpr-9',
      text: 'Do agents notify when processing personal data (transparency)?',
      recommendation: 'Ensure agents surface processing notices to data subjects when handling their personal data.',
      authoraFeature: 'Authora Transparency Hooks inject processing notifications into agent workflows involving personal data.',
    },
    {
      id: 'gdpr-10',
      text: 'Is agent access to PII time-bounded and auto-revoked?',
      recommendation: 'Set expiration times on PII access grants so permissions are automatically revoked.',
      authoraFeature: 'Authora Access Tokens issue time-bounded PII access with automatic expiration and revocation.',
    },
  ],
  hipaa: [
    {
      id: 'hipaa-1',
      text: 'Are agent identities tied to specific roles with PHI access controls?',
      recommendation: 'Bind each agent to a named role with explicit PHI access scope.',
      authoraFeature: 'Authora Identity binds agents to healthcare roles with granular PHI access controls per identity.',
    },
    {
      id: 'hipaa-2',
      text: 'Is all PHI access by agents encrypted in transit and at rest?',
      recommendation: 'Enforce TLS for all agent communications and encrypt stored PHI with managed keys.',
      authoraFeature: 'Authora encrypts all agent-to-agent and agent-to-service communications via mutual TLS with managed certificates.',
    },
    {
      id: 'hipaa-3',
      text: 'Are agent actions involving PHI logged with audit trails?',
      recommendation: 'Maintain HIPAA-compliant audit logs for every agent interaction with PHI.',
      authoraFeature: 'Authora Audit Trail provides HIPAA-compliant logging with 6-year retention for all PHI access by agents.',
    },
    {
      id: 'hipaa-4',
      text: 'Do agents have minimum necessary access to PHI?',
      recommendation: 'Apply the minimum necessary standard to every agent permission involving PHI.',
      authoraFeature: 'Authora Policy Engine enforces minimum necessary access at the field level for PHI-containing resources.',
    },
    {
      id: 'hipaa-5',
      text: 'Is there a Business Associate Agreement covering AI agent access?',
      recommendation: 'Ensure BAAs are in place for all third-party agent tools and services that handle PHI.',
      authoraFeature: 'Authora Compliance Dashboard tracks BAA status for all agent integrations and flags uncovered third parties.',
    },
    {
      id: 'hipaa-6',
      text: 'Are agent credentials for PHI systems unique and non-shared?',
      recommendation: 'Issue unique credentials per agent -- never share credentials across agents or services.',
      authoraFeature: 'Authora Identity issues unique, non-transferable credentials per agent with hardware-bound key attestation.',
    },
    {
      id: 'hipaa-7',
      text: 'Can you produce an access report for all PHI an agent has touched?',
      recommendation: 'Generate on-demand access reports showing all PHI interactions per agent.',
      authoraFeature: 'Authora Reporting generates per-agent PHI access reports suitable for HIPAA accounting of disclosures.',
    },
    {
      id: 'hipaa-8',
      text: 'Is there workforce training covering AI agent risks to PHI?',
      recommendation: 'Include AI agent-specific scenarios in your HIPAA workforce training program.',
      authoraFeature: 'Authora provides training materials and risk assessment templates for AI agent PHI handling.',
    },
    {
      id: 'hipaa-9',
      text: 'Do agents auto-terminate sessions accessing PHI after timeout?',
      recommendation: 'Enforce automatic session termination for agents with active PHI access after configurable idle periods.',
      authoraFeature: 'Authora Session Manager terminates PHI-accessing agent sessions after configurable idle timeouts.',
    },
    {
      id: 'hipaa-10',
      text: 'Is there an incident response plan for agent-related PHI breaches?',
      recommendation: 'Document and test a breach response plan specific to AI agent compromise scenarios.',
      authoraFeature: 'Authora Incident Response includes HIPAA breach notification workflows with automated HHS reporting timelines.',
    },
  ],
  iso27001: [
    {
      id: 'iso-1',
      text: 'Are AI agents included in your asset inventory (Annex A.5)?',
      recommendation: 'Register all AI agents as information assets with owners, classifications, and handling requirements.',
      authoraFeature: 'Authora Registry automatically registers agents as information assets with classification metadata.',
    },
    {
      id: 'iso-2',
      text: 'Do agents have identity and access management controls (A.5.15-18)?',
      recommendation: 'Implement IAM controls for agents covering authentication, authorization, and access review.',
      authoraFeature: 'Authora Identity provides full IAM lifecycle for agents: provisioning, authentication, authorization, and deprovisioning.',
    },
    {
      id: 'iso-3',
      text: 'Are agent actions monitored and logged (A.8.15-16)?',
      recommendation: 'Monitor and log all agent activities with retention aligned to your ISMS requirements.',
      authoraFeature: 'Authora Audit Trail satisfies A.8.15-16 with configurable retention, tamper detection, and real-time monitoring.',
    },
    {
      id: 'iso-4',
      text: 'Is there a risk assessment covering AI agent threats (A.5.3)?',
      recommendation: 'Conduct a formal risk assessment for AI agent threat scenarios including compromise, misuse, and data leakage.',
      authoraFeature: 'Authora Risk Assessment provides pre-built threat models for AI agent architectures aligned to ISO 27005.',
    },
    {
      id: 'iso-5',
      text: 'Are agent-to-agent communications encrypted (A.8.24)?',
      recommendation: 'Encrypt all inter-agent communications using mutual TLS or equivalent.',
      authoraFeature: 'Authora enforces mutual TLS for all agent-to-agent communications with automatic certificate management.',
    },
    {
      id: 'iso-6',
      text: 'Do agents follow change management procedures (A.8.32)?',
      recommendation: 'Subject agent configuration and permission changes to formal change management with approvals.',
      authoraFeature: 'Authora Change Control requires approval workflows for agent permission and configuration changes.',
    },
    {
      id: 'iso-7',
      text: 'Is there supply chain security for third-party agent tools (A.5.19-23)?',
      recommendation: 'Assess and monitor security of all third-party MCP servers and agent tools in your supply chain.',
      authoraFeature: 'Authora Supply Chain Scanner evaluates third-party MCP servers and tools against your security requirements.',
    },
    {
      id: 'iso-8',
      text: 'Are agent credentials managed via secrets management (A.5.17)?',
      recommendation: 'Store and manage all agent credentials in a dedicated secrets management system with rotation.',
      authoraFeature: 'Authora Secrets Manager provides centralized, encrypted credential storage with automatic rotation.',
    },
    {
      id: 'iso-9',
      text: 'Is there business continuity planning for agent failures (A.5.29-30)?',
      recommendation: 'Include AI agent failure scenarios in your BCP with failover and recovery procedures.',
      authoraFeature: 'Authora Resilience provides agent failover configuration, health monitoring, and automated recovery.',
    },
    {
      id: 'iso-10',
      text: 'Are there controls for agent privilege escalation (A.8.2)?',
      recommendation: 'Detect and prevent unauthorized privilege escalation by agents.',
      authoraFeature: 'Authora Policy Engine detects privilege escalation attempts and blocks unauthorized permission elevation in real time.',
    },
  ],
}

function getGrade(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'Compliant', color: '#22c55e' }
  if (pct >= 50) return { label: 'Partial', color: '#eab308' }
  return { label: 'Non-Compliant', color: '#ef4444' }
}

function exportReport(
  framework: Framework,
  questions: Question[],
  answers: Record<string, boolean>,
  score: number,
  total: number,
  pct: number,
  grade: { label: string; color: string },
) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const gaps = questions.filter(q => !answers[q.id])

  const questionsHtml = questions
    .map(
      q => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">
          ${q.text}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:${answers[q.id] ? '#16a34a' : '#dc2626'};font-size:14px;">
          ${answers[q.id] ? 'PASS' : 'FAIL'}
        </td>
      </tr>`,
    )
    .join('')

  const gapsHtml = gaps.length
    ? gaps
        .map(
          (q, i) => `
        <div style="margin-bottom:16px;padding:12px 16px;border-left:3px solid #dc2626;background:#fef2f2;border-radius:0 6px 6px 0;">
          <p style="margin:0 0 4px;font-weight:600;color:#991b1b;font-size:14px;">Gap ${i + 1}: ${q.text}</p>
          <p style="margin:0 0 4px;color:#374151;font-size:13px;"><strong>Recommendation:</strong> ${q.recommendation}</p>
          <p style="margin:0;color:#1d4ed8;font-size:13px;"><strong>How Authora helps:</strong> ${q.authoraFeature}</p>
        </div>`,
        )
        .join('')
    : '<p style="color:#16a34a;font-size:14px;">No gaps identified. Full compliance achieved.</p>'

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AI Agent Compliance Gap Analysis</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #111827; }
  table { width: 100%; border-collapse: collapse; }
</style></head><body>
  <h1 style="margin:0 0 4px;font-size:24px;color:#111827;">AI Agent Compliance Gap Analysis</h1>
  <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">${frameworkLabels[framework]} -- ${date}</p>

  <div style="display:flex;gap:24px;margin-bottom:32px;">
    <div style="flex:1;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#6b7280;">Score</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#111827;">${score} / ${total}</p>
    </div>
    <div style="flex:1;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#6b7280;">Percentage</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#111827;">${pct}%</p>
    </div>
    <div style="flex:1;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#6b7280;">Grade</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:${grade.color};">${grade.label}</p>
    </div>
  </div>

  <h2 style="font-size:18px;margin:0 0 12px;color:#111827;">Assessment Results</h2>
  <table style="margin-bottom:32px;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="text-align:left;padding:8px 12px;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Control Question</th>
        <th style="text-align:center;padding:8px 12px;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;width:80px;">Status</th>
      </tr>
    </thead>
    <tbody>${questionsHtml}</tbody>
  </table>

  <h2 style="font-size:18px;margin:0 0 12px;color:#111827;">Identified Gaps & Recommendations</h2>
  ${gapsHtml}

  <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e5e7eb;">
  <p style="text-align:center;color:#9ca3af;font-size:12px;">Generated by Authora Security Tools -- tools.authora.dev</p>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }
}

export function ComplianceChecker() {
  const [framework, setFramework] = useState<Framework>('soc2')
  const [answers, setAnswers] = useState<Record<string, boolean>>({})

  const questions = frameworkQuestions[framework]
  const total = questions.length

  const score = useMemo(
    () => questions.filter(q => answers[q.id]).length,
    [questions, answers],
  )

  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const grade = getGrade(pct)
  const gaps = questions.filter(q => !answers[q.id])

  function handleFrameworkChange(value: string) {
    setFramework(value as Framework)
    setAnswers({})
  }

  function toggleAnswer(id: string) {
    setAnswers(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Compliance Gap Analysis</h2>
        <p className="text-sm text-[var(--color-dim)]">
          Assess your AI agent setup against major compliance frameworks and identify gaps.
        </p>
      </div>

      {/* Framework selector */}
      <div className="mb-5">
        <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
          Compliance Framework
        </label>
        <Select
          value={framework}
          onChange={handleFrameworkChange}
          searchable={false}
          options={[
            { value: 'soc2', label: 'SOC 2 Type II' },
            { value: 'gdpr', label: 'GDPR' },
            { value: 'hipaa', label: 'HIPAA' },
            { value: 'iso27001', label: 'ISO 27001' },
          ]}
          placeholder="Select framework..."
        />
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-center">
          <p className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Score</p>
          <p className="text-xl font-bold text-white">
            {score} / {total}
          </p>
        </div>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-center">
          <p className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Compliance</p>
          <p className="text-xl font-bold text-white">{pct}%</p>
        </div>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-center">
          <p className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">Grade</p>
          <p className="text-xl font-bold" style={{ color: grade.color }}>
            {grade.label}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="w-full h-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: grade.color,
            }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">
          {frameworkLabels[framework]} Controls Assessment
        </h3>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const checked = !!answers[q.id]
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => toggleAnswer(q.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                  checked
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-border2)]'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                    checked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-[var(--color-border2)] bg-transparent'
                  }`}
                >
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm leading-snug ${checked ? 'text-emerald-400' : 'text-[#ccc]'}`}>
                  <span className="text-[var(--color-dim)] mr-1.5">{i + 1}.</span>
                  {q.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">
            Identified Gaps ({gaps.length})
          </h3>
          <div className="space-y-3">
            {gaps.map((q, i) => (
              <div
                key={q.id}
                className="bg-[var(--color-bg)] border border-red-500/20 rounded-lg px-4 py-3"
              >
                <p className="text-sm font-medium text-red-400 mb-1.5">
                  Gap {i + 1}: {q.text}
                </p>
                <p className="text-xs text-[var(--color-dim)] mb-1">
                  <span className="text-[var(--color-dim2)] font-medium">Recommendation:</span>{' '}
                  {q.recommendation}
                </p>
                <p className="text-xs text-blue-400">
                  <span className="text-blue-500 font-medium">Authora:</span>{' '}
                  {q.authoraFeature}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {gaps.length === 0 && (
        <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
          <p className="text-sm text-emerald-400 font-medium">
            Full compliance achieved -- no gaps identified for {frameworkLabels[framework]}.
          </p>
        </div>
      )}

      {/* Export button */}
      <button
        type="button"
        onClick={() =>
          exportReport(framework, questions, answers, score, total, pct, grade)
        }
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Export PDF Report
      </button>
    </div>
  )
}
