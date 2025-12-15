import React from 'react';

/**
 * ThreadSpine - Visual "L-shaped" connector from parent message to thread system message
 * Creates the curved line that visually connects a message to its thread
 */
export function ThreadSpine() {
  return (
    <div className="absolute left-0 top-0 w-[52px] h-full flex items-center">
      {/* Vertical line going down from top to center */}
      <div 
        className="absolute left-5 top-[-4px] w-0.5 bg-muted-foreground/30"
        style={{ height: 'calc(50% + 4px)' }}
      />
      
      {/* Curved corner (L shape) - aligned with vertical center */}
      <div 
        className="absolute left-5 top-1/2 -translate-y-1/2 w-[20px] h-[14px] 
                   border-l-2 border-b-2 border-muted-foreground/30 
                   rounded-bl-lg"
      />
    </div>
  );
}

export default ThreadSpine;
