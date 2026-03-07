import React from 'react';

/**
 * ThreadSpine - Visual "L-shaped" connector from parent message to thread system message
 * Creates the curved line that visually connects a message to its thread
 */
export function ThreadSpine() {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-[52px]">
      {/* Vertical line going down */}
      <div 
        className="absolute left-5 top-0 border-l-2 border-muted-foreground/30"
        style={{ height: 'calc(100% - 10px)' }}
      />
      
      {/* Curved corner (L shape with rounded bottom-left) */}
      <div 
        className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[10px] 
                   border-l-2 border-b-2 border-muted-foreground/30 
                   rounded-bl-lg"
      />
    </div>
  );
}

export default ThreadSpine;
