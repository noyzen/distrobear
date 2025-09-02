import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        className={className}
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg" 
        aria-label="DistroBear Logo"
        fill="currentColor"
    >
        {/* A friendly, box-like bear icon */}
        <path 
            className="text-primary-light"
            d="M19,3H5C3.895,3,3,3.895,3,5v14c0,1.105,0.895,2,2,2h14c1.105,0,2-0.895,2-2V5C21,3.895,20.105,3,19,3z M7.5,8 C8.328,8,9,7.328,9,6.5S8.328,5,7.5,5S6,5.672,6,6.5S6.672,8,7.5,8z M16.5,8c0.828,0,1.5-0.672,1.5-1.5S17.328,5,16.5,5 S15,5.672,15,6.5S15.672,8,16.5,8z M12,18c-3.309,0-6-2.691-6-6s2.691-6,6-6s6,2.691,6,6S15.309,18,12,18z"
        />
        <path
            className="text-accent"
            d="M12,8c-2.206,0-4,1.794-4,4s1.794,4,4,4s4-1.794,4-4S14.206,8,12,8z"
        />
    </svg>
);

export default Logo;
