import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'discord_navigation_state';

interface NavigationState {
  activeServerId: string | null;
  channelsByServer: Record<string, string>; // { serverId: channelId }
  activeDMId: string | null;
  // Desktop persistence
  activeChannelId: string | null;
  activeThreadId: string | null;
  threadChannelId: string | null;
  // Mobile persistence
  mobileActiveTab: string | null; // 'home' | 'servers' | 'notifications' | 'profile'
  mobileView: {
    type: string;
    serverId?: string;
    channelId?: string;
    channelType?: string;
    threadId?: string;
    channelName?: string;
    fromTab?: boolean;
  } | null;
}

const defaultState: NavigationState = {
  activeServerId: null,
  channelsByServer: {},
  activeDMId: null,
  activeChannelId: null,
  activeThreadId: null,
  threadChannelId: null,
  mobileActiveTab: null,
  mobileView: null,
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

  const setActiveChannelId = useCallback((channelId: string | null) => {
    setState(prev => ({ ...prev, activeChannelId: channelId }));
    // Track recent channels for preloader cache optimization
    if (channelId) {
      try {
        const raw = sessionStorage.getItem('cache:recent-channels');
        const recent: string[] = raw ? JSON.parse(raw) : [];
        const updated = [channelId, ...recent.filter(id => id !== channelId)].slice(0, 30);
        sessionStorage.setItem('cache:recent-channels', JSON.stringify(updated));
      } catch {}
    }
  }, []);

  const setActiveThreadId = useCallback((threadId: string | null) => {
    setState(prev => ({ ...prev, activeThreadId: threadId }));
  }, []);

  const setThreadChannelId = useCallback((channelId: string | null) => {
    setState(prev => ({ ...prev, threadChannelId: channelId }));
  }, []);

  const setMobileActiveTab = useCallback((tab: string | null) => {
    setState(prev => ({ ...prev, mobileActiveTab: tab }));
  }, []);

  const setMobileView = useCallback((view: NavigationState['mobileView']) => {
    setState(prev => ({ ...prev, mobileView: view }));
  }, []);

  return {
    activeServerId: state.activeServerId,
    activeDMId: state.activeDMId,
    activeChannelId: state.activeChannelId,
    activeThreadId: state.activeThreadId,
    threadChannelId: state.threadChannelId,
    mobileActiveTab: state.mobileActiveTab,
    mobileView: state.mobileView,
    channelsByServer: state.channelsByServer,
    setActiveServerId,
    setActiveDMId,
    setChannelForServer,
    getChannelForServer,
    setActiveChannelId,
    setActiveThreadId,
    setThreadChannelId,
    setMobileActiveTab,
    setMobileView,
  };
}
