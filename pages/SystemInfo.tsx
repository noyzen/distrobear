import React, { useState, useEffect } from 'react';
import type { OSInfo, VersionInfo } from '../types';
import { motion } from 'framer-motion';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from '../components/Icons';

interface SystemInfoProps {
  onRerunSetup: () => void;
}

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


const InfoItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <motion.div variants={listItemVariants} className="flex justify-between items-center bg-primary-light p-4 rounded-lg">
    <span className="font-semibold text-gray-300">{label}</span>
    <span className="font-mono text-accent">{value}</span>
  </motion.div>
);

const SystemInfo: React.FC<SystemInfoProps> = ({ onRerunSetup }) => {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [terminal, setTerminal] = useState<string>('Detecting...');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await window.electronAPI.getOSInfo();
      setOsInfo(info);
      const term = await window.electronAPI.getTerminal();
      setTerminal(term ?? 'Not Found');
      const versions = await window.electronAPI.getVersionInfo();
      setVersionInfo(versions);
    } catch (err) {
      console.error("Error fetching system info:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-center text-gray-100">System & Info</h1>
        <p className="text-center text-gray-400 mt-2">
          Key information about your system and container setup.
        </p>
      </header>

      <main className="p-6 space-y-4 max-w-3xl mx-auto bg-primary rounded-xl shadow-lg">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
            <p><span className="font-bold">Error:</span> {error}</p>
          </div>
        )}

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {versionInfo && (
            <>
              <InfoItem label="Distrobox Version" value={versionInfo.distrobox} />
              <InfoItem label="Podman Version" value={versionInfo.podman} />
            </>
          )}
          <InfoItem label="Default Terminal" value={terminal} />
          {osInfo && (
            <>
              <InfoItem label="Platform" value={osInfo.platform} />
              <InfoItem label="Architecture" value={osInfo.arch} />
              <InfoItem label="Hostname" value={osInfo.hostname} />
              <InfoItem label="OS Release" value={osInfo.release} />
              <InfoItem label="Total Memory" value={formatBytes(osInfo.totalmem)} />
            </>
          )}
        </motion.div>

        <div className="pt-4 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchSystemInfo}
            disabled={isLoading}
            className="px-8 py-3 bg-accent text-charcoal font-bold rounded-full hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-accent/50 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Loading...' : <><ArrowPathIcon /> Refresh System Info</>}
          </motion.button>
        </div>
        
        <div className="pt-6 border-t border-primary-light text-center space-y-3">
            <p className="text-sm text-gray-400">Need to reinstall or repair dependencies?</p>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRerunSetup}
                className="px-6 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-200"
            >
                Run Setup Wizard Manually
            </motion.button>
        </div>
        
         <div className="pt-6 border-t border-primary-light text-center space-y-4">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                <a href="https://github.com/noyzen/distrobear" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-accent transition-colors">
                    Project on GitHub <ArrowTopRightOnSquareIcon />
                </a>
                <a href="https://distrobox.it/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-accent transition-colors">
                    Distrobox Website <ArrowTopRightOnSquareIcon />
                </a>
            </div>
            <p className="text-sm text-gray-500 pt-2">Created by noyzen</p>
        </div>
      </main>
    </div>
  );
};

export default SystemInfo;
