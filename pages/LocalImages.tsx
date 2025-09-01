import React, { useState, useEffect, useMemo } from 'react';
import type { LocalImage } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// --- Local Components for LocalImages Page ---

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl p-6 w-full max-w-md border border-primary"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
        <p className="text-gray-400 mt-4">{message}</p>
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ImageRow: React.FC<{
  image: LocalImage;
  onActionComplete: () => void;
  onActionStart: () => void;
  onActionError: (error: string) => void;
}> = ({ image, onActionComplete, onActionStart, onActionError }) => {
  const [isProcessing, setIsProcessing] = useState< 'delete' | 'export' | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const imageIdentifier = `${image.repository}:${image.tag}`;

  const handleDelete = async () => {
    setIsProcessing('delete');
    onActionStart();
    try {
      await window.electronAPI.imageDelete(imageIdentifier);
      onActionComplete();
    } catch (err) {
      onActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleExport = async () => {
    setIsProcessing('export');
    onActionStart();
    try {
        const result = await window.electronAPI.imageExport(imageIdentifier);
        if (result.success) {
            onActionComplete(); // Refresh is handled by parent, we just signal completion.
        } else {
            // User cancellation is not an error, so we don't show an error message.
            if (result.message && !result.message.includes('canceled')) {
                onActionError(result.message);
            }
        }
    } catch (err) {
        onActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsProcessing(null);
    }
  };


  return (
    <>
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-12 items-center p-4 border-b border-primary-light transition-colors duration-200 hover:bg-primary-light/50 gap-4"
      >
        <div className="col-span-12 md:col-span-5 min-w-0">
          <p className="font-bold text-gray-100 truncate" title={imageIdentifier}>{image.repository}:{image.tag}</p>
          <p className="text-xs text-gray-400 mt-1 truncate" title={image.id}>ID: {image.id.substring(0, 12)}</p>
        </div>
        <div className="col-span-4 md:col-span-2 text-sm text-gray-300">{image.size}</div>
        <div className="col-span-8 md:col-span-2 text-sm text-gray-400">{image.created}</div>
        <div className="col-span-12 md:col-span-3 flex justify-end gap-2">
            <button 
                onClick={handleExport}
                disabled={!!isProcessing}
                className="p-2 text-gray-300 rounded-md hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Export image to .tar">
                {isProcessing === 'export' ? <SpinnerIcon className="w-5 h-5"/> : <ArrowUpOnSquareIcon />}
            </button>
             <button 
                onClick={() => setDeleteModalOpen(true)}
                disabled={!!isProcessing}
                className="p-2 text-gray-300 rounded-md hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Delete image">
                {isProcessing === 'delete' ? <SpinnerIcon className="w-5 h-5"/> : <TrashIcon />}
            </button>
        </div>
      </motion.div>
       <AnimatePresence>
        {isDeleteModalOpen && (
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title={`Delete Image?`}
                message={`Are you sure you want to permanently delete "${imageIdentifier}"? This cannot be undone.`}
            />
        )}
      </AnimatePresence>
    </>
  );
};


// --- Main Page Component ---

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
      <div className="bg-primary rounded-lg shadow-md">
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
      </div>
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
              <SearchIcon className="w-5 h-5 text-gray-400" />
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
            <button
                onClick={handleImport}
                disabled={isLoading || isRefreshing || isImporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isImporting ? <SpinnerIcon/> : <ArrowDownOnSquareIcon />}
                Import
            </button>
            <button
                onClick={() => fetchImages(true)}
                disabled={isLoading || isRefreshing}
                className="flex-1 sm:flex-none px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
                {isRefreshing && <SpinnerIcon />}
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
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

// --- SVG Icons ---
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
const SpinnerIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={`animate-spin text-current ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const ArrowUpOnSquareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);
const ArrowDownOnSquareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);
const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.036-2.134H8.716c-1.126 0-2.036.954-2.036 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

export default LocalImages;