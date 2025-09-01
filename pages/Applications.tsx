import React, { useState, useEffect, useMemo } from 'react';
import type { ExportableApplication } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ApplicationRow: React.FC<{
  app: ExportableApplication;
  onActionComplete: () => void;
}> = ({ app, onActionComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleExport = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      if (app.isExported) {
        await window.electronAPI.applicationUnexport({ containerName: app.containerName, appName: app.appName });
      } else {
        await window.electronAPI.applicationExport({ containerName: app.containerName, appName: app.appName });
      }
      onActionComplete();
    } catch (err) {
      console.error(`Failed to toggle export for ${app.name}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsProcessing(false);
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
      <div className="flex-shrink-0 ml-4">
        <button
          onClick={handleToggleExport}
          disabled={isProcessing}
          className={`w-28 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
            ${app.isExported
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-accent text-charcoal hover:bg-accent-light'
            }`}
        >
          {isProcessing ? '...' : (app.isExported ? 'Unshare' : 'Share')}
        </button>
      </div>
    </motion.div>
  );
};

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<ExportableApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.listApplications();
      setApplications(result);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
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
      return <p className="text-center text-gray-400 p-8 animate-pulse">Loading applications...</p>;
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg m-4">
          <p className="font-bold">Failed to load applications:</p>
          <p className="mt-2 font-mono text-sm">{error}</p>
        </div>
      );
    }
    if (applications.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-lg">No applications found in any container.</p>
          <p className="text-gray-500 mt-2">Make sure you have graphical applications installed in your containers.</p>
        </div>
      );
    }
    if (filteredApplications.length === 0) {
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
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? '...' : 'Refresh'}
          </button>
        </div>
      </header>
      {renderContent()}
    </div>
  );
};

export default Applications;
