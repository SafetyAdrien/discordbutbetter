import React from 'react';

interface StreamlineThreadBranchProps {
  className?: string;
  size?: number;
}

const StreamlineThreadBranch: React.FC<StreamlineThreadBranchProps> = ({ className, size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 20"
      width={size * 0.5}
      height={size}
      className={className}
      fill="currentColor"
    >
      {/* Branch path */}
      <path d="M0 13H2c0 1.6569 1.3432 3 3 3v2c-2.7614 0-5-2.2386-5-7ZM0 2H2V13H0V2ZM2 2H0C0 1.4477.4477 1 1 1c.5523 0 1 .4477 1 1Z" />
      {/* End connector */}
      <path d="M6 18V16H9v2H6Zm3 0V16s1 0 1 1-1 1-.989 1.004ZM6 16v2H5V16H6Z" />
    </svg>
  );
};

export default StreamlineThreadBranch;
