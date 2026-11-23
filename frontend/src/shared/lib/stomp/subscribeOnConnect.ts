import { Client } from '@stomp/stompjs';

type Listener = () => void;
type ConnectionListeners = {
  previous: Client['onConnect'];
  handler: Client['onConnect'];
  listeners: Set<Listener>;
};

const connections = new WeakMap<Client, ConnectionListeners>();

// У STOMP один onConnect. Общий диспетчер сохраняет независимые подписки
// состояния игры, выбора жетонов и результатов при reconnect и unmount.
export function subscribeOnConnect(client: Client, listener: Listener): () => void {
  let connection = connections.get(client);
  if (!connection) {
    const previous = client.onConnect;
    const listeners = new Set<Listener>();
    const handler: Client['onConnect'] = (frame) => {
      previous?.(frame);
      listeners.forEach((callback) => callback());
    };
    connection = { previous, handler, listeners };
    connections.set(client, connection);
    client.onConnect = handler;
  }
  connection.listeners.add(listener);
  if (client.connected) listener();

  return () => {
    connection.listeners.delete(listener);
    if (connection.listeners.size === 0) {
      if (client.onConnect === connection.handler) {
        client.onConnect = connection.previous;
      }
      connections.delete(client);
    }
  };
}
