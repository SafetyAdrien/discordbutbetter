import { useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { cn } from '@/lib/utils';

export type MobilePanel = 'left' | 'center' | 'right';

interface MobileSwipeContainerProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  showRightPanel?: boolean;
  activePanel?: MobilePanel;
  onPanelChange?: (panel: MobilePanel) => void;
}

export function MobileSwipeContainer({
  leftPanel,
  centerPanel,
  rightPanel,
  showRightPanel = true,
  activePanel: controlledPanel,
  onPanelChange,
}: MobileSwipeContainerProps) {
  const [internalPanel, setInternalPanel] = useState<MobilePanel>('center');
  
  const activePanel = controlledPanel ?? internalPanel;
  const setActivePanel = useCallback((panel: MobilePanel) => {
    if (onPanelChange) {
      onPanelChange(panel);
    } else {
      setInternalPanel(panel);
    }
  }, [onPanelChange]);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (activePanel === 'left') setActivePanel('center');
      else if (activePanel === 'center' && showRightPanel) setActivePanel('right');
    },
    onSwipedRight: () => {
      if (activePanel === 'right') setActivePanel('center');
      else if (activePanel === 'center') setActivePanel('left');
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 50,
    swipeDuration: 500,
  });

  const getTranslateClass = () => {
    switch (activePanel) {
      case 'left':
        return 'translate-x-0';
      case 'center':
        return '-translate-x-1/3';
      case 'right':
        return '-translate-x-2/3';
      default:
        return '-translate-x-1/3';
    }
  };

  const panels = showRightPanel 
    ? ['left', 'center', 'right'] as const
    : ['left', 'center'] as const;

  return (
    <div {...handlers} className="relative w-full h-full overflow-hidden">
      {/* Container des panneaux */}
      <div 
        className={cn(
          "flex h-full transition-transform duration-300 ease-out",
          showRightPanel ? "w-[300%]" : "w-[200%]",
          getTranslateClass()
        )}
      >
        {/* Panneau gauche - Serveurs/Salons */}
        <div className={cn(
          "h-full flex-shrink-0 overflow-hidden",
          showRightPanel ? "w-1/3" : "w-1/2"
        )}>
          {leftPanel}
        </div>
        
        {/* Panneau central - Chat */}
        <div className={cn(
          "h-full flex-shrink-0 overflow-hidden",
          showRightPanel ? "w-1/3" : "w-1/2"
        )}>
          {centerPanel}
        </div>
        
        {/* Panneau droit - Membres */}
        {showRightPanel && (
          <div className="w-1/3 h-full flex-shrink-0 overflow-hidden">
            {rightPanel}
          </div>
        )}
      </div>

      {/* Indicateurs de navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {panels.map((panel) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              activePanel === panel 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Aller au panneau ${panel}`}
          />
        ))}
      </div>
    </div>
  );
}
