import { useEffect, useRef, useState } from 'react';
import { useVoice } from '@/contexts/VoiceContext';
import { cn } from '@/lib/utils';
import { Mic, MicOff, PhoneOff, Maximize2, Headphones, HeadphoneOff } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface VoicePiPProps {
  /** Called when user taps the expand button or the body of the PiP */
  onExpand?: () => void;
}

/**
 * Floating, draggable Picture-in-Picture for the active voice channel.
 * Stays visible while the user navigates other tabs; hidden in the
 * voice channel view itself.
 */
export function VoicePiP({ onExpand }: VoicePiPProps) {
  const {
    isConnected,
    voiceState,
    toggleMute,
    toggleDeafen,
    leaveChannel,
  } = useVoice();

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 16, y: 200 };
    // Initial: bottom-right above bottom nav (56px) + 16px gap
    return {
      x: window.innerWidth - 220,
      y: window.innerHeight - 200,
    };
  });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Snap into bounds on resize/orientation change
  useEffect(() => {
    const onResize = () => {
      setPos((p) => clampPos(p, 200, 72));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  if (!isConnected || !voiceState.channelName) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    setDragging(false);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!dragRef.current) return;
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setDragging(true);
    setPos(clampPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }, 200, 72));
  };
  const onTouchEnd = () => {
    if (!dragging) {
      // Treat as tap → expand
      onExpand?.();
    } else {
      // Snap to nearest horizontal edge
      setPos((p) => {
        const w = window.innerWidth;
        const snappedX = p.x + 100 < w / 2 ? 12 : w - 200 - 12;
        haptics.light();
        return { x: snappedX, y: p.y };
      });
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      role="region"
      aria-label={`Salon vocal actif : ${voiceState.channelName}`}
      className={cn(
        'fixed z-[60] w-[200px] rounded-2xl bg-[hsl(var(--surface-2))] border border-border shadow-xl backdrop-blur-md',
        'select-none touch-none',
        dragging ? 'transition-none' : 'transition-transform',
      )}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        left: 0,
        top: 0,
      }}
    >
      {/* Drag handle / info row */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="px-3 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing"
      >
        <span className="w-2 h-2 rounded-full bg-status-online animate-pulse flex-shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-foreground truncate">
            {voiceState.channelName}
          </div>
          {voiceState.serverName && (
            <div className="text-[10px] text-muted-foreground truncate">
              {voiceState.serverName}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          className="p-1 rounded-md hover:bg-[hsl(var(--surface-3))] text-muted-foreground"
          aria-label="Agrandir"
          title="Agrandir"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Controls */}
      <div className="px-2 pb-2 flex items-center justify-between gap-1">
        <button
          onClick={() => {
            haptics.light();
            toggleMute();
          }}
          aria-label={voiceState.isMuted ? 'Activer le micro' : 'Couper le micro'}
          title={voiceState.isMuted ? 'Activer le micro' : 'Couper le micro'}
          className={cn(
            'flex-1 h-9 rounded-lg flex items-center justify-center transition-colors',
            voiceState.isMuted
              ? 'bg-destructive/20 text-destructive'
              : 'bg-[hsl(var(--surface-3))] text-foreground',
          )}
        >
          {voiceState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            haptics.light();
            toggleDeafen();
          }}
          aria-label={voiceState.isDeafened ? 'Réactiver l\'audio' : 'Couper l\'audio'}
          title={voiceState.isDeafened ? 'Réactiver l\'audio' : 'Couper l\'audio'}
          className={cn(
            'flex-1 h-9 rounded-lg flex items-center justify-center transition-colors',
            voiceState.isDeafened
              ? 'bg-destructive/20 text-destructive'
              : 'bg-[hsl(var(--surface-3))] text-foreground',
          )}
        >
          {voiceState.isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            haptics.medium();
            leaveChannel();
          }}
          aria-label="Raccrocher"
          title="Raccrocher"
          className="flex-1 h-9 rounded-lg flex items-center justify-center bg-destructive text-destructive-foreground"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function clampPos(
  p: { x: number; y: number },
  width = 200,
  height = 72,
): { x: number; y: number } {
  if (typeof window === 'undefined') return p;
  const margin = 8;
  const bottomReserved = 80; // bottom nav + safe area
  const topReserved = 8;
  return {
    x: Math.max(margin, Math.min(window.innerWidth - width - margin, p.x)),
    y: Math.max(topReserved, Math.min(window.innerHeight - height - bottomReserved, p.y)),
  };
}
