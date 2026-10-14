import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@stomp/stompjs';
import { useGameState } from './useGameState';

const mocks = vi.hoisted(() => ({
  user: undefined as { id: number } | undefined,
  client: null as Client | null,
  setupRoom: vi.fn(),
  effects: [] as Array<() => void | (() => void)>,
  get: vi.fn().mockResolvedValue({ data: {} }),
}));

// Проверяем порядок хуков и жизненный цикл подписок без браузерного DOM.
vi.mock('react', () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => mocks.effects.push(effect),
}));
vi.mock('react-redux', () => ({ useSelector: () => mocks.user }));
vi.mock('@/shared/lib/hooks/useSetupRoom', () => ({ useSetupRoom: mocks.setupRoom }));
vi.mock('@/shared/lib/hooks/useWebSocketGame', () => ({ useWebSocketGame: () => mocks.client }));
vi.mock('axios', () => ({ default: { get: mocks.get, isAxiosError: () => false } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.effects.length = 0;
  mocks.user = undefined;
  mocks.client = null;
  mocks.setupRoom.mockReturnValue(undefined);
});

describe('useGameState', () => {
  it('вызывает useSetupRoom до и после появления пользователя', () => {
    useGameState();
    expect(mocks.setupRoom).toHaveBeenLastCalledWith(undefined);
    mocks.user = { id: 7 };
    useGameState();
    expect(mocks.setupRoom).toHaveBeenLastCalledWith(7);
    expect(mocks.setupRoom).toHaveBeenCalledTimes(2);
  });

  it('очищает подписки подключённого клиента при reconnect и cleanup', () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn().mockReturnValue({ unsubscribe });
    const previousOnConnect = vi.fn();
    const client = new Client();
    Object.defineProperty(client, 'connected', { value: true });
    client.subscribe = subscribe;
    client.onConnect = previousOnConnect;
    mocks.client = client;
    mocks.user = { id: 7 };
    mocks.setupRoom.mockReturnValue(42);

    useGameState();
    const cleanup = mocks.effects[3]();
    expect(subscribe).toHaveBeenCalledTimes(5);
    expect(subscribe.mock.calls.map(call => call[0])).toEqual([
      '/queue/session/42/game-progress',
      '/queue/session/42/accepted-turns',
      '/queue/session/42/game-results',
      '/queue/session/42/round-results',
      '/queue/session/42/errors',
    ]);
    client.onConnect({ command: 'CONNECTED', headers: {}, body: '', binaryBody: new Uint8Array(), isBinaryBody: false });
    expect(unsubscribe).toHaveBeenCalledTimes(5);
    expect(subscribe).toHaveBeenCalledTimes(10);
    if (typeof cleanup !== 'function') throw new Error('Отсутствует cleanup подписок');
    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(10);
    expect(client.onConnect).toBe(previousOnConnect);
  });
});
