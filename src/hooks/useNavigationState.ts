import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'discord_navigation_state';

interface NavigationState {
  activeServerId: string | null;
  channelsByServer: Record<string, string>; // { serverId: channelId }
  activeDMId: string | null;
}

const defaultState: NavigationState = {
  activeServerId: null,
  channelsByServer: {},
  activeDMId: null,
};

export function useNavigationState() {
  const [state, setState] = useState<NavigationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse navigation state:', e);
    }
    return defaultState;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save navigation state:', e);
    }
  }, [state]);

  const setActiveServerId = useCallback((serverId: string | null) => {
    setState(prev => ({ ...prev, activeServerId: serverId }));
  }, []);

  const setActiveDMId = useCallback((dmId: string | null) => {
    setState(prev => ({ ...prev, activeDMId: dmId }));
  }, []);

  const setChannelForServer = useCallback((serverId: string, channelId: string) => {
    setState(prev => ({
      ...prev,
      channelsByServer: { ...prev.channelsByServer, [serverId]: channelId },
    }));
  }, []);

  const getChannelForServer = useCallback((serverId: string): string | null => {
    return state.channelsByServer[serverId] || null;
  }, [state.channelsByServer]);

  return {
    activeServerId: state.activeServerId,
    activeDMId: state.activeDMId,
    setActiveServerId,
    setActiveDMId,
    setChannelForServer,
    getChannelForServer,
  };
}
