import { useState, useEffect, useRef, useCallback } from 'react';

export interface Member {
  name: string;
  hasVoted: boolean;
  vote: string | null;
}

export interface PokerState {
  status: 'voting' | 'revealed';
  members: Member[];
}

export interface UsePokerReturn {
  state: PokerState | null;
  connected: boolean;
  join: (roomId: string, name: string) => void;
  vote: (value: string) => void;
  reveal: () => void;
  reset: () => void;
}

export function usePoker(): UsePokerReturn {
  const [state, setState] = useState<PokerState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL as string);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'state') setState({ status: msg.status, members: msg.members });
    };
    ws.onclose = () => {
      setConnected(false);
      timerRef.current = setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    state,
    connected,
    join: useCallback((roomId, name) => send({ action: 'join', roomId, name }), [send]),
    vote: useCallback((value) => send({ action: 'vote', vote: value }), [send]),
    reveal: useCallback(() => send({ action: 'reveal' }), [send]),
    reset: useCallback(() => send({ action: 'reset' }), [send]),
  };
}
