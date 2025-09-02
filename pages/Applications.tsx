import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ExportableApplication, ApplicationList, Container } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ToggleSwitch from '../components/ToggleSwitch';

const listContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const listItemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

const ApplicationRow: React.FC<{
  app: ExportableApplication;
  onActionComplete: () => void;
}> = ({ app, onActionComplete }) => {
  const [processingAction, setProcessingAction] = useState<'share' | 'unshare' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setProcessingAction('share');
    setError(null);
    try {
      await window.electronAPI.applicationExport({ containerName: app.containerName, appName: app.appName });
      onActionComplete();
    } catch (err) {
      console.error(`Failed to share ${app.name}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while sharing.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUnshare = async () => {
    setProcessingAction('unshare');
    setError(null);
    try {
      await window.electronAPI.applicationUnexport({ containerName: app.containerName, appName: app.appName });
      onActionComplete();
    } catch (err) {
      console.error(`Failed to unshare ${app.name}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while unsharing.");
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <motion.div
      layout="position"
      variants={listItemVariants}
      className="flex items-center p-4 border-b border-primary-light transition-colors duration-200 hover:bg-primary-light/50"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-md font-bold text-gray-100 truncate">{app.name}</h3>
        <p className="text-xs text-gray-400 mt-1 truncate" title={app.containerName}>
          in <span className="font-semibold">{app.containerName}</span>
        </p>
         {error && (
            <div className="mt-2 p-2 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        )}
      </div>
      <div className="flex-shrink-0 ml-4">
        {app.isExported ? (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUnshare}
                disabled={!!processingAction}
                className="w-36 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                title={`Remove ${app.name} from the host.`}
            >
            {processingAction === 'unshare' ? <SpinnerIcon /> : <><TrashIcon /> Remove</>}
            </motion.button>
        ) : (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                disabled={!!processingAction}
                className="w-36 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-accent text-charcoal hover:bg-accent-light disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                title={`Share ${app.name} with the host.`}
            >
            {processingAction === 'share' ? <SpinnerIcon /> : <><ArrowUpOnSquareIcon /> Share to Host</>}
            </motion.button>
        )}
      </div>
    </motion.div>
  );
};

const StartContainersModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  containersToStart: string[];
}> = ({ isOpen, onClose, onConfirm, containersToStart }) => {
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsStarting(true);
        setError(null);
        try {
            await onConfirm();
            // Parent handles closing on success
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsStarting(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setIsStarting(false);
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl p-6 w-full max-w-lg border border-primary"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-2xl font-bold text-gray-100">Start Containers?</h2>
        <p className="text-gray-400 mt-4">The following containers must be running to be scanned for applications:</p>
        <ul className="list-disc list-inside bg-primary rounded-md p-3 my-4 text-gray-300 space-y-1">
            {containersToStart.map(name => <li key={name}>{name}</li>)}
        </ul>

        {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Failed to start containers</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        )}
        
        <div className="flex justify-end gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            disabled={isStarting}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            disabled={isStarting}
            className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isStarting ? <SpinnerIcon /> : <PlayIcon />}
            {isStarting ? 'Starting...' : 'Start & Scan'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
};


const Applications: React.FC = () => {
  const [applications, setApplications] = useState<ExportableApplication[]>([]);
  const [unscannedContainers, setUnscannedContainers] = useState<string[]>([]);
  const [allContainers, setAllContainers] = useState<Container[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyShared, setShowOnlyShared] = useState(false);
  const [selectedContainerFilters, setSelectedContainerFilters] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);

  // Start container modal state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [containersToStart, setContainersToStart] = useState<string[]>([]);
  
  const fetchAllData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true); else setIsLoading(true);
    setError(null);
    try {
      const [appList, allConts] = await Promise.all([
        window.electronAPI.listApplications(),
        window.electronAPI.listContainers(),
      ]);
      setApplications(appList.applications);
      setUnscannedContainers(appList.unscannedContainers);
      setAllContainers(allConts);
    } catch (err) {
      console.error("Error fetching application data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      if (isRefresh) setIsRefreshing(false); else setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node) &&
          filterButtonRef.current && !filterButtonRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleContainerFilterChange = (containerName: string, isChecked: boolean) => {
      const isRunning = !unscannedContainers.includes(containerName);

      if (isChecked && !isRunning) {
          // Add to a temporary list and show modal
          setContainersToStart(prev => [...new Set([...prev, containerName])]);
          setIsStartModalOpen(true);
          return; // Don't add to filter set until it's started
      }

      const newSet = new Set(selectedContainerFilters);
      if (isChecked) {
          newSet.add(containerName);
      } else {
          newSet.delete(containerName);
      }
      setSelectedContainerFilters(newSet);
  };
  
  const handleConfirmStartContainers = async () => {
      await Promise.all(containersToStart.map(name => window.electronAPI.containerStart(name)));
      
      const newSet = new Set(selectedContainerFilters);
      containersToStart.forEach(name => newSet.add(name));
      setSelectedContainerFilters(newSet);

      setContainersToStart([]);
      setIsStartModalOpen(false);
      await fetchAllData(true);
  };

  const filteredApplications = useMemo(() => {
    return applications
      .filter(app => {
        if (showOnlyShared && !app.isExported) return false;
        if (selectedContainerFilters.size > 0 && !selectedContainerFilters.has(app.containerName)) return false;
        
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (!lowerCaseQuery) return true;
        return app.name.toLowerCase().includes(lowerCaseQuery) || app.containerName.toLowerCase().includes(lowerCaseQuery);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [applications, searchQuery, showOnlyShared, selectedContainerFilters]);


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-16 text-gray-400">
          <SpinnerIcon isLarge />
          <p className="mt-4 text-lg">Scanning running containers for applications...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg m-4">
          <p className="font-bold">Failed to load applications:</p>
          <p className="mt-2 font-mono text-sm">{error}</p>
        </div>
      );
    }
    if (applications.length === 0 && unscannedContainers.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-lg">No applications found in any container.</p>
          <p className="text-gray-500 mt-2">Make sure you have graphical applications installed in your running containers.</p>
        </div>
      );
    }
    if (filteredApplications.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-lg">No applications match your search or filters.</p>
          <p className="text-gray-500 mt-2">Try adjusting your search query or filter settings.</p>
        </div>
      );
    }

    return (
      <motion.div 
        className="bg-primary rounded-lg shadow-md" 
        layout
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredApplications.map((app) => (
            <ApplicationRow
              key={`${app.containerName}-${app.appName}`}
              app={app}
              onActionComplete={() => fetchAllData(true)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto">
      <header className="flex flex-col mb-6 gap-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-100 w-full md:w-auto">Applications</h1>
            <div className="flex-grow flex justify-end items-center gap-4 w-full md:w-auto">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchAllData(true)}
                    disabled={isLoading || isRefreshing}
                    className="w-full sm:w-auto px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                    {isRefreshing ? <SpinnerIcon /> : <ArrowPathIcon />}
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </motion.button>
            </div>
        </div>
        
        {/* Filter Bar */}
        <div className="bg-primary p-4 rounded-lg shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-x-6 gap-y-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <label htmlFor="show-shared" className="text-sm font-medium text-gray-300 whitespace-nowrap">Show shared only</label>
                    <ToggleSwitch isOn={showOnlyShared} onToggle={() => setShowOnlyShared(!showOnlyShared)} />
                </div>
                <div className="relative">
                    <button ref={filterButtonRef} onClick={() => setIsFilterOpen(o => !o)} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-light text-gray-200 rounded-md hover:bg-gray-600 transition-colors">
                        Filter by Container {selectedContainerFilters.size > 0 && `(${selectedContainerFilters.size})`}
                        <ChevronDownIcon isOpen={isFilterOpen} />
                    </button>
                    <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div 
                            ref={filterPopupRef}
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full mt-2 w-72 bg-primary-light border border-primary shadow-lg rounded-lg z-20 p-2"
                        >
                            <div className="flex justify-between items-center p-2">
                                <span className="font-bold text-gray-200">Select Containers</span>
                                <button onClick={() => setSelectedContainerFilters(new Set())} className="text-xs text-accent hover:underline">Clear all</button>
                            </div>
                            <div className="max-h-60 overflow-y-auto mt-1 space-y-1">
                                {allContainers.map(c => {
                                    const isChecked = selectedContainerFilters.has(c.name);
                                    const isRunning = !unscannedContainers.includes(c.name);
                                    return (
                                        <label key={c.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-primary transition-colors cursor-pointer">
                                            <input type="checkbox" checked={isChecked} onChange={(e) => handleContainerFilterChange(c.name, e.target.checked)} className="h-4 w-4 rounded bg-primary border-gray-500 text-accent focus:ring-accent" />
                                            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isRunning ? 'bg-accent' : 'bg-gray-500'}`} title={isRunning ? 'Running' : 'Stopped'}></span>
                                            <span className="text-gray-200 truncate flex-grow">{c.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input type="search" placeholder="Search applications..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"/>
            </div>
        </div>
      </header>
      
      {renderContent()}

      <StartContainersModal 
        isOpen={isStartModalOpen}
        onClose={() => {
            setIsStartModalOpen(false);
            setContainersToStart([]);
        }}
        onConfirm={handleConfirmStartContainers}
        containersToStart={containersToStart}
      />
    </div>
  );
};

// --- SVG Icon Components ---
const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const SpinnerIcon: React.FC<{ isLarge?: boolean }> = ({ isLarge }) => <svg className={`animate-spin text-current ${isLarge ? 'h-10 w-10' : 'h-5 w-5'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const ArrowPathIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0 4.142-3.358 7.5-7.5 7.5S4.5 16.142 4.5 12 7.858 4.5 12 4.5c2.36 0 4.471.956 6.012 2.502m1.488-2.492v4.98h-4.98" /></svg>;
const ArrowUpOnSquareIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const TrashIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.036-2.134H8.716c-1.126 0-2.036.954-2.036 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const ChevronDownIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => <motion.svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></motion.svg>;
const PlayIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>;

export default Applications;
