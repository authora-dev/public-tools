import { useState } from 'react'
import { Select } from '../components/Select'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type Language = 'typescript' | 'python'
type Transport = 'sse' | 'stdio'
type Auth = 'none' | 'api-key' | 'bearer'

interface ToolDef {
  id: string
  name: string
  description: string
  params: { name: string; type: string; description: string; required?: boolean }[]
}

const TOOLS: ToolDef[] = [
  {
    id: 'read_file',
    name: 'read_file',
    description: 'Read a file from the filesystem',
    params: [{ name: 'path', type: 'string', description: 'Absolute path to the file', required: true }],
  },
  {
    id: 'write_file',
    name: 'write_file',
    description: 'Write content to a file',
    params: [
      { name: 'path', type: 'string', description: 'Absolute path to the file', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
    ],
  },
  {
    id: 'list_directory',
    name: 'list_directory',
    description: 'List files in a directory',
    params: [
      { name: 'path', type: 'string', description: 'Directory path', required: true },
      { name: 'recursive', type: 'boolean', description: 'List recursively' },
    ],
  },
  {
    id: 'search_files',
    name: 'search_files',
    description: 'Search for files matching a pattern',
    params: [
      { name: 'directory', type: 'string', description: 'Directory to search in', required: true },
      { name: 'pattern', type: 'string', description: 'Glob pattern to match', required: true },
    ],
  },
  {
    id: 'execute_command',
    name: 'execute_command',
    description: 'Run a shell command (dangerous)',
    params: [
      { name: 'command', type: 'string', description: 'Shell command to execute', required: true },
      { name: 'timeout_ms', type: 'number', description: 'Timeout in milliseconds' },
    ],
  },
  {
    id: 'http_request',
    name: 'http_request',
    description: 'Make an HTTP request',
    params: [
      { name: 'url', type: 'string', description: 'Request URL', required: true },
      { name: 'method', type: 'string', description: 'HTTP method (GET, POST, etc.)' },
      { name: 'headers', type: 'string', description: 'JSON-encoded headers object' },
      { name: 'body', type: 'string', description: 'Request body' },
    ],
  },
  {
    id: 'query_database',
    name: 'query_database',
    description: 'Execute a database query',
    params: [
      { name: 'query', type: 'string', description: 'SQL query to execute', required: true },
      { name: 'connection_string', type: 'string', description: 'Database connection string' },
    ],
  },
  {
    id: 'get_environment',
    name: 'get_environment',
    description: 'Read environment variables',
    params: [{ name: 'name', type: 'string', description: 'Variable name (omit for all)' }],
  },
  {
    id: 'create_note',
    name: 'create_note',
    description: 'Create a note/memo',
    params: [
      { name: 'title', type: 'string', description: 'Note title', required: true },
      { name: 'content', type: 'string', description: 'Note content', required: true },
      { name: 'tags', type: 'string', description: 'Comma-separated tags' },
    ],
  },
  {
    id: 'search_web',
    name: 'search_web',
    description: 'Search the web',
    params: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'max_results', type: 'number', description: 'Maximum results to return' },
    ],
  },
]

const LANGUAGE_OPTIONS = [
  { value: 'typescript', label: 'TypeScript (Node.js)' },
  { value: 'python', label: 'Python' },
]

const TRANSPORT_OPTIONS = [
  { value: 'sse', label: 'SSE', sublabel: 'HTTP server with Server-Sent Events' },
  { value: 'stdio', label: 'stdio', sublabel: 'Standard input/output' },
]

const AUTH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'api-key', label: 'API Key', sublabel: 'Header-based authentication' },
  { value: 'bearer', label: 'Bearer Token', sublabel: 'Authorization header' },
]

/* ------------------------------------------------------------------ */
/*  Code generators -- TypeScript                                      */
/* ------------------------------------------------------------------ */

