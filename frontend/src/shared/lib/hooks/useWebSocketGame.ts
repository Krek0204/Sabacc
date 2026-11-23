import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const useWebSocketGame = (playerId: number | undefined, sessionId: number | undefined) => {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (playerId == null || sessionId == null) return;

    const socketUrl = `/game?playerId=${playerId}&sessionId=${sessionId}`;
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 2000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onStompError: (frame) => console.error('Ошибка игрового соединения:', frame.headers.message),
    });

    setClient(stompClient);
    stompClient.activate();
    const onPageHide = () => { void stompClient.deactivate({ force: true }); };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) stompClient.activate();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      void stompClient.deactivate();
    };
  }, [playerId, sessionId]);

  return client;
};
