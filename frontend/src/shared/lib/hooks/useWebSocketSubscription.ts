import { Client, Message } from '@stomp/stompjs';
import { useEffect } from 'react';

export const useWebSocketSubscription = (
  client: Client | null,
  destination: string,
  callback: (message: Message) => void
) => {
  useEffect(() => {
    if (!client) return;

    const subscription = client.subscribe(destination, callback);
    return () => subscription.unsubscribe();
  }, [client, destination, callback]);
};