function tsToolFile(tool: ToolDef): string {
  const zodFields = tool.params
    .map(p => {
      const zodType = p.type === 'number' ? 'z.number()' : p.type === 'boolean' ? 'z.boolean()' : 'z.string()'
      const field = p.required ? zodType : `${zodType}.optional()`
      return `    ${p.name}: ${field}, // ${p.description}`
    })
    .join('\n')

  const destructured = tool.params.map(p => p.name).join(', ')

  let body = ''
  switch (tool.id) {
    case 'read_file':
      body = `    const data = readFileSync(path, 'utf-8')
    return { content: [{ type: 'text' as const, text: data }] }`
      break
    case 'write_file':
      body = `    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content, 'utf-8')
    return { content: [{ type: 'text' as const, text: \`Wrote \${content.length} bytes to \${path}\` }] }`
      break
    case 'list_directory':
      body = `    const entries = readdirSync(path, { withFileTypes: true })
    const items = recursive
      ? entries.flatMap(e => e.isDirectory()
          ? readdirSync(join(path, e.name), { withFileTypes: true, recursive: true })
              .map(s => join(e.name, s.name))
          : [e.name])
      : entries.map(e => \`\${e.name}\${e.isDirectory() ? '/' : ''}\`)
    return { content: [{ type: 'text' as const, text: items.join('\\n') }] }`
      break
    case 'search_files':
      body = `    const { globSync } = await import('glob')
    const matches = globSync(pattern, { cwd: directory })
    return { content: [{ type: 'text' as const, text: matches.length ? matches.join('\\n') : 'No files found' }] }`
      break
    case 'execute_command':
      body = `    const result = execSync(command, {
      timeout: timeout_ms ?? 30000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })
    return { content: [{ type: 'text' as const, text: result }] }`
      break
    case 'http_request':
      body = `    const opts: RequestInit = { method: method ?? 'GET' }
    if (headers) opts.headers = JSON.parse(headers)
    if (body) opts.body = body
    const res = await fetch(url, opts)
    const text = await res.text()
    return { content: [{ type: 'text' as const, text: \`\${res.status} \${res.statusText}\\n\\n\${text}\` }] }`
      break
    case 'query_database':
      body = `    // Replace with your preferred database driver
    // Example: import pg from 'pg'
    return { content: [{ type: 'text' as const, text: \`Query received: \${query}\\nConnection: \${connection_string ?? 'default'}\\n\\nNote: Install a database driver (pg, mysql2, better-sqlite3) and implement the query logic.\` }] }`
      break
    case 'get_environment':
      body = `    if (name) {
      const val = process.env[name]
      return { content: [{ type: 'text' as const, text: val !== undefined ? \`\${name}=\${val}\` : \`\${name} is not set\` }] }
    }
    const vars = Object.entries(process.env)
      .filter(([k]) => !k.startsWith('npm_'))
      .map(([k, v]) => \`\${k}=\${v}\`)
      .join('\\n')
    return { content: [{ type: 'text' as const, text: vars }] }`
      break
    case 'create_note':
      body = `    const notesDir = join(process.cwd(), '.notes')
    mkdirSync(notesDir, { recursive: true })
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const filename = \`\${Date.now()}-\${slug}.md\`
    const header = tags ? \`---\\ntags: \${tags}\\n---\\n\\n\` : ''
    writeFileSync(join(notesDir, filename), \`\${header}# \${title}\\n\\n\${content}\\n\`)
    return { content: [{ type: 'text' as const, text: \`Note saved: .notes/\${filename}\` }] }`
      break
    case 'search_web':
      body = `    // Replace with your preferred search API (SerpAPI, Brave Search, etc.)
    return { content: [{ type: 'text' as const, text: \`Search query: \${query}\\nMax results: \${max_results ?? 10}\\n\\nNote: Integrate a search API (e.g., SerpAPI, Brave Search API) and add your API key to .env\` }] }`
      break
    default:
      body = `    return { content: [{ type: 'text' as const, text: 'Not implemented' }] }`
  }

  const imports: string[] = []
  if (['read_file'].includes(tool.id)) imports.push("import { readFileSync } from 'node:fs'")
  if (['write_file'].includes(tool.id)) imports.push("import { writeFileSync, mkdirSync } from 'node:fs'", "import { dirname } from 'node:path'")
  if (['list_directory'].includes(tool.id)) imports.push("import { readdirSync } from 'node:fs'", "import { join } from 'node:path'")
  if (['execute_command'].includes(tool.id)) imports.push("import { execSync } from 'node:child_process'")
  if (['create_note'].includes(tool.id)) imports.push("import { writeFileSync, mkdirSync } from 'node:fs'", "import { join } from 'node:path'")

  const importBlock = imports.length ? imports.join('\n') + '\n' : ''

  return `${importBlock}import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const schema = {
${zodFields}
}

export function register(server: McpServer) {
  server.tool(
    '${tool.name}',
    '${tool.description}',
    schema,
    async ({ ${destructured} }) => {
      try {
${body}
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text' as const, text: \`Error: \${message}\` }], isError: true }
      }
    },
  )
}
`
}

