import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface AudioLevelIndicatorProps {
  level: number;         // 0 to 1
  isSpeaking: boolean;
  className?: string;
  variant?: 'bar' | 'ring' | 'dots';
  showWhenSilent?: boolean;
}

/**
 * Real-time audio level indicator component
 * Displays animated bars/rings that react to audio input
 */
export function AudioLevelIndicator({ 
  level, 
  isSpeaking, 
  className,
  variant = 'bar',
  showWhenSilent = false,
}: AudioLevelIndicatorProps) {
  const [smoothedLevel, setSmoothedLevel] = useState(0);
  const prevLevelRef = useRef(0);
  const animationRef = useRef<number>();

  // Smooth the level changes for visual appeal
  useEffect(() => {
    const smoothingFactor = 0.3; // Higher = more responsive, lower = smoother
    
    const animate = () => {
      setSmoothedLevel(prev => {
        const target = level;
        const newLevel = prev + (target - prev) * smoothingFactor;
        prevLevelRef.current = newLevel;
        return newLevel;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level]);

  // Don't render if silent and showWhenSilent is false
  if (!showWhenSilent && !isSpeaking && smoothedLevel < 0.01) {
    return null;
  }

  if (variant === 'ring') {
    return (
      <div 
        className={cn(
          'absolute inset-0 rounded-full pointer-events-none transition-opacity duration-150',
          isSpeaking ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          boxShadow: isSpeaking 
            ? `0 0 0 ${2 + smoothedLevel * 4}px hsl(var(--online) / ${0.4 + smoothedLevel * 0.4})`
            : 'none',
        }}
      />
    );
  }

  if (variant === 'dots') {
    const dotCount = 5;
    const activeDots = Math.ceil(smoothedLevel * dotCount);
    
    return (
      <div className={cn('flex gap-0.5 items-end h-4', className)}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const isActive = i < activeDots;
          const dotLevel = Math.max(0, Math.min(1, (smoothedLevel * dotCount) - i));
          
          return (
            <div
              key={i}
              className={cn(
                'w-1 rounded-full transition-all duration-75',
                isActive ? 'bg-[hsl(var(--online))]' : 'bg-muted-foreground/30'
              )}
              style={{
                height: `${25 + (isActive ? dotLevel * 75 : 0)}%`,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Default: bar variant
  const barCount = 5;
  const barHeights = [0.4, 0.7, 1, 0.7, 0.4]; // Center is tallest

  return (
    <div className={cn('flex gap-0.5 items-center h-4', className)}>
      {Array.from({ length: barCount }).map((_, i) => {
        const baseHeight = barHeights[i];
        const scaledLevel = smoothedLevel * baseHeight;
        const minHeight = 0.15;
        const height = Math.max(minHeight, scaledLevel);
        
        return (
          <div
            key={i}
            className={cn(
              'w-0.5 rounded-full transition-all duration-75',
              isSpeaking ? 'bg-[hsl(var(--online))]' : 'bg-muted-foreground/40'
            )}
            style={{
              height: `${height * 100}%`,
              transform: isSpeaking ? `scaleY(${1 + smoothedLevel * 0.3})` : 'scaleY(1)',
            }}
          />
        );
      })}
    </div>
  );
}

interface VoiceLevelMeterProps {
  level: number;
  className?: string;
}

/**
 * Horizontal level meter for settings/debug display
 */
export function VoiceLevelMeter({ level, className }: VoiceLevelMeterProps) {
  const [peak, setPeak] = useState(0);
  const peakDecayRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (level > peak) {
      setPeak(level);
      
      // Clear existing timer
      if (peakDecayRef.current) {
        clearTimeout(peakDecayRef.current);
      }
      
      // Decay peak after 1 second
      peakDecayRef.current = setTimeout(() => {
        setPeak(0);
      }, 1000);
    }
    
    return () => {
      if (peakDecayRef.current) {
        clearTimeout(peakDecayRef.current);
      }
    };
  }, [level, peak]);

  // Color based on level
  const getColor = (l: number) => {
    if (l > 0.8) return 'bg-destructive';
    if (l > 0.6) return 'bg-yellow-500';
    return 'bg-[hsl(var(--online))]';
  };

  return (
    <div className={cn('relative h-2 bg-muted rounded-full overflow-hidden', className)}>
      {/* Current level */}
      <div 
        className={cn('h-full transition-all duration-75 rounded-full', getColor(level))}
        style={{ width: `${level * 100}%` }}
      />
      
      {/* Peak indicator */}
      {peak > 0 && (
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 transition-all duration-75"
          style={{ left: `${peak * 100}%` }}
        />
      )}
    </div>
  );
}
