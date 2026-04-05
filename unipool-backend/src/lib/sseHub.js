/**
 * SSE Hub — Server-Sent Events connection manager.
 * Keeps one connection per authenticated user and allows any service
 * to push real-time events via `emitToUser(userId, event, data)`.
 */

const clients = new Map(); // userId → Set<Response>

/**
 * Register an SSE connection for a user.
 * @param {string} userId
 * @param {import('express').Response} res
 */
function addClient(userId, res) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);
}

/**
 * Remove an SSE connection (called on client disconnect).
 * @param {string} userId
 * @param {import('express').Response} res
 */
function removeClient(userId, res) {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(res);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

/**
 * Push an SSE event to all connections for a given user.
 * @param {string} userId  Target user id
 * @param {string} event   Event name (e.g. 'ride-toast')
 * @param {object} data    JSON-serialisable payload
 */
function emitToUser(userId, event, data) {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    res.write(payload);
  }
}

module.exports = { addClient, removeClient, emitToUser };