function tsIndex(serverName: string, transport: Transport, auth: Auth, tools: ToolDef[]): string {
  const lines: string[] = []

  lines.push("import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'")

  if (transport === 'sse') {
    lines.push("import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'")
    lines.push("import { createServer } from 'node:http'")
  } else {
    lines.push("import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'")
  }

  if (auth !== 'none' && transport === 'sse') {
    lines.push("import 'dotenv/config'")
  }

  lines.push('')

  for (const tool of tools) {
    lines.push(`import { register as register_${tool.id} } from './tools/${tool.id}.js'`)
  }

  lines.push('')
  lines.push(`const server = new McpServer({`)
  lines.push(`  name: '${serverName}',`)
  lines.push(`  version: '1.0.0',`)
  lines.push(`})`)
  lines.push('')
  lines.push('// Register tools')

  for (const tool of tools) {
    lines.push(`register_${tool.id}(server)`)
  }

  lines.push('')

  if (transport === 'sse') {
    if (auth === 'api-key') {
      lines.push(`const API_KEY = process.env.MCP_API_KEY ?? ''`)
      lines.push('')
    } else if (auth === 'bearer') {
      lines.push(`const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN ?? ''`)
      lines.push('')
    }

    lines.push(`const transports = new Map<string, SSEServerTransport>()`)
    lines.push('')
    lines.push(`const httpServer = createServer(async (req, res) => {`)
    lines.push(`  const url = new URL(req.url ?? '/', \`http://\${req.headers.host}\`)`)
    lines.push('')

    if (auth === 'api-key') {
      lines.push(`  // API Key authentication`)
      lines.push(`  if (API_KEY) {`)
      lines.push(`    const key = req.headers['x-api-key'] ?? req.headers['api-key']`)
      lines.push(`    if (key !== API_KEY) {`)
      lines.push(`      res.writeHead(401, { 'Content-Type': 'application/json' })`)
      lines.push(`      res.end(JSON.stringify({ error: 'Invalid API key' }))`)
      lines.push(`      return`)
      lines.push(`    }`)
      lines.push(`  }`)
      lines.push('')
    } else if (auth === 'bearer') {
      lines.push(`  // Bearer token authentication`)
      lines.push(`  if (BEARER_TOKEN) {`)
      lines.push(`    const authHeader = req.headers.authorization ?? ''`)
      lines.push(`    if (authHeader !== \`Bearer \${BEARER_TOKEN}\`) {`)
      lines.push(`      res.writeHead(401, { 'Content-Type': 'application/json' })`)
      lines.push(`      res.end(JSON.stringify({ error: 'Invalid bearer token' }))`)
      lines.push(`      return`)
      lines.push(`    }`)
      lines.push(`  }`)
      lines.push('')
    }

    lines.push(`  if (url.pathname === '/sse') {`)
    lines.push(`    const transport = new SSEServerTransport('/messages', res)`)
    lines.push(`    transports.set(transport.sessionId, transport)`)
    lines.push(`    res.on('close', () => transports.delete(transport.sessionId))`)
    lines.push(`    await server.connect(transport)`)
    lines.push(`  } else if (url.pathname === '/messages') {`)
    lines.push(`    const sessionId = url.searchParams.get('sessionId')`)
    lines.push(`    const transport = sessionId ? transports.get(sessionId) : undefined`)
    lines.push(`    if (!transport) {`)
    lines.push(`      res.writeHead(400, { 'Content-Type': 'application/json' })`)
    lines.push(`      res.end(JSON.stringify({ error: 'Invalid session' }))`)
    lines.push(`      return`)
    lines.push(`    }`)
    lines.push(`    await transport.handlePostMessage(req, res)`)
    lines.push(`  } else if (url.pathname === '/health') {`)
    lines.push(`    res.writeHead(200, { 'Content-Type': 'application/json' })`)
    lines.push(`    res.end(JSON.stringify({ status: 'ok', tools: ${tools.length} }))`)
    lines.push(`  } else {`)
    lines.push(`    res.writeHead(404)`)
    lines.push(`    res.end('Not found')`)
    lines.push(`  }`)
    lines.push(`})`)
    lines.push('')
    lines.push(`const PORT = parseInt(process.env.PORT ?? '3001', 10)`)
    lines.push(`httpServer.listen(PORT, () => {`)
    lines.push(`  console.log(\`${serverName} MCP server running on http://localhost:\${PORT}\`)`)
    lines.push(`  console.log(\`SSE endpoint: http://localhost:\${PORT}/sse\`)`)
    lines.push(`  console.log(\`Health check: http://localhost:\${PORT}/health\`)`)
    lines.push(`})`)
  } else {
    lines.push(`async function main() {`)
    lines.push(`  const transport = new StdioServerTransport()`)
    lines.push(`  await server.connect(transport)`)
    lines.push(`  console.error('${serverName} MCP server running on stdio')`)
    lines.push(`}`)
    lines.push('')
    lines.push(`main().catch(console.error)`)
  }

  return lines.join('\n') + '\n'
}

function tsPackageJson(serverName: string, transport: Transport, auth: Auth): string {
  const deps: Record<string, string> = {
    '@modelcontextprotocol/sdk': '^1.12.1',
    zod: '^3.24.0',
  }
  if (auth !== 'none' && transport === 'sse') deps['dotenv'] = '^16.4.0'

  return JSON.stringify(
    {
      name: serverName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
      },
      dependencies: deps,
      devDependencies: {
        typescript: '^5.7.0',
        tsx: '^4.19.0',
        '@types/node': '^22.0.0',
      },
    },
    null,
    2,
  )
}

function tsTsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  )
}

function tsDockerfile(serverName: string): string {
  return `FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN corepack enable && (pnpm install --frozen-lockfile 2>/dev/null || npm ci)
COPY . .
RUN npx tsc

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
# ${serverName}
`
}

