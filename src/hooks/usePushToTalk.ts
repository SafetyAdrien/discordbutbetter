import { useEffect, useCallback, useRef } from 'react';
import { useVoice } from '@/contexts/VoiceContext';

interface UsePushToTalkOptions {
  key?: string;
  enabled?: boolean;
}

export function usePushToTalk(options: UsePushToTalkOptions = {}) {
  const { key = ' ', enabled = true } = options;
  const { isPushToTalkMode, setPushToTalkActive, isConnected } = useVoice();
  const isKeyDownRef = useRef(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || !isPushToTalkMode || !isConnected) return;
    if (e.key !== key) return;
    if (isKeyDownRef.current) return; // Prevent key repeat
    
    // Don't trigger if user is typing in an input
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    e.preventDefault();
    isKeyDownRef.current = true;
    setPushToTalkActive(true);
  }, [enabled, isPushToTalkMode, isConnected, key, setPushToTalkActive]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!enabled || !isPushToTalkMode || !isConnected) return;
    if (e.key !== key) return;
    
    e.preventDefault();
    isKeyDownRef.current = false;
    setPushToTalkActive(false);
  }, [enabled, isPushToTalkMode, isConnected, key, setPushToTalkActive]);

  // Handle window blur (user switches tab/window)
  const handleBlur = useCallback(() => {
    if (isKeyDownRef.current) {
      isKeyDownRef.current = false;
      setPushToTalkActive(false);
    }
  }, [setPushToTalkActive]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, handleKeyDown, handleKeyUp, handleBlur]);

  return {
    isActive: isKeyDownRef.current,
  };
}
