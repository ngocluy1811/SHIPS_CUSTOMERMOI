import React from 'react';

interface WaveBorderProps {
  type: 'top' | 'bottom';
  className?: string;
}

const WaveBorder: React.FC<WaveBorderProps> = ({ type, className = '' }) => {
  const path = type === 'top' 
    ? 'M0 12 Q50 24 100 12 T200 12 T300 12 T400 12 T500 12 T600 12 T700 12 T800 12 T900 12 T1000 12 V24 H0Z'
    : 'M0 12 Q50 0 100 12 T200 12 T300 12 T400 12 T500 12 T600 12 T700 12 T800 12 T900 12 T1000 12 V0 H0Z';

  return (
    <div className={className}>
      <svg width="100%" height="24" xmlns="http://www.w3.org/2000/svg">
        <path d={path} fill="#ffe0b2" />
      </svg>
    </div>
  );
};

export default WaveBorder; 