function tsReadme(serverName: string, transport: Transport, auth: Auth, tools: ToolDef[]): string {
  const toolList = tools.map(t => `- **${t.name}** -- ${t.description}`).join('\n')
  const authSection =
    auth === 'none'
      ? ''
      : `
## Authentication

${auth === 'api-key' ? 'Set the `MCP_API_KEY` environment variable. Clients must send the key via the `x-api-key` header.' : 'Set the `MCP_BEARER_TOKEN` environment variable. Clients must send `Authorization: Bearer <token>`.'}

Copy \`.env.example\` to \`.env\` and fill in your values.
`

  const connectSection =
    transport === 'sse'
      ? `## Connect a client

Add to your MCP client config (e.g. Claude Desktop \`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "url": "http://localhost:3001/sse"${auth !== 'none' ? `,\n      "headers": { "${auth === 'api-key' ? 'x-api-key' : 'Authorization'}": "${auth === 'api-key' ? 'your-api-key' : 'Bearer your-token'}" }` : ''}
    }
  }
}
\`\`\``
      : `## Connect a client

Add to your MCP client config (e.g. Claude Desktop \`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"]
    }
  }
}
\`\`\``

  return `# ${serverName}

An MCP (Model Context Protocol) server generated by [Authora Security Tools](https://tools.authora.dev).

## Tools

${toolList}

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

${connectSection}
${authSection}
## Docker

\`\`\`bash
docker build -t ${serverName} .
docker run -p 3001:3001 ${serverName}
\`\`\`

## Development

\`\`\`bash
npm run dev    # Start with hot-reload (tsx watch)
npm run build  # Compile TypeScript
npm start      # Run compiled output
\`\`\`
`
}

function tsEnvExample(auth: Auth): string {
  const lines = ['PORT=3001']
  if (auth === 'api-key') lines.push('MCP_API_KEY=your-api-key-here')
  if (auth === 'bearer') lines.push('MCP_BEARER_TOKEN=your-bearer-token-here')
  return lines.join('\n') + '\n'
}

/* ------------------------------------------------------------------ */
/*  Code generators -- Python                                          */
/* ------------------------------------------------------------------ */

function pyToolFile(tool: ToolDef): string {
  const argDefs = tool.params
    .map(p => {
      const pyType = p.type === 'number' ? 'int' : p.type === 'boolean' ? 'bool' : 'str'
      return p.required ? `    ${p.name}: ${pyType}` : `    ${p.name}: ${pyType} | None = None`
    })
    .join('\n')

  let body = ''
  switch (tool.id) {
    case 'read_file':
      body = `    with open(path, "r", encoding="utf-8") as f:
        return f.read()`
      break
    case 'write_file':
      body = `    from pathlib import Path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Wrote {len(content)} bytes to {path}"`
      break
    case 'list_directory':
      body = `    from pathlib import Path
    p = Path(path)
    if recursive:
        entries = [str(x.relative_to(p)) for x in p.rglob("*")]
    else:
        entries = [x.name + ("/" if x.is_dir() else "") for x in p.iterdir()]
    return "\\n".join(sorted(entries))`
      break
    case 'search_files':
      body = `    import glob as g
    matches = g.glob(pattern, root_dir=directory, recursive=True)
    return "\\n".join(matches) if matches else "No files found"`
      break
    case 'execute_command':
      body = `    import subprocess
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True,
        timeout=(timeout_ms or 30000) / 1000,
    )
    output = result.stdout
    if result.stderr:
        output += "\\n--- stderr ---\\n" + result.stderr
    return output`
      break
    case 'http_request':
      body = `    import urllib.request, json as _json
    req = urllib.request.Request(url, method=method or "GET")
    if headers:
        for k, v in _json.loads(headers).items():
            req.add_header(k, v)
    if body:
        req.data = body.encode()
    with urllib.request.urlopen(req) as resp:
        return f"{resp.status} {resp.reason}\\n\\n{resp.read().decode()}"`
      break
    case 'query_database':
      body = `    # Replace with your preferred database driver
    return (
        f"Query received: {query}\\n"
        f"Connection: {connection_string or 'default'}\\n\\n"
        "Note: Install a database driver (psycopg2, mysql-connector, sqlite3) "
        "and implement the query logic."
    )`
      break
    case 'get_environment':
      body = `    import os
    if name:
        val = os.environ.get(name)
        return f"{name}={val}" if val is not None else f"{name} is not set"
    return "\\n".join(f"{k}={v}" for k, v in sorted(os.environ.items()) if not k.startswith("npm_"))`
      break
    case 'create_note':
      body = `    from pathlib import Path
    notes_dir = Path.cwd() / ".notes"
    notes_dir.mkdir(exist_ok=True)
    import re, time
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    filename = f"{int(time.time() * 1000)}-{slug}.md"
    header = f"---\\ntags: {tags}\\n---\\n\\n" if tags else ""
    (notes_dir / filename).write_text(f"{header}# {title}\\n\\n{content}\\n")
    return f"Note saved: .notes/{filename}"`
      break
    case 'search_web':
      body = `    # Replace with your preferred search API (SerpAPI, Brave Search, etc.)
    return (
        f"Search query: {query}\\n"
        f"Max results: {max_results or 10}\\n\\n"
        "Note: Integrate a search API and add your API key to .env"
    )`
      break
    default:
      body = `    return "Not implemented"`
  }

  return `"""${tool.description}"""


def ${tool.id}_schema():
    return {
        "type": "object",
        "properties": {
${tool.params.map(p => `            "${p.name}": {"type": "${p.type === 'number' ? 'integer' : p.type}", "description": "${p.description}"},`).join('\n')}
        },
        "required": [${tool.params.filter(p => p.required).map(p => `"${p.name}"`).join(', ')}],
    }


async def ${tool.id}_handler(arguments: dict) -> str:
${argDefs.replace(/^    /gm, '    ').split('\n').map(l => {
    const match = l.trim().match(/^(\w+):\s*(.+?)(?:\s*=\s*(.+))?$/)
    if (!match) return ''
    const [, pname, , defVal] = match
    return `    ${pname} = arguments${defVal !== undefined ? `.get("${pname}")` : `["${pname}"]`}`
  }).filter(Boolean).join('\n')}
    try:
${body}
    except Exception as e:
        return f"Error: {e}"
`
}

