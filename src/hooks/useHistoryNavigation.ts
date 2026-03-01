import { useEffect, useRef, useCallback } from 'react';

export interface HistoryViewState {
  serverId: string | null;
  channelId: string | null;
  dmId: string | null;
  threadId: string | null;
  // Mobile-specific
  mobileView?: string; // 'tab' | 'channels' | 'chat' | 'thread'
  mobileTab?: string;
  mobileServerId?: string;
  mobileChannelId?: string;
  mobileChannelType?: string;
  mobileThreadId?: string;
  mobileChannelName?: string;
  mobileFromTab?: boolean;
}

const HISTORY_KEY = '__app_nav';

export function useHistoryNavigation(onPop: (state: HistoryViewState) => void) {
  const isPopping = useRef(false);
  const onPopRef = useRef(onPop);
  onPopRef.current = onPop;

  // Listen for popstate (browser back/forward)
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const state = e.state as HistoryViewState | null;
      if (state && state.serverId !== undefined) {
        isPopping.current = true;
        onPopRef.current(state);
        // Reset after a tick so subsequent pushes work
        requestAnimationFrame(() => { isPopping.current = false; });
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const pushView = useCallback((viewState: HistoryViewState) => {
    // Don't push when we're handling a pop (back button)
    if (isPopping.current) return;
    history.pushState({ ...viewState, [HISTORY_KEY]: true }, '');
  }, []);

  const replaceView = useCallback((viewState: HistoryViewState) => {
    history.replaceState({ ...viewState, [HISTORY_KEY]: true }, '');
  }, []);

  return { pushView, replaceView, isPopping };
}
