/**
 * server.ts
 *
 * Fastify server with:
 *   - @fastify/websocket plugin for real-time Yjs sync
 *   - Custom Yjs sync handler (y-websocket v3 dropped server-side exports)
 *   - REST endpoints for health, presence, and document listing
 *
 * WebSocket URL format:
 *   ws://host:port/collab/<docId>?name=<userName>
 *
 * REST endpoints:
 *   GET /health          → server status
 *   GET /presence        → all connected users grouped by document
 *   GET /presence/:docId → users connected to a specific document
 *   GET /docs            → list of active documents in memory
 */

import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import { handleYjsConnection } from './collab/yjsWsHandler.js'
import { getOrCreateDoc, getActiveDocIds } from './collab/yjsManager.js'
import {
  addUser,
  removeUser,
  getUsersForDoc,
  getPresenceSummary,
} from './collab/presenceManager.js'
import { randomUUID } from 'node:crypto'

export async function buildServer() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  })

  // ─── WebSocket plugin ──────────────────────────────────────────────────────

  await app.register(fastifyWebsocket)

  // ─── Collaborative WebSocket route ────────────────────────────────────────

  app.get('/collab/:docId', { websocket: true }, (socket, request) => {
    const { docId } = request.params as { docId: string }
    const userName = (request.query as Record<string, string>).name ?? 'Anonyme'
    const clientId = randomUUID()

    // Presence tracking
    addUser(clientId, userName, docId)
    ;(socket as unknown as Record<string, unknown>)._clientId = clientId

    // Ensure yjsManager knows about this doc (for REST /docs endpoint)
    getOrCreateDoc(docId)

    // Yjs sync protocol (sync + awareness)
    handleYjsConnection(socket, docId)

    // Broadcast presence to all clients on this doc
    broadcastPresence(docId, app)

    socket.on('close', () => {
      removeUser(clientId)
      broadcastPresence(docId, app)
    })

    socket.on('error', (err: Error) => {
      app.log.error(`[WS] Error for client ${clientId}: ${err.message}`)
      removeUser(clientId)
    })
  })

  // ─── REST: health check ────────────────────────────────────────────────────

  app.get('/health', async () => ({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    activeDocs: getActiveDocIds().length,
    timestamp: new Date().toISOString(),
  }))

  // ─── REST: presence (all documents) ───────────────────────────────────────

  app.get('/presence', async () => getPresenceSummary())

  // ─── REST: presence (specific document) ───────────────────────────────────

  app.get('/presence/:docId', async (request) => {
    const { docId } = request.params as { docId: string }
    return { docId, users: getUsersForDoc(docId) }
  })

  // ─── REST: list active documents ──────────────────────────────────────────

  app.get('/docs', async () => ({ docs: getActiveDocIds() }))

  return app
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function broadcastPresence(docId: string, app: ReturnType<typeof Fastify>): void {
  const users = getUsersForDoc(docId)
  const message = JSON.stringify({ type: 'presence', docId, users })

  const wss = (app as unknown as {
    websocketServer: {
      clients: Set<{ _clientId?: string; readyState: number; send: (msg: string) => void }>
    }
  }).websocketServer

  if (!wss) return

  for (const client of wss.clients) {
    const c = client as unknown as {
      _clientId?: string
      readyState: number
      send: (msg: string) => void
    }
    if (c.readyState === 1 && c._clientId) {
      if (getUsersForDoc(docId).some((u) => u.clientId === c._clientId)) {
        c.send(message)
      }
    }
  }
}
