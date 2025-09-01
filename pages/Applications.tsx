import React, { useState, useEffect, useMemo } from 'react';
import type { ExportableApplication, ApplicationList } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const InformationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
      <div className="flex-shrink-0 ml-4 flex gap-2">
        <button
          onClick={handleShare}
          disabled={!!processingAction}
          className="w-28 flex items-center justify-center px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-accent text-charcoal hover:bg-accent-light disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          title={`Share ${app.name} with the host.`}
        >
          {processingAction === 'share' ? (
            <>
              <SpinnerIcon />
              Sharing
            </>
          ) : (
            'Share'
          )}
        </button>
        <button
          onClick={handleUnshare}
          disabled={!!processingAction}
          className="w-28 flex items-center justify-center px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          title={`Remove ${app.name} from the host.`}
        >
          {processingAction === 'unshare' ? (
            <>
              <SpinnerIcon />
              Unsharing
            </>
          ) : (
            'Unshare'
          )}
        </button>
      </div>
    </motion.div>
  );
};

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<ExportableApplication[]>([]);
  const [unscannedContainers, setUnscannedContainers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = async (isRefresh = false) => {
    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    setError(null);
    try {
      const result: ApplicationList = await window.electronAPI.listApplications();
      setApplications(result.applications);
      setUnscannedContainers(result.unscannedContainers);
    } catch (err) {
      console.error("Error fetching applications:", err);
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
    fetchApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) return applications;
    return applications.filter(app =>
      app.name.toLowerCase().includes(lowerCaseQuery) ||
      app.containerName.toLowerCase().includes(lowerCaseQuery)
    );
  }, [applications, searchQuery]);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-gray-400 p-8 animate-pulse">Scanning running containers for applications...</p>;
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
    if (filteredApplications.length === 0 && applications.length > 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-lg">No applications match your search.</p>
          <p className="text-gray-500 mt-2">Try a different search term.</p>
        </div>
      );
    }

    return (
      <motion.div className="bg-primary rounded-lg shadow-md" layout>
        <AnimatePresence>
          {filteredApplications.map((app) => (
            <ApplicationRow
              key={`${app.containerName}-${app.appName}`}
              app={app}
              onActionComplete={() => fetchApplications(true)}
            />
          ))}
        </AnimatePresence>
         {filteredApplications.length === 0 && applications.length === 0 && (
             <div className="text-center p-8">
                 <p className="text-gray-400 text-lg">No applications found in running containers.</p>
             </div>
         )}
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-100 w-full md:w-auto">Applications</h1>
        <div className="flex-grow flex flex-col-reverse sm:flex-row justify-end items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary-light rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <button
            onClick={() => fetchApplications(true)}
            disabled={isLoading || isRefreshing}
            className="w-full sm:w-auto px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            {isRefreshing && <SpinnerIcon />}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>
      
      {unscannedContainers.length > 0 && (
        <div className="bg-blue-900/50 border border-blue-700 text-blue-200 p-4 rounded-lg mb-6 flex items-start gap-3">
            <InformationCircleIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
                <h3 className="font-bold">Some containers were not scanned</h3>
                <p className="text-sm mt-1">
                    Only running containers are scanned for applications. The following are stopped: <span className="font-semibold">{unscannedContainers.join(', ')}</span>.
                </p>
                <p className="text-sm mt-1">
                    You can start them from the "My Containers" page.
                </p>
            </div>
        </div>
      )}

      {renderContent()}
    </div>
  );
};

export default Applications;