import React, { useState, useEffect, useMemo } from 'react';
import type { Container, Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ContainerRow from '../components/containers/ContainerRow';
import SpinnerIcon from '../components/shared/SpinnerIcon';
import { MagnifyingGlassIcon, ArrowPathIcon } from '../components/Icons';

const listContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const MyContainers: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContainers = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
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
  
  const filteredContainers = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) return containers;
    return containers.filter(c => 
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.image.toLowerCase().includes(lowerCaseQuery)
    );
  }, [containers, searchQuery]);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-gray-400 p-8">Loading containers...</p>;
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg m-4">
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
    if (filteredContainers.length === 0) {
        return (
            <div className="text-center py-10">
               <p className="text-gray-400 text-lg">No containers match your search.</p>
               <p className="text-gray-500 mt-2">Try a different search term or clear the search.</p>
           </div>
         )
    }

    return (
      <motion.div 
        className="bg-primary rounded-lg shadow-md" 
        layout
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence initial={false}>
            {filteredContainers.map((container, index) => (
            <ContainerRow
                key={container.name}
                container={container}
                isSelected={selectedContainer === container.name}
                onSelect={() => handleSelectContainer(container.name)}
                onActionComplete={() => fetchContainers(true)}
                isLast={index === filteredContainers.length - 1}
            />
            ))}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  return (
    <div className="container mx-auto">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-100 w-full md:w-auto">
          My Containers <span className="text-lg text-gray-400 font-normal">({containers.length})</span>
        </h1>
        
        <div className="flex-grow flex flex-col-reverse sm:flex-row justify-end items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                    type="search"
                    placeholder="Search containers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary-light rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                 <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage('create-new')}
                    className="flex-1 sm:flex-none px-5 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-white transition-all duration-200"
                >
                    Create
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchContainers(true)}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none px-5 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                    {isLoading ? <SpinnerIcon /> : <ArrowPathIcon />}
                    {isLoading ? '...' : 'Refresh'}
                </motion.button>
            </div>
        </div>
      </header>
      {renderContent()}
    </div>
  );
};

export default MyContainers;