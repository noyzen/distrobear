import React, { useState, useEffect } from 'react';
import type { Container } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const isUp = status.toLowerCase().startsWith('up');
  return (
    <div className="flex items-center">
      <span className={`h-3 w-3 rounded-full mr-2 ${isUp ? 'bg-accent' : 'bg-gray-500'}`}></span>
      <span className={`${isUp ? 'text-accent-light' : 'text-gray-400'}`}>{status}</span>
    </div>
  );
};

const ContainerCard: React.FC<{ container: Container; index: number }> = ({ container, index }) => {
  return (
    <motion.div
      className="bg-primary rounded-lg shadow-lg overflow-hidden border border-primary-light transform transition-transform duration-300 hover:scale-105 hover:border-accent"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
    >
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-100 truncate">{container.name}</h3>
        <p className="text-sm text-gray-400 mt-1 truncate" title={container.image}>{container.image}</p>
      </div>
      <div className="px-5 py-3 bg-primary-dark/50">
        <StatusIndicator status={container.status} />
      </div>
    </motion.div>
  );
};


const MyContainers: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = async () => {
    setIsLoading(true);
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

  const renderContent = () => {
    if (isLoading) {
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
      <AnimatePresence>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          {containers.map((container, index) => (
            <ContainerCard key={container.name} container={container} index={index} />
          ))}
        </motion.div>
      </AnimatePresence>
    );
  };
  
  return (
    <div className="container mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-100">My Containers</h1>
        <button
            onClick={fetchContainers}
            disabled={isLoading}
            className="px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>
      {renderContent()}
    </div>
  );
};

export default MyContainers;