function pyServer(serverName: string, transport: Transport, auth: Auth, tools: ToolDef[]): string {
  const lines: string[] = []

  lines.push(`"""${serverName} - MCP Server"""`)
  lines.push('')
  lines.push('from mcp.server import Server')
  if (transport === 'sse') {
    lines.push('from mcp.server.sse import SseServerTransport')
    lines.push('from starlette.applications import Starlette')
    lines.push('from starlette.routing import Route, Mount')
    lines.push('from starlette.responses import JSONResponse')
    if (auth !== 'none') {
      lines.push('from starlette.middleware import Middleware')
      lines.push('from starlette.middleware.base import BaseHTTPMiddleware')
    }
    lines.push('import uvicorn')
  } else {
    lines.push('from mcp.server.stdio import stdio_server')
  }
  if (auth !== 'none') {
    lines.push('import os')
  }
  lines.push('import asyncio')
  lines.push('')

  for (const tool of tools) {
    lines.push(`from tools.${tool.id} import ${tool.id}_schema, ${tool.id}_handler`)
  }

  lines.push('')
  lines.push(`server = Server("${serverName}")`)
  lines.push('')
  lines.push('')
  lines.push('@server.list_tools()')
  lines.push('async def list_tools():')
  lines.push('    return [')
  for (const tool of tools) {
    lines.push(`        {`)
    lines.push(`            "name": "${tool.name}",`)
    lines.push(`            "description": "${tool.description}",`)
    lines.push(`            "inputSchema": ${tool.id}_schema(),`)
    lines.push(`        },`)
  }
  lines.push('    ]')
  lines.push('')
  lines.push('')
  lines.push('@server.call_tool()')
  lines.push('async def call_tool(name: str, arguments: dict):')
  lines.push('    handlers = {')
  for (const tool of tools) {
    lines.push(`        "${tool.name}": ${tool.id}_handler,`)
  }
  lines.push('    }')
  lines.push('    handler = handlers.get(name)')
  lines.push('    if not handler:')
  lines.push('        return [{"type": "text", "text": f"Unknown tool: {name}"}]')
  lines.push('    result = await handler(arguments)')
  lines.push('    return [{"type": "text", "text": result}]')
  lines.push('')
  lines.push('')

  if (transport === 'sse') {
    if (auth === 'api-key') {
      lines.push('class AuthMiddleware(BaseHTTPMiddleware):')
      lines.push('    async def dispatch(self, request, call_next):')
      lines.push('        api_key = os.environ.get("MCP_API_KEY", "")')
      lines.push('        if api_key:')
      lines.push('            key = request.headers.get("x-api-key") or request.headers.get("api-key")')
      lines.push('            if key != api_key:')
      lines.push('                return JSONResponse({"error": "Invalid API key"}, status_code=401)')
      lines.push('        return await call_next(request)')
      lines.push('')
      lines.push('')
    } else if (auth === 'bearer') {
      lines.push('class AuthMiddleware(BaseHTTPMiddleware):')
      lines.push('    async def dispatch(self, request, call_next):')
      lines.push('        token = os.environ.get("MCP_BEARER_TOKEN", "")')
      lines.push('        if token:')
      lines.push('            auth_header = request.headers.get("authorization", "")')
      lines.push('            if auth_header != f"Bearer {token}":')
      lines.push('                return JSONResponse({"error": "Invalid bearer token"}, status_code=401)')
      lines.push('        return await call_next(request)')
      lines.push('')
      lines.push('')
    }

    lines.push('sse = SseServerTransport("/messages")')
    lines.push('')
    lines.push('')
    lines.push('async def handle_sse(request):')
    lines.push('    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:')
    lines.push('        await server.run(streams[0], streams[1], server.create_initialization_options())')
    lines.push('')
    lines.push('')
    lines.push('async def health(request):')
    lines.push(`    return JSONResponse({"status": "ok", "tools": ${tools.length}})`)
    lines.push('')
    lines.push('')
    lines.push('app = Starlette(')
    lines.push('    routes=[')
    lines.push('        Route("/sse", endpoint=handle_sse),')
    lines.push('        Mount("/messages", app=sse.handle_post_message),')
    lines.push('        Route("/health", endpoint=health),')
    lines.push('    ],')
    if (auth !== 'none') {
      lines.push('    middleware=[Middleware(AuthMiddleware)],')
    }
    lines.push(')')
    lines.push('')
    lines.push('')
    lines.push('if __name__ == "__main__":')
    lines.push('    import os as _os')
    lines.push('    port = int(_os.environ.get("PORT", "3001"))')
    lines.push(`    print(f"${serverName} MCP server running on http://localhost:{port}")`)
    lines.push(`    print(f"SSE endpoint: http://localhost:{port}/sse")`)
    lines.push('    uvicorn.run(app, host="0.0.0.0", port=port)')
  } else {
    lines.push('async def main():')
    lines.push('    async with stdio_server() as streams:')
    lines.push('        await server.run(streams[0], streams[1], server.create_initialization_options())')
    lines.push('')
    lines.push('')
    lines.push('if __name__ == "__main__":')
    lines.push('    asyncio.run(main())')
  }

  return lines.join('\n') + '\n'
}

