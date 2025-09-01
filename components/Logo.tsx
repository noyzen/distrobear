import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 100 100" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-label="DistroBear Logo"
    fill="none" 
    stroke="currentColor" 
    strokeWidth="4" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Hexagon Box */}
    <path 
      d="M 50,5 L 95,27.5 L 95,72.5 L 50,95 L 5,72.5 L 5,27.5 Z" 
      className="text-primary-light"
    />
    
    {/* Bear Head */}
    <g transform="translate(50, 52)" className="text-accent">
      {/* Ears */}
      <path d="M -18,-18 a 10 10 0 0 1 12 -2" />
      <path d="M 18,-18 a 10 10 0 0 0 -12 -2" />
      
      {/* Head Outline */}
      <path d="M -25,10 C -30,-15, 30,-15, 25,10 C 20,25, -20,25, -25,10 Z" />

      {/* Muzzle */}
      <path d="M 0,5 a 8 8 0 0 1 0 10 a 8 8 0 0 1 0 -10" />

      {/* Nose */}
      <path d="M -4,10 l 4,-4 l 4,4" />
      
      {/* Eyes */}
      <g strokeWidth="3">
         <path d="M -12,-2 L -8,2" />
         <path d="M -8,-2 L -12,2" />
         <path d="M 12,-2 L 8,2" />
         <path d="M 8,-2 L 12,2" />
      </g>
    </g>
  </svg>
);

export default Logo;