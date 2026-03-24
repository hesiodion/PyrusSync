/**
 * YjsManager
 *
 * Manages Yjs documents lifecycle:
 *   - Creates and caches Y.Doc instances per docId
 *   - Persists document state as binary snapshots in JSON files
 *   - Loads existing snapshots on first access
 *   - Auto-saves on a configurable interval after each update
 *
 * Persistence format:
 *   data/docs/<docId>.json  →  { "docId": "...", "state": "<base64>" }
 *
 * The state is a Uint8Array encoded as base64 (Y.encodeStateAsUpdate).
 */

import * as Y from 'yjs'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = './data/docs'
const SAVE_DEBOUNCE_MS = 2000 // save 2s after last update

// Ensure the data directory exists at startup
mkdirSync(DATA_DIR, { recursive: true })

interface DocEntry {
  doc: Y.Doc
  saveTimer: ReturnType<typeof setTimeout> | null
}

const docCache = new Map<string, DocEntry>()

function docPath(docId: string): string {
  return join(DATA_DIR, `${docId}.json`)
}

/**
 * Load a persisted document from disk, or create a fresh one.
 */
function loadDoc(docId: string): Y.Doc {
  const doc = new Y.Doc()
  const path = docPath(docId)

  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      const state = Buffer.from(raw.state, 'base64')
      Y.applyUpdate(doc, state)
      console.log(`[Yjs] Loaded doc "${docId}" from disk`)
    } catch (err) {
      console.warn(`[Yjs] Failed to load doc "${docId}", starting fresh:`, err)
    }
  } else {
    console.log(`[Yjs] New doc "${docId}" created`)
  }

  return doc
}

/**
 * Persist the current document state to disk as a JSON file.
 */
function saveDoc(docId: string, doc: Y.Doc): void {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
    const payload = JSON.stringify({ docId, state }, null, 2)
    writeFileSync(docPath(docId), payload, 'utf-8')
    console.log(`[Yjs] Saved doc "${docId}"`)
  } catch (err) {
    console.error(`[Yjs] Failed to save doc "${docId}":`, err)
  }
}

/**
 * Schedule a debounced save after an update.
 * Resets the timer if another update arrives within SAVE_DEBOUNCE_MS.
 */
function scheduleSave(docId: string, entry: DocEntry): void {
  if (entry.saveTimer) clearTimeout(entry.saveTimer)
  entry.saveTimer = setTimeout(() => {
    saveDoc(docId, entry.doc)
    entry.saveTimer = null
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Get (or create) the Y.Doc for a given docId.
 * Attaches an update observer that triggers auto-save.
 */
export function getOrCreateDoc(docId: string): Y.Doc {
  const existing = docCache.get(docId)
  if (existing) return existing.doc

  const doc = loadDoc(docId)
  const entry: DocEntry = { doc, saveTimer: null }
  docCache.set(docId, entry)

  // Auto-save on every update
  doc.on('update', () => {
    scheduleSave(docId, entry)
  })

  return doc
}

/**
 * Force an immediate save for all cached documents.
 * Called on server shutdown.
 */
export function saveAllDocs(): void {
  console.log('[Yjs] Flushing all documents to disk...')
  for (const [docId, entry] of docCache.entries()) {
    if (entry.saveTimer) {
      clearTimeout(entry.saveTimer)
      entry.saveTimer = null
    }
    saveDoc(docId, entry.doc)
  }
}

/**
 * Return a list of all active document IDs.
 */
export function getActiveDocIds(): string[] {
  return Array.from(docCache.keys())
}
