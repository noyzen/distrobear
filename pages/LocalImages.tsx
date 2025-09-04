import React, { useState, useEffect, useMemo } from 'react';
import type { LocalImage, Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ImageRow from '../components/images/ImageRow';
import SpinnerIcon from '../components/shared/SpinnerIcon';
import { MagnifyingGlassIcon, ArrowPathIcon, ArrowDownTrayIcon, ArrowDownOnSquareIcon } from '../components/Icons';

const listContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const LocalImages: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  const fetchImages = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true); else setIsActionInProgress(true);
    setActionMessage(null);
    try {
      const result = await window.electronAPI.listLocalImages();
      setImages(result);
      if (isRefresh) {
        setActionMessage({ type: 'success', text: 'Image list refreshed.' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error fetching images:", err);
      setError(errorMessage);
      setActionMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
      setIsActionInProgress(false);
    }
  };
  
  const handleImport = async () => {
    setIsActionInProgress(true);
    setActionMessage(null);
    try {
        const result = await window.electronAPI.imageImport();
        if (result.success) {
            setActionMessage({ type: 'success', text: result.message });
            fetchImages(true);
        } else {
             if (result.message && !result.message.includes('canceled')) {
                setActionMessage({ type: 'error', text: result.message });
            }
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setActionMessage({ type: 'error', text: errorMessage });
    } finally {
        setIsActionInProgress(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);
  
  useEffect(() => {
    if (actionMessage) {
        const timer = setTimeout(() => setActionMessage(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [actionMessage]);

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
    if (error && images.length === 0) {
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
            <p className="text-gray-400 text-lg">No Local Images Found</p>
            <p className="text-gray-500 mt-2 mb-4">Download or import an image to get started.</p>
             <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('download-images')}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent-light transition-all duration-200"
            >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Go to Downloads
            </motion.button>
        </div>
      )
    }
    if (filteredImages.length === 0) {
        return (
            <div className="text-center py-10">
               <p className="text-gray-400 text-lg">No images match your search.</p>
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
        <div className="grid grid-cols-12 items-center p-4 font-bold text-sm text-gray-400 border-b border-primary-light gap-4">
          <div className="col-span-12 md:col-span-5">Image</div>
          <div className="col-span-4 md:col-span-2">Size</div>
          <div className="col-span-8 md:col-span-2">Created</div>
          <div className="col-span-12 md:col-span-3 text-right">Actions</div>
        </div>
        <AnimatePresence>
            {filteredImages.map((image) => (
            <ImageRow
                key={image.id}
                image={image}
                onActionStart={() => {
                    setIsActionInProgress(true);
                    setActionMessage(null);
                }}
                onActionComplete={() => {
                    fetchImages(true);
                }}
                onActionError={(err) => {
                    setActionMessage({ type: 'error', text: err });
                }}
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
                    disabled={isActionInProgress}
                    className="flex-1 sm:flex-none px-4 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                   <ArrowDownOnSquareIcon /> Import
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage('download-images')}
                    className="flex-1 sm:flex-none px-4 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                   <ArrowDownTrayIcon /> Download
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchImages(true)}
                    disabled={isActionInProgress}
                    className="flex-1 sm:flex-none px-4 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                    {isActionInProgress ? <SpinnerIcon /> : <ArrowPathIcon />}
                    Refresh
                </motion.button>
            </div>
        </div>
      </header>
      
      <AnimatePresence>
      {actionMessage && (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-3 mb-4 rounded-lg text-sm font-semibold text-center ${
                actionMessage.type === 'success' ? 'bg-accent/20 text-accent' : 'bg-red-900/50 text-red-300'
            }`}
        >
            {actionMessage.text}
        </motion.div>
      )}
      </AnimatePresence>

      {renderContent()}
    </div>
  );
};

export default LocalImages;