function pyProjectToml(serverName: string, transport: Transport): string {
  const deps = ['mcp>=1.3.0']
  if (transport === 'sse') deps.push('uvicorn>=0.34.0', 'starlette>=0.45.0')

  return `[project]
name = "${serverName}"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
${deps.map(d => `    "${d}",`).join('\n')}
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
`
}

function pyDockerfile(serverName: string, transport: Transport): string {
  if (transport === 'sse') {
    return `FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY src/ ./src/
ENV PORT=3001
EXPOSE 3001
CMD ["python", "src/server.py"]
# ${serverName}
`
  }
  return `FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY src/ ./src/
CMD ["python", "src/server.py"]
# ${serverName}
`
}

function pyReadme(serverName: string, transport: Transport, auth: Auth, tools: ToolDef[]): string {
  const toolList = tools.map(t => `- **${t.name}** -- ${t.description}`).join('\n')
  const authSection =
    auth === 'none'
      ? ''
      : `
## Authentication

${auth === 'api-key' ? 'Set the `MCP_API_KEY` environment variable. Clients must send the key via the `x-api-key` header.' : 'Set the `MCP_BEARER_TOKEN` environment variable. Clients must send `Authorization: Bearer <token>`.'}

Copy \`.env.example\` to \`.env\` and fill in your values.
`

  const connectSection =
    transport === 'sse'
      ? `## Connect a client

Add to your MCP client config (e.g. Claude Desktop \`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "url": "http://localhost:3001/sse"${auth !== 'none' ? `,\n      "headers": { "${auth === 'api-key' ? 'x-api-key' : 'Authorization'}": "${auth === 'api-key' ? 'your-api-key' : 'Bearer your-token'}" }` : ''}
    }
  }
}
\`\`\``
      : `## Connect a client

Add to your MCP client config (e.g. Claude Desktop \`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "command": "python",
      "args": ["src/server.py"]
    }
  }
}
\`\`\``

  return `# ${serverName}

An MCP (Model Context Protocol) server generated by [Authora Security Tools](https://tools.authora.dev).

## Tools

${toolList}

## Quick start

\`\`\`bash
pip install -e .
python src/server.py
\`\`\`

${connectSection}
${authSection}
## Docker

\`\`\`bash
docker build -t ${serverName} .
docker run -p 3001:3001 ${serverName}
\`\`\`
`
}

function pyEnvExample(auth: Auth): string {
  const lines = ['PORT=3001']
  if (auth === 'api-key') lines.push('MCP_API_KEY=your-api-key-here')
  if (auth === 'bearer') lines.push('MCP_BEARER_TOKEN=your-bearer-token-here')
  return lines.join('\n') + '\n'
}

/* ------------------------------------------------------------------ */
/*  Project file generation                                            */
/* ------------------------------------------------------------------ */

function generateFiles(
  language: Language,
  transport: Transport,
  auth: Auth,
  serverName: string,
  selectedTools: ToolDef[],
): Record<string, string> {
  const files: Record<string, string> = {}

  if (language === 'typescript') {
    files['package.json'] = tsPackageJson(serverName, transport, auth)
    files['tsconfig.json'] = tsTsconfig()
    files['src/index.ts'] = tsIndex(serverName, transport, auth, selectedTools)
    for (const tool of selectedTools) {
      files[`src/tools/${tool.id}.ts`] = tsToolFile(tool)
    }
    files['.env.example'] = tsEnvExample(auth)
    files['README.md'] = tsReadme(serverName, transport, auth, selectedTools)
    files['Dockerfile'] = tsDockerfile(serverName)
  } else {
    files['pyproject.toml'] = pyProjectToml(serverName, transport)
    files['src/server.py'] = pyServer(serverName, transport, auth, selectedTools)
    files['src/tools/__init__.py'] = ''
    for (const tool of selectedTools) {
      files[`src/tools/${tool.id}.py`] = pyToolFile(tool)
    }
    files['.env.example'] = pyEnvExample(auth)
    files['README.md'] = pyReadme(serverName, transport, auth, selectedTools)
    files['Dockerfile'] = pyDockerfile(serverName, transport)
  }

  return files
}

function downloadProject(files: Record<string, string>, projectName: string) {
  let script = '#!/bin/bash\n'
  script += `# ${projectName} - MCP Server\n`
  script += `# Generated by Authora Security Tools (tools.authora.dev)\n\n`
  script += `set -e\n\n`

  // Collect all directories needed
  const dirs = new Set<string>()
  for (const path of Object.keys(files)) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'))
    }
  }
  if (dirs.size > 0) {
    script += `mkdir -p ${[...dirs].map(d => `"${projectName}/${d}"`).join(' ')}\n\n`
  }

  for (const [path, content] of Object.entries(files)) {
    // Use a unique delimiter to avoid conflicts with file content
    script += `cat > "${projectName}/${path}" << 'ENDOFFILE_${path.replace(/[^a-zA-Z0-9]/g, '_')}'\n${content}\nENDOFFILE_${path.replace(/[^a-zA-Z0-9]/g, '_')}\n\n`
  }

  script += `echo ""\n`
  script += `echo "Project '${projectName}' created successfully!"\n`
  script += `echo ""\n`
  script += `echo "Next steps:"\n`
  script += `echo "  cd ${projectName}"\n`
  if (files['package.json']) {
    script += `echo "  npm install"\n`
    script += `echo "  npx tsx src/index.ts"\n`
  } else {
    script += `echo "  pip install -e ."\n`
    script += `echo "  python src/server.py"\n`
  }

  const blob = new Blob([script], { type: 'text/x-shellscript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}-setup.sh`
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Syntax highlighting (simple keyword coloring)                      */
/* ------------------------------------------------------------------ */

function highlightCode(code: string, language: Language): React.ReactElement[] {
  const tsKeywords = /\b(import|from|export|const|let|var|function|async|await|return|if|else|new|typeof|type|interface|for|of|try|catch|throw|class|extends|implements)\b/g
  const pyKeywords = /\b(import|from|def|async|await|return|if|else|for|in|try|except|class|with|as|not|and|or|is|None|True|False|raise)\b/g
  const keywords = language === 'typescript' ? tsKeywords : pyKeywords

  return code.split('\n').map((line, i) => {
    const parts: React.ReactElement[] = []
    let lastIndex = 0
    const re = new RegExp(keywords.source, 'g')
    const stringRe = /(['"`])((?:(?!\1).)*)\1/g

    // Highlight strings first, then keywords in non-string parts
    const stringParts: { start: number; end: number }[] = []
    let sm: RegExpExecArray | null
    while ((sm = stringRe.exec(line)) !== null) {
      stringParts.push({ start: sm.index, end: sm.index + sm[0].length })
    }

    const isInString = (idx: number) => stringParts.some(s => idx >= s.start && idx < s.end)

    // Build colored spans
    let m: RegExpExecArray | null
    const tokens: { start: number; end: number; type: 'keyword' | 'string' | 'comment' }[] = []

    // Comments
    const commentIdx = language === 'typescript' ? line.indexOf('//') : line.indexOf('#')
    if (commentIdx >= 0 && !isInString(commentIdx)) {
      tokens.push({ start: commentIdx, end: line.length, type: 'comment' })
    }

    // Strings
    for (const sp of stringParts) {
      if (!tokens.some(t => t.type === 'comment' && sp.start >= t.start)) {
        tokens.push({ start: sp.start, end: sp.end, type: 'string' })
      }
    }

    // Keywords
    while ((m = re.exec(line)) !== null) {
      if (!isInString(m.index) && !tokens.some(t => t.type === 'comment' && m!.index >= t.start)) {
        tokens.push({ start: m.index, end: m.index + m[0].length, type: 'keyword' })
      }
    }

    tokens.sort((a, b) => a.start - b.start)

    // Remove overlapping tokens
    const filtered: typeof tokens = []
    for (const t of tokens) {
      if (filtered.length === 0 || t.start >= filtered[filtered.length - 1].end) {
        filtered.push(t)
      }
    }

    for (const t of filtered) {
      if (t.start > lastIndex) {
        parts.push(<span key={`${i}-${lastIndex}`}>{line.slice(lastIndex, t.start)}</span>)
      }
      const color =
        t.type === 'keyword' ? '#c792ea' : t.type === 'string' ? '#c3e88d' : '#546e7a'
      parts.push(
        <span key={`${i}-${t.start}`} style={{ color }}>
          {line.slice(t.start, t.end)}
        </span>,
      )
      lastIndex = t.end
    }
    if (lastIndex < line.length) {
      parts.push(<span key={`${i}-${lastIndex}`}>{line.slice(lastIndex)}</span>)
    }

    return (
      <div key={i} className="leading-6">
        <span className="inline-block w-10 text-right mr-4 text-[#546e7a] select-none text-xs">
          {i + 1}
        </span>
        {parts.length > 0 ? parts : '\n'}
      </div>
    )
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function McpStarter() {
  const [language, setLanguage] = useState<Language>('typescript')
  const [transport, setTransport] = useState<Transport>('sse')
  const [auth, setAuth] = useState<Auth>('none')
  const [serverName, setServerName] = useState('my-mcp-server')
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(
    new Set(['read_file', 'write_file', 'list_directory']),
  )
  const [previewTab, setPreviewTab] = useState('main')

  const selectedTools = TOOLS.filter(t => selectedToolIds.has(t.id))

  const toggleTool = (id: string) => {
    setSelectedToolIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedToolIds(new Set(TOOLS.map(t => t.id)))
  const selectNone = () => setSelectedToolIds(new Set())

  const files = generateFiles(language, transport, auth, serverName, selectedTools)

  const mainFile = language === 'typescript' ? 'src/index.ts' : 'src/server.py'
  const previewFile =
    previewTab === 'main'
      ? mainFile
      : previewTab === 'package'
        ? language === 'typescript'
          ? 'package.json'
          : 'pyproject.toml'
        : previewTab === 'dockerfile'
          ? 'Dockerfile'
          : previewTab === 'readme'
            ? 'README.md'
            : previewTab // tool file path

  const previewCode = files[previewFile] ?? '// Select a file to preview'

  const toolFilePaths = selectedTools.map(t =>
    language === 'typescript' ? `src/tools/${t.id}.ts` : `src/tools/${t.id}.py`,
  )

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">MCP Server Generator</h2>
        <p className="text-sm text-[var(--color-dim)]">
          Generate a complete, ready-to-run MCP server project. Configure your options, preview the code, and download.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column -- Configuration */}
        <div className="space-y-4">
          {/* Language & Transport */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
                Language
              </label>
              <Select
                value={language}
                onChange={v => setLanguage(v as Language)}
                options={LANGUAGE_OPTIONS}
                searchable={false}
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
                Transport
              </label>
              <Select
                value={transport}
                onChange={v => setTransport(v as Transport)}
                options={TRANSPORT_OPTIONS}
                searchable={false}
              />
            </div>
          </div>

          {/* Auth & Server Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
                Authentication
              </label>
              <Select
                value={auth}
                onChange={v => setAuth(v as Auth)}
                options={AUTH_OPTIONS}
                searchable={false}
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-dim)] uppercase tracking-wider mb-1">
                Server Name
              </label>
              <input
                type="text"
                value={serverName}
                onChange={e =>
                  setServerName(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-'),
                  )
                }
                className="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500"
                placeholder="my-mcp-server"
              />
            </div>
          </div>

          {/* Tool selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-[var(--color-dim)] uppercase tracking-wider">
                Tools to include
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {selectedToolIds.size} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-[11px] text-[var(--color-dim)] hover:text-white transition-colors"
                >
                  All
                </button>
                <span className="text-[var(--color-dim2)]">/</span>
                <button
                  onClick={selectNone}
                  className="text-[11px] text-[var(--color-dim)] hover:text-white transition-colors"
                >
                  None
                </button>
              </div>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] max-h-[360px] overflow-y-auto">
              {TOOLS.map(tool => (
                <label
                  key={tool.id}
                  className="flex items-start gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedToolIds.has(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    className="mt-0.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-mono text-white">{tool.name}</span>
                    <p className="text-xs text-[var(--color-dim)] mt-0.5">{tool.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right column -- Live preview */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <button
              onClick={() => setPreviewTab('main')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                previewTab === 'main'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-[var(--color-dim)] hover:text-white hover:bg-white/5'
              }`}
            >
              {language === 'typescript' ? 'index.ts' : 'server.py'}
            </button>
            <button
              onClick={() => setPreviewTab('package')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                previewTab === 'package'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-[var(--color-dim)] hover:text-white hover:bg-white/5'
              }`}
            >
              {language === 'typescript' ? 'package.json' : 'pyproject.toml'}
            </button>
            <button
              onClick={() => setPreviewTab('dockerfile')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                previewTab === 'dockerfile'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-[var(--color-dim)] hover:text-white hover:bg-white/5'
              }`}
            >
              Dockerfile
            </button>
            <button
              onClick={() => setPreviewTab('readme')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                previewTab === 'readme'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-[var(--color-dim)] hover:text-white hover:bg-white/5'
              }`}
            >
              README
            </button>
            {toolFilePaths.length > 0 && (
              <div className="relative group">
                <button
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    toolFilePaths.includes(previewTab)
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'text-[var(--color-dim)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Tools
                  <svg className="inline w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute z-50 left-0 mt-1 hidden group-hover:block bg-[#1a1a24] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden min-w-[180px]">
                  {selectedTools.map(t => {
                    const fp = language === 'typescript' ? `src/tools/${t.id}.ts` : `src/tools/${t.id}.py`
                    return (
                      <button
                        key={t.id}
                        onClick={() => setPreviewTab(fp)}
                        className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                          previewTab === fp
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'text-[#ccc] hover:bg-white/5'
                        }`}
                      >
                        {t.id}.{language === 'typescript' ? 'ts' : 'py'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0">
            <div className="bg-[#0d1117] border border-[var(--color-border)] rounded-lg overflow-auto h-[520px]">
              <pre className="p-4 text-[13px] font-mono text-[#d4d4d4] whitespace-pre">
                {previewFile.endsWith('.json') || previewFile.endsWith('.toml') || previewFile.endsWith('.md') ? (
                  <code>{previewCode}</code>
                ) : (
                  <code>{highlightCode(previewCode, language)}</code>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-[var(--color-dim)]">
          {Object.keys(files).length} files will be generated
          {auth !== 'none' && ' (including auth middleware)'}
        </p>
        <button
          onClick={() => downloadProject(files, serverName)}
          disabled={selectedTools.length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Project
        </button>
      </div>
    </div>
  )
}
