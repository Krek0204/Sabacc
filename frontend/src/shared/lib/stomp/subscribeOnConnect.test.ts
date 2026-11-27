import { describe, expect, test, vi } from 'vitest';
import { Client, IFrame } from '@stomp/stompjs';
import { subscribeOnConnect } from './subscribeOnConnect';

describe('игровые подписки', () => {
  test('создаются и при уже установленном соединении', () => {
    const client = new Client();
    vi.spyOn(client, 'connected', 'get').mockReturnValue(true);
    const listener = vi.fn();
    const stop = subscribeOnConnect(client, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  test('reconnect восстанавливает все экраны, cleanup одного не отключает другие', () => {
    const client = new Client();
    const original = vi.fn();
    client.onConnect = original;
    const state = vi.fn();
    const tokens = vi.fn();
    const results = vi.fn();
    const stopState = subscribeOnConnect(client, state);
    const stopTokens = subscribeOnConnect(client, tokens);
    const stopResults = subscribeOnConnect(client, results);
    client.onConnect({} as IFrame);
    stopTokens();
    client.onConnect({} as IFrame);
    expect(state).toHaveBeenCalledTimes(2);
    expect(tokens).toHaveBeenCalledTimes(1);
    expect(results).toHaveBeenCalledTimes(2);
    stopState();
    stopResults();
    expect(client.onConnect).toBe(original);
    expect(original).toHaveBeenCalledTimes(2);
  });
});
