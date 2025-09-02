import React, { useState, useEffect, useMemo } from 'react';
import type { LocalImage } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ImageRow from '../components/images/ImageRow';
import SpinnerIcon from '../components/shared/SpinnerIcon';
import { MagnifyingGlassIcon, ArrowDownOnSquareIcon, ArrowPathIcon } from '../components/Icons';

// --- Animation Variants ---
const listContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const LocalImages: React.FC = () => {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchImages = async (isRefresh = false) => {
    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    setError(null);
    try {
      const result = await window.electronAPI.listLocalImages();
      setImages(result);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        if (isRefresh) {
            setIsRefreshing(false);
        } else {
            setIsLoading(false);
        }
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);
  
  const handleImport = async () => {
    setIsImporting(true);
    setStatusMessage(null);
    try {
        const result = await window.electronAPI.imageImport();
        if (result.success) {
            setStatusMessage({ type: 'success', message: result.message });
            fetchImages(true); // Refresh list on success
        } else {
            if (result.message && !result.message.includes('canceled')) {
                 setStatusMessage({ type: 'error', message: result.message });
            }
        }
    } catch(err) {
         setStatusMessage({ type: 'error', message: err instanceof Error ? err.message : "An unknown error occurred during import." });
    } finally {
        setIsImporting(false);
    }
  };

  const filteredImages = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) return images;
    return images.filter(img =>
      `${img.repository}:${img.tag}`.toLowerCase().includes(lowerCaseQuery)
    );
  }, [images, searchQuery]);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-gray-400 p-8 animate-pulse">Loading local images...</p>;
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg m-4">
          <p className="font-bold">Failed to load images:</p>
          <p className="mt-2 font-mono text-sm">{error}</p>
        </div>
      );
    }
    if (images.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-lg">No local images found.</p>
          <p className="text-gray-500 mt-2">You can create images from containers on the "My Containers" page or import one.</p>
        </div>
      );
    }
    if (filteredImages.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-lg">No images match your search.</p>
          <p className="text-gray-500 mt-2">Try a different search term.</p>
        </div>
      );
    }

    return (
      <motion.div 
        className="bg-primary rounded-lg shadow-md"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Row */}
         <div className="grid grid-cols-12 items-center p-4 border-b-2 border-primary-light gap-4 text-sm font-bold text-gray-400">
             <div className="col-span-12 md:col-span-5">Image Name</div>
             <div className="hidden md:block col-span-2">Size</div>
             <div className="hidden md:block col-span-2">Created</div>
             <div className="hidden md:block col-span-3 text-right">Actions</div>
         </div>
        <AnimatePresence>
          {filteredImages.map((img) => (
            <ImageRow
              key={img.id}
              image={img}
              onActionStart={() => setStatusMessage(null)}
              onActionComplete={() => fetchImages(true)}
              onActionError={(err) => setStatusMessage({ type: 'error', message: err })}
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
          Local Images <span className="text-lg text-gray-400 font-normal">({images.length})</span>
        </h1>
        <div className="flex-grow flex flex-col-reverse sm:flex-row justify-end items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary-light rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
           <div className="flex gap-4 w-full sm:w-auto">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImport}
                disabled={isLoading || isRefreshing || isImporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isImporting ? <SpinnerIcon /> : <ArrowDownOnSquareIcon />}
                Import
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchImages(true)}
                disabled={isLoading || isRefreshing}
                className="flex-1 sm:flex-none px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
                {isRefreshing ? <SpinnerIcon /> : <ArrowPathIcon />}
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </motion.button>
          </div>
        </div>
      </header>
        
    {statusMessage && (
        <div className={`p-4 rounded-lg mb-6 text-sm border ${statusMessage.type === 'success' ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-red-900/50 border-red-700/50 text-red-300'}`}>
            <pre className="whitespace-pre-wrap font-mono">{statusMessage.message}</pre>
        </div>
    )}

      {renderContent()}
    </div>
  );
};

export default LocalImages;
