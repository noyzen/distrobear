import React, { useState, useEffect } from 'react';
import Logo from './Logo';

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
    <header className="draggable-region flex items-center justify-between h-10 bg-primary-dark pl-2 pr-2 select-none">
      <div className="flex items-center space-x-2">
        <Logo className="w-5 h-5" />
        <div className="text-sm font-semibold text-gray-300">DistroBear</div>
      </div>
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
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
);

const MaximizeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25h13.5v13.5H5.25V5.25z" />
    </svg>
);

const RestoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default TitleBar;