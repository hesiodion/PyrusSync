/**
 * yjsWsHandler.ts
 *
 * Reimplements the y-websocket server-side sync protocol (previously
 * setupWSConnection from y-websocket/bin/utils, removed in v3).
 *
 * Protocol messages (binary, Uint8Array):
 *   [0] = messageSync      → initial doc state + incremental updates
 *   [1] = messageAwareness → cursor positions, user metadata
 *
 * Sync sub-messages:
 *   [0, 0] = syncStep1 → server sends its state vector
 *   [0, 1] = syncStep2 → server sends missing updates to client
 *   [0, 2] = update    → client sends a doc update, server broadcasts it
 */

import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import type { WebSocket } from 'ws'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

// ─── Per-document state ───────────────────────────────────────────────────────

interface DocState {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  connections: Set<WebSocket>
}

const docs = new Map<string, DocState>()

export function getOrCreateDocState(docId: string): DocState {
  if (docs.has(docId)) return docs.get(docId)!

  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)

  awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    const changedClients = added.concat(updated, removed)
    const state = docs.get(docId)
    if (!state) return

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    )
    const message = encoding.toUint8Array(encoder)

    for (const conn of state.connections) {
      if (conn.readyState === conn.OPEN) {
        conn.send(message)
      }
    }
  })

  const state: DocState = { doc, awareness, connections: new Set() }
  docs.set(docId, state)
  return state
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export function handleYjsConnection(
  socket: WebSocket,
  docId: string,
): void {
  const state = getOrCreateDocState(docId)
  const { doc, awareness, connections } = state

  connections.add(socket)

  // ── Send syncStep1: our state vector → client will reply with syncStep2 ──
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, doc)
    socket.send(encoding.toUint8Array(encoder))
  }

  // ── Send current awareness states to the new client ──
  if (awareness.states.size > 0) {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.states.keys()))
    )
    socket.send(encoding.toUint8Array(encoder))
  }

  // ── Handle incoming messages ──
  socket.on('message', (data: Buffer) => {
    try {
      const message = new Uint8Array(data)
      const decoder = decoding.createDecoder(message)
      const msgType = decoding.readVarUint(decoder)

      if (msgType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null)

        // If we produced a reply (syncStep2 or update ack), send it back
        if (encoding.length(encoder) > 1) {
          socket.send(encoding.toUint8Array(encoder))
        }

        // If this was an update (type 2), broadcast to all other clients
        if (syncMessageType === syncProtocol.messageYjsSyncStep2 ||
            syncMessageType === syncProtocol.messageYjsUpdate) {
          broadcastUpdate(message, socket, connections)
        }
      } else if (msgType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          socket
        )
      }
    } catch (err) {
      console.error(`[Yjs] Error processing message for doc "${docId}":`, err)
    }
  })

  // ── Cleanup on disconnect ──
  socket.on('close', () => {
    connections.delete(socket)

    // Remove this client's awareness state
    awarenessProtocol.removeAwarenessStates(
      awareness,
      Array.from(awareness.states.keys()).filter(
        (clientId) => awareness.states.get(clientId)?.['_socket'] === socket
      ),
      null
    )

    // Clean up doc from memory if no one is connected
    if (connections.size === 0) {
      awareness.destroy()
      docs.delete(docId)
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function broadcastUpdate(
  message: Uint8Array,
  sender: WebSocket,
  connections: Set<WebSocket>
): void {
  for (const conn of connections) {
    if (conn !== sender && conn.readyState === conn.OPEN) {
      conn.send(message)
    }
  }
}
