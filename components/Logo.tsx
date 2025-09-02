import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 100 100" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-label="DistroBear Logo"
  >
    {/* Hexagon Outline */}
    <path 
      d="M 50,5 L 95,27.5 L 95,72.5 L 50,95 L 5,72.5 L 5,27.5 Z" 
      stroke="currentColor" 
      className="text-primary-light"
      fill="none" 
      strokeWidth="5" 
    />
    
    {/* Stacked containers inside */}
    <g 
      className="text-accent" 
      stroke="currentColor" 
      fill="none" 
      strokeWidth="5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="25" y="60" width="50" height="15" rx="2"/>
      <rect x="25" y="42" width="50" height="15" rx="2"/>
      <rect x="25" y="24" width="50" height="15" rx="2"/>
    </g>
  </svg>
);

export default Logo;