import React from 'react';

interface StreamlineThreadBranchProps {
  className?: string;
  size?: number;
}

const StreamlineThreadBranch: React.FC<StreamlineThreadBranchProps> = ({ className, size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 16"
      width={size * 0.75}
      height={size}
      className={className}
    >
      <path 
        d="M2 0 L2 8 Q2 10 4 10 L10 10" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default StreamlineThreadBranch;
