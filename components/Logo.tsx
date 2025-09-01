import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 100 100" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-label="DistroBear Logo"
  >
    <g transform="translate(50, 50)">
      {/* Box shape behind */}
      <path 
        d="M -35 -20 L 0 -40 L 35 -20 L 35 20 L 0 40 L -35 20 Z" 
        fill="currentColor" 
        className="text-primary-light"
      />
      
      {/* Bear Head */}
      <g className="text-accent">
        {/* Face */}
        <path 
          d="M -25,15 C -30,-5, 30,-5, 25,15 C 20,30, -20,30, -25,15 Z" 
          fill="currentColor"
        />
        {/* Ears */}
        <circle cx="-20" cy="-12" r="8" fill="currentColor" />
        <circle cx="20" cy="-12" r="8" fill="currentColor" />
        {/* Inner Ears */}
        <circle cx="-20" cy="-12" r="4" fill="black" className="opacity-20" />
        <circle cx="20" cy="-12" r="4" fill="black" className="opacity-20" />
      </g>
      
      {/* Bear Features (on top of head) */}
      <g className="text-charcoal">
        {/* Eyes */}
        <circle cx="-10" cy="0" r="2.5" fill="currentColor" />
        <circle cx="10" cy="0" r="2.5" fill="currentColor" />
        {/* Muzzle */}
        <path 
          d="M -8,12 C -10,5, 10,5, 8,12 C 5,18, -5,18, -8,12 Z" 
          fill="currentColor" 
          className="opacity-20"
        />
        {/* Nose */}
        <path d="M 0,8 L -3,12 L 3,12 Z" fill="currentColor" />
      </g>
    </g>
  </svg>
);

export default Logo;
