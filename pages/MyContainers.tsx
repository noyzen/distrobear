import React, { useState, useEffect } from 'react';
import type { Container, Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const isUp = status.toLowerCase().startsWith('up');
  return (
    <div className="flex items-center">
      <span className={`h-3 w-3 rounded-full mr-2 ${isUp ? 'bg-accent' : 'bg-gray-500'} ${isUp ? 'animate-pulse' : ''}`}></span>
      <span className={`${isUp ? 'text-accent-light' : 'text-gray-400'}`}>{status}</span>
    </div>
  );
};

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; disabled: boolean; children: React.ReactNode; primary?: boolean; isStopButton?: boolean }> = ({ onClick, disabled, children, primary = false, isStopButton = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed
      ${primary ? 'bg-accent text-charcoal hover:bg-accent-light' : ''}
      ${isStopButton ? 'bg-primary-light text-gray-300 hover:bg-red-500 hover:text-white' : ''}
      `}
  >
    {children}
  </button>
);


const ContainerCard: React.FC<{ 
  container: Container; 
  index: number; 
  isSelected: boolean;
  onSelect: () => void;
  onActionComplete: () => void;
}> = ({ container, index, isSelected, onSelect, onActionComplete }) => {
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionInProgress(true);
    setActionError(null);
    try {
      await window.electronAPI.containerStop(container.name);
      onActionComplete();
    } catch (err) {
      console.error("Failed to stop container:", err);
      setActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionInProgress(true);
    setActionError(null);
    try {
      await window.electronAPI.containerStart(container.name);
      onActionComplete();
    } catch (err) {
      console.error("Failed to start container:", err);
      setActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsActionInProgress(false);
    }
  };
  
  const isUp = container.status.toLowerCase().startsWith('up');

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`bg-primary rounded-lg shadow-lg overflow-hidden border border-primary-light cursor-pointer transition-all duration-300
        ${isSelected ? 'ring-2 ring-accent shadow-accent/20' : 'hover:border-accent/50'}`}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-100 truncate">{container.name}</h3>
        <p className="text-sm text-gray-400 mt-1 truncate" title={container.image}>{container.image}</p>
      </div>
      <div className="px-5 py-3 bg-primary-dark/50">
        <StatusIndicator status={container.status} />
      </div>
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking the action area
          >
            <div className="p-4 border-t border-primary-light bg-primary-dark/30 flex items-center space-x-3">
              {isUp ? (
                <ActionButton onClick={handleStop} disabled={isActionInProgress} isStopButton>
                  {isActionInProgress ? 'Stopping...' : 'Stop'}
                </ActionButton>
              ) : (
                <ActionButton onClick={handleStart} disabled={isActionInProgress} primary>
                  {isActionInProgress ? 'Starting...' : 'Start'}
                </ActionButton>
              )}
            </div>
            {actionError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-3 border-t border-primary-light bg-red-900/50 text-red-300 text-xs"
              >
                <p className="font-sans font-bold mb-1">Action Failed</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{actionError}</pre>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


const MyContainers: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);

  const fetchContainers = async () => {
    // Don't set loading to true on refresh to avoid UI flicker
    setError(null);
    try {
      const result = await window.electronAPI.listContainers();
      setContainers(result);
    } catch (err) {
      console.error("Error fetching containers:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);
  
  const handleSelectContainer = (name: string) => {
    setSelectedContainer(prev => (prev === name ? null : name));
  };

  const renderContent = () => {
    if (isLoading && containers.length === 0) {
      return <p className="text-center text-gray-400">Loading containers...</p>;
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
          <p className="font-bold">Failed to load containers:</p>
          <p className="mt-2 font-mono text-sm">{error}</p>
        </div>
      );
    }
    if (containers.length === 0) {
      return (
         <div className="text-center py-10">
            <p className="text-gray-400 text-lg">No distrobox containers found.</p>
            <p className="text-gray-500 mt-2">You can create one from the "Create New" menu.</p>
        </div>
      )
    }
    return (
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        layout
      >
        {containers.map((container, index) => (
          <ContainerCard 
            key={container.name} 
            container={container} 
            index={index}
            isSelected={selectedContainer === container.name}
            onSelect={() => handleSelectContainer(container.name)}
            onActionComplete={fetchContainers}
          />
        ))}
      </motion.div>
    );
  };
  
  return (
    <div className="container mx-auto">
      <header className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-100">My Containers</h1>
        <div className="flex items-center gap-4">
          <button
              onClick={() => setCurrentPage('create-new')}
              className="px-5 py-2 bg-primary-light text-gray-200 font-bold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-300"
          >
            Create New
          </button>
          <button
              onClick={fetchContainers}
              disabled={isLoading}
              className="px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>
      {renderContent()}
    </div>
  );
};

export default MyContainers;