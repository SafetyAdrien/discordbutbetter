import { motion } from 'framer-motion';

interface UploadDropOverlayProps {
  channelName: string;
}

export function UploadDropOverlay({ channelName }: UploadDropOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[6px] bg-black/35"
    >
      <div className="relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed border-white/60 bg-primary">
        {/* Animated file stack illustration */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="relative w-24 h-20"
        >
          {/* Background file - Code */}
          <div className="absolute left-0 top-2 w-14 h-16 bg-background rounded-lg shadow-lg flex items-center justify-center transform -rotate-12">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M16 18L22 12L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {/* Middle file - Image */}
          <div className="absolute left-5 top-0 w-14 h-16 bg-card rounded-lg shadow-lg flex items-center justify-center z-10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#43b581]">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {/* Front file - Text */}
          <div className="absolute right-0 top-2 w-14 h-16 bg-muted rounded-lg shadow-lg flex items-center justify-center transform rotate-12 z-20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M4 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M4 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </motion.div>

        {/* Text content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-1">
            Upload to #{channelName}
          </h2>
          <p className="text-white/70 text-sm">
            You can add comments before uploading
          </p>
        </div>
      </div>
    </motion.div>
  );
}
