import React from 'react';
import Logo from './Logo';
import { MinimizeIcon, RestoreIcon, MaximizeIcon, CloseIcon } from './Icons';

interface TitleBarProps {
  isMaximized: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ isMaximized }) => {
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

export default TitleBar;