import React from 'react';
import './DecoratedBorder.css';

interface DecoratedBorderProps {
  className?: string;
}

const DecoratedBorder: React.FC<DecoratedBorderProps> = ({ className = '' }) => {
  return (
    <div className={`decorated-border ${className}`} style={{position: 'relative', width: '100%', height: 0}}>
      <div className="wave-top" />
      <img src="/icon-truck.png" alt="truck" style={{position: 'absolute', left: 8, top: 8, width: 44, opacity: 0.18, zIndex: 2, pointerEvents: 'none'}} />
      <img src="/icon-gift.png" alt="gift" style={{position: 'absolute', right: 8, top: 8, width: 38, opacity: 0.15, zIndex: 2, pointerEvents: 'none'}} />
      <img src="/icon-star.png" alt="star" style={{position: 'absolute', left: 8, bottom: 8, width: 32, opacity: 0.13, zIndex: 2, pointerEvents: 'none'}} />
      <div className="wave-bottom" />
    </div>
  );
};

export default DecoratedBorder; 