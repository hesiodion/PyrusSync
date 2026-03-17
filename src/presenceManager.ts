/**
 * PresenceManager
 *
 * Tracks connected users across all documents.
 * Each user is identified by a unique clientId generated at WebSocket connection.
 *
 * A user entry contains:
 *   - clientId  : unique identifier for this connection
 *   - name      : display name sent by the client
 *   - color     : assigned color for cursor display
 *   - docId     : which document this user is currently editing
 *   - connectedAt : ISO timestamp of connection
 */

export interface ConnectedUser {
  clientId: string
  name: string
  color: string
  docId: string
  connectedAt: string
}

// Palette of colors assigned round-robin to new connections
const COLOR_PALETTE = [
  '#E57373', '#64B5F6', '#81C784', '#FFD54F',
  '#BA68C8', '#4DB6AC', '#FF8A65', '#90A4AE',
]

let colorIndex = 0

function nextColor(): string {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length]
  colorIndex++
  return color
}

// Map of clientId → ConnectedUser
const users = new Map<string, ConnectedUser>()

/**
 * Register a new connected user.
 * Called when a WebSocket connection is established.
 */
export function addUser(clientId: string, name: string, docId: string): ConnectedUser {
  const user: ConnectedUser = {
    clientId,
    name: name || `User-${clientId.slice(0, 6)}`,
    color: nextColor(),
    docId,
    connectedAt: new Date().toISOString(),
  }
  users.set(clientId, user)
  console.log(`[Presence] + ${user.name} joined doc "${docId}" (${clientId})`)
  return user
}

/**
 * Remove a user on disconnection.
 */
export function removeUser(clientId: string): void {
  const user = users.get(clientId)
  if (user) {
    console.log(`[Presence] - ${user.name} left doc "${user.docId}" (${clientId})`)
    users.delete(clientId)
  }
}

/**
 * Return all users currently connected to a given document.
 */
export function getUsersForDoc(docId: string): ConnectedUser[] {
  return Array.from(users.values()).filter((u) => u.docId === docId)
}

/**
 * Return all connected users across all documents.
 */
export function getAllUsers(): ConnectedUser[] {
  return Array.from(users.values())
}

/**
 * Return a summary grouped by document.
 * Used by the REST endpoint GET /presence.
 */
export function getPresenceSummary(): Record<string, ConnectedUser[]> {
  const summary: Record<string, ConnectedUser[]> = {}
  for (const user of users.values()) {
    if (!summary[user.docId]) summary[user.docId] = []
    summary[user.docId].push(user)
  }
  return summary
}
