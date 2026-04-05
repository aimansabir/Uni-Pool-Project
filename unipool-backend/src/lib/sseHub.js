const clients = new Map();

const addClient = (userId, res) => {
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(res);
};

const removeClient = (userId, res) => {
    if (!clients.has(userId)) return;
    clients.get(userId).delete(res);
    if (clients.get(userId).size === 0) clients.delete(userId);
};

const emitToUser = (userId, event, payload) => {
    const userClients = clients.get(userId);
    if (!userClients) return;

    for (const res of userClients) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
};

module.exports = {
    addClient,
    removeClient,
    emitToUser,
};