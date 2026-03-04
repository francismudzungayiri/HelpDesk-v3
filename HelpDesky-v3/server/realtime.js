const clients = new Map();
let nextClientId = 1;

const serializeEvent = (eventName, payload) => {
  const data = payload === undefined ? {} : payload;
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
};

const writeEvent = (res, eventName, payload) => {
  res.write(serializeEvent(eventName, payload));
};

const subscribe = ({ res, user }) => {
  const id = nextClientId++;
  clients.set(id, { res, user });
  return id;
};

const unsubscribe = (clientId) => {
  clients.delete(clientId);
};

const publish = (eventName, payload = {}, filterFn = null) => {
  for (const [clientId, client] of clients.entries()) {
    if (typeof filterFn === 'function' && !filterFn(client.user)) {
      continue;
    }

    try {
      writeEvent(client.res, eventName, payload);
    } catch (err) {
      unsubscribe(clientId);
    }
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  publish,
  writeEvent
};
