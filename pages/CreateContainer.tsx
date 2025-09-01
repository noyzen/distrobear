import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Page, LocalImage, CreateContainerOptions } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';
import ToggleSwitch from '../components/ToggleSwitch';
import ColoredBoxIcon from '../components/DistroLogo';

// --- Helper Components & Icons ---

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.036-2.134H8.716c-1.126 0-2.036.954-2.036 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


const CreationModal: React.FC<{
  isOpen: boolean;
  logs: string[];
  error: string | null;
  success: boolean;
  isCreating: boolean;
  onClose: () => void;
  onFinish: () => void;
}> = ({ isOpen, logs, error, success, isCreating, onClose, onFinish }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const modalRoot = document.getElementById('modal-root');
  if (!isOpen || !modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl w-full max-w-3xl border border-primary flex flex-col"
        style={{ height: '70vh' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <header className="p-4 border-b border-primary flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-100">Creating Container...</h2>
        </header>
        
        <main ref={logContainerRef} className="overflow-y-auto p-4 font-mono text-sm text-gray-300 flex-grow">
          <pre className="whitespace-pre-wrap break-words">{logs.join('')}</pre>
        </main>

        <AnimatePresence>
          {(success || error) && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex-shrink-0"
            >
              {success && (
                <div className="m-4 p-4 bg-accent/20 border border-accent/50 text-accent rounded-lg flex items-center gap-3">
                  <CheckCircleIcon className="w-8 h-8"/>
                  <div>
                    <h3 className="font-bold">Success!</h3>
                    <p>The container was created successfully.</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="m-4 p-4 bg-red-900/50 border border-red-700/50 text-red-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExclamationCircleIcon className="w-8 h-8"/>
                    <h3 className="font-bold">Creation Failed</h3>
                  </div>
                  <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">{error}</pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="p-4 border-t border-primary flex justify-end gap-4 flex-shrink-0">
          {isCreating ? (
            <p className="text-gray-400 text-sm animate-pulse">Creation in progress...</p>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                {success ? 'Create Another' : 'Close'}
              </button>
              {success && (
                <button
                  onClick={onFinish}
                  className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors"
                >
                  Go to My Containers
                </button>
              )}
            </>
          )}
        </footer>
      </motion.div>
    </div>,
    modalRoot
  );
};


// --- Main Page Component ---

const CreateContainer: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  // Image selection state
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<LocalImage | null>(null);

  // Form state
  const [containerName, setContainerName] = useState('');
  const [isIsolated, setIsIsolated] = useState(false);
  const [customHome, setCustomHome] = useState('');
  const [useInit, setUseInit] = useState(false);
  const [useNvidia, setUseNvidia] = useState(false);
  const [volumes, setVolumes] = useState<{ id: number; hostPath: string; containerPath: string }[]>([]);
  const [nextVolumeId, setNextVolumeId] = useState(0);

  // Creation process state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationLogs, setCreationLogs] = useState<string[]>([]);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creationSuccess, setCreationSuccess] = useState(false);
  
  const isFormValid = containerName.trim() && selectedImage;

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.electronAPI.listLocalImages();
        setImages(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
    
    // Setup log listener
    window.electronAPI.onCreationLog((log) => {
        setCreationLogs(prev => [...prev, log]);
    });
    
    // The listener is registered once when the component mounts.
    // The electronAPI should ideally provide a cleanup function to remove the listener
    // to prevent memory leaks if this component were to unmount, but for this app's
    // structure, it is acceptable.
  }, []);

  const resetForm = () => {
    setSelectedImage(null);
    setContainerName('');
    setIsIsolated(false);
    setCustomHome('');
    setUseInit(false);
    setUseNvidia(false);
    setVolumes([]);
    setNextVolumeId(0);
  };

  const handleCreate = async () => {
    if (!isFormValid) return;
    
    setIsModalOpen(true);
    setIsCreating(true);
    setCreationLogs([]);
    setCreationError(null);
    setCreationSuccess(false);

    const options: CreateContainerOptions = {
        name: containerName.trim(),
        image: `${selectedImage!.repository}:${selectedImage!.tag}`,
        init: useInit,
        nvidia: useNvidia,
        isolated: isIsolated,
        customHome: customHome.trim(),
        volumes: volumes.map(({ hostPath, containerPath }) => ({ hostPath, containerPath })).filter(v => v.hostPath && v.containerPath),
    };
    
    try {
        await window.electronAPI.containerCreate(options);
        setCreationSuccess(true);
        resetForm();
    } catch (err) {
        setCreationError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsCreating(false);
    }
  };

  const addVolume = () => {
    setVolumes([...volumes, { id: nextVolumeId, hostPath: '', containerPath: '' }]);
    setNextVolumeId(nextVolumeId + 1);
  };

  const removeVolume = (id: number) => {
    setVolumes(volumes.filter(v => v.id !== id));
  };
  
  const updateVolume = (id: number, field: 'hostPath' | 'containerPath', value: string) => {
    setVolumes(volumes.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const filteredImages = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) return images;
    return images.filter(img => 
      `${img.repository}:${img.tag}`.toLowerCase().includes(lowerCaseQuery)
    );
  }, [images, searchQuery]);

  return (
    <div className="container mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100">Create New Container</h1>
        <p className="text-gray-400 mt-1">Follow the steps below to configure and create your new container.</p>
      </header>

      <div className="space-y-8">
        {/* Step 1: Image Selection */}
        <section className="bg-primary p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-3">
                <span className="bg-accent text-charcoal rounded-full h-8 w-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                Select a Base Image
            </h2>
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                    type="search"
                    placeholder="Search local images..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                {isLoading && <p className="text-center text-gray-400 p-8 animate-pulse">Loading images...</p>}
                {error && <p className="text-center text-red-400 p-8">{error}</p>}
                {!isLoading && !error && filteredImages.length === 0 && (
                    <p className="text-center text-gray-500 p-8">No images found.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <AnimatePresence>
                    {filteredImages.map(img => (
                        <motion.button 
                            layout
                            key={img.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedImage(img)}
                            className={`p-4 text-left rounded-lg border-2 transition-all duration-200 w-full flex items-center gap-3
                                ${selectedImage?.id === img.id ? 'bg-accent/20 border-accent' : 'bg-primary-light border-primary hover:border-gray-600'}
                            `}
                        >
                            <ColoredBoxIcon identifier={img.repository} className="w-10 h-10 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="font-bold text-gray-100 break-all">{img.repository}:{img.tag}</p>
                                <p className="text-xs text-gray-400 mt-1">Size: {img.size} &bull; Created: {img.created}</p>
                            </div>
                        </motion.button>
                    ))}
                    </AnimatePresence>
                </div>
            </div>
        </section>

        {/* Step 2: Configuration */}
        <section className={`bg-primary p-6 rounded-lg shadow-lg transition-opacity duration-500 ${!selectedImage ? 'opacity-50' : 'opacity-100'}`}>
            <h2 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-3">
                <span className="bg-accent text-charcoal rounded-full h-8 w-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                Configuration
            </h2>
            <fieldset disabled={!selectedImage} className="space-y-6">
                <div>
                    <label htmlFor="containerName" className="block text-sm font-medium text-gray-300 mb-1">Container Name</label>
                    <input type="text" id="containerName" value={containerName} onChange={e => setContainerName(e.target.value)} required
                        placeholder="e.g., my-dev-environment"
                        className="w-full px-3 py-2 bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                </div>
            
                <div className="pt-6 border-t border-primary-light">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Advanced Options</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-start">
                                <label className="font-semibold text-gray-200">Isolated Home</label>
                                <ToggleSwitch isOn={isIsolated} onToggle={() => setIsIsolated(!isIsolated)} />
                            </div>
                            <p className="text-sm text-gray-400 mt-1 pr-12">
                                Creates a separate home directory for this container. This is recommended for security as it prevents the container from accessing your personal files.
                            </p>
                            <AnimatePresence>
                            {isIsolated && (
                                <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }} exit={{ opacity: 0, height: 0, marginTop: 0 }}>
                                    <label htmlFor="customHome" className="block text-xs font-medium text-gray-400 mb-1">Custom Home Path (optional)</label>
                                     <input type="text" id="customHome" value={customHome} onChange={e => setCustomHome(e.target.value)}
                                        placeholder="Default: ~/.local/share/distrobox/homes/..."
                                        className="w-full px-3 py-2 text-sm bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>

                        <div>
                             <div className="flex justify-between items-start">
                                <label className="font-semibold text-gray-200">Enable Init (systemd)</label>
                                <ToggleSwitch isOn={useInit} onToggle={() => setUseInit(!useInit)} />
                            </div>
                            <p className="text-sm text-gray-400 mt-1 pr-12">
                                Allows services like <code className="text-xs bg-primary-light p-1 rounded">systemd</code> to run inside the container. Useful for complex applications that need background services.
                            </p>
                        </div>

                        <div>
                            <div className="flex justify-between items-start">
                                <label className="font-semibold text-gray-200">NVIDIA GPU Access</label>
                                <ToggleSwitch isOn={useNvidia} onToggle={() => setUseNvidia(!useNvidia)} />
                            </div>
                            <p className="text-sm text-gray-400 mt-1 pr-12">
                                Provides the container with access to the host's NVIDIA GPU and drivers. Essential for GPU-accelerated tasks like machine learning or gaming.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="font-semibold text-gray-200">Volumes</h4>
                            <p className="text-sm text-gray-400 mt-1 mb-3">Mount additional directories from your host into the container.</p>
                            <div className="space-y-2">
                            <AnimatePresence>
                            {volumes.map(vol => (
                                <motion.div 
                                    layout key={vol.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <input type="text" placeholder="Host Path (~/path/to/dir)" value={vol.hostPath} onChange={e => updateVolume(vol.id, 'hostPath', e.target.value)} className="flex-1 px-3 py-2 text-sm bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"/>
                                    <span className="text-gray-400">:</span>
                                    <input type="text" placeholder="Container Path (/path/in/cont)" value={vol.containerPath} onChange={e => updateVolume(vol.id, 'containerPath', e.target.value)} className="flex-1 px-3 py-2 text-sm bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"/>
                                    <button type="button" onClick={() => removeVolume(vol.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                            </div>
                             <button type="button" onClick={addVolume} className="mt-3 flex items-center gap-2 text-sm px-3 py-2 text-accent font-semibold rounded-lg hover:bg-accent/10 transition-colors">
                                <PlusIcon className="w-4 h-4" /> Add Volume
                            </button>
                        </div>
                    </div>
                </div>
            </fieldset>
        </section>
        
        {/* Step 3: Create */}
        <section className="flex flex-col items-center justify-center p-6">
            {selectedImage && containerName && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-400 mb-4 text-sm">
                    You are about to create <strong className="text-accent">{containerName}</strong> from the image <strong className="text-accent">{selectedImage.repository}:{selectedImage.tag}</strong>.
                </motion.div>
            )}
            <button
                onClick={handleCreate}
                disabled={!isFormValid || isCreating}
                className="px-10 py-3 text-lg bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
            >
                Create Container
            </button>
        </section>
      </div>
      
      <CreationModal
        isOpen={isModalOpen}
        logs={creationLogs}
        error={creationError}
        success={creationSuccess}
        isCreating={isCreating}
        onClose={() => setIsModalOpen(false)}
        onFinish={() => {
            setIsModalOpen(false);
            setCurrentPage('my-containers');
        }}
      />
    </div>
  );
};

export default CreateContainer;
