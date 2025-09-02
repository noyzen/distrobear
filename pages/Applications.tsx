import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ExportableApplication, Container } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ToggleSwitch from '../components/ToggleSwitch';
import ApplicationRow from '../components/applications/ApplicationRow';
import StartContainersModal from '../components/applications/StartContainersModal';
import SpinnerIcon from '../components/shared/SpinnerIcon';
import { MagnifyingGlassIcon, ArrowPathIcon, ChevronDownIcon } from '../components/Icons';

const listContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
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
          setContainersToStart(prev => [...new Set([...prev, containerName])]);
          setIsStartModalOpen(true);
          return;
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
                        <ChevronDownIcon isOpen={isFilterOpen} className="w-4 h-4 text-gray-400" />
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

export default Applications;