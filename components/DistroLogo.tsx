import React from 'react';

const stringToHslColor = (str: string, s: number, l: number) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
};

const DistroIcon: React.FC<{ identifier: string; className?: string; title?: string }> = ({ identifier, className, title }) => (
    <div className={className} style={{ color: stringToHslColor(identifier, 70, 50) }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            {title && <title>{title}</title>}
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
    </div>
);

export default DistroIcon;