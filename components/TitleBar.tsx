import React, { useState, useEffect } from 'react';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  
  useEffect(() => {
    window.electronAPI.onWindowStateChange((isMaximized) => {
      setIsMaximized(isMaximized);
    });
  }, []);

  const handleMinimize = () => window.electronAPI.minimizeWindow();
  const handleMaximize = () => window.electronAPI.maximizeWindow();
  const handleClose = () => window.electronAPI.closeWindow();

  return (
    <header className="draggable-region flex items-center justify-between h-10 bg-primary-dark pl-4 pr-2 select-none">
      <div className="text-sm font-semibold text-gray-300">Distrobox GUI</div>
      <div className="flex items-center space-x-1 non-draggable-region">
        <button onClick={handleMinimize} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-primary-light">
          <MinimizeIcon />
        </button>
        <button onClick={handleMaximize} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-primary-light">
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-500">
          <CloseIcon />
        </button>
      </div>
    </header>
  );
};

// SVG Icons for Window Controls
const MinimizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 5H10" stroke="#9CA3AF" strokeWidth="1.5"/>
  </svg>
);

const MaximizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="9" height="9" stroke="#9CA3AF"/>
  </svg>
);

const RestoreIcon = () => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0H2C0.9 0 0 0.9 0 2V8H2V2H8V0Z" fill="#9CA3AF"/>
        <path d="M11 3H5C4.4 3 4 3.4 4 4V10C4 10.6 4.4 11 5 11H11C11.6 11 12 10.6 12 10V4C12 3.4 11.6 3 11 3Z" fill="#9CA3AF"/>
    </svg>
);


const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L9 9" stroke="#9CA3AF" strokeWidth="1.5"/>
    <path d="M9 1L1 9" stroke="#9CA3AF" strokeWidth="1.5"/>
  </svg>
);


export default TitleBar;