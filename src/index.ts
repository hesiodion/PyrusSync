/**
 * index.ts
 *
 * Entry point. Starts the Fastify server and handles graceful shutdown.
 *
 * Configuration via environment variables:
 *   HOST  (default: 0.0.0.0)
 *   PORT  (default: 3000)
 */

import { buildServer } from './server.js'
import { saveAllDocs } from './collab/yjsManager.js'

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = parseInt(process.env.PORT ?? '3000', 10)

// ─── Start ────────────────────────────────────────────────────────────────────

const app = await buildServer()

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Server] Received ${signal}, shutting down...`)
  saveAllDocs()
  await app.close()
  console.log('[Server] Goodbye.')
  process.exit(0)
}

process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// ─── Listen ───────────────────────────────────────────────────────────────────

try {
  await app.listen({ host: HOST, port: PORT })
  console.log(`[Server] Listening on http://${HOST}:${PORT}`)
  console.log(`[Server] WebSocket endpoint: ws://${HOST}:${PORT}/collab/<docId>?name=<userName>`)
} catch (err) {
  console.error('[Server] Failed to start:', err)
  process.exit(1)
}