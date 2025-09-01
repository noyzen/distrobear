import React, { useState, useEffect } from 'react';
import type { OSInfo } from '../types';

interface SystemInfoProps {
  onRerunSetup: () => void;
}

const InfoItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center bg-primary-light p-4 rounded-lg">
    <span className="font-semibold text-gray-300">{label}</span>
    <span className="font-mono text-accent">{value}</span>
  </div>
);

const SystemInfo: React.FC<SystemInfoProps> = ({ onRerunSetup }) => {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
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
          System information provided by the Node.js backend.
        </p>
      </header>

      <main className="p-6 space-y-4 max-w-3xl mx-auto bg-primary rounded-xl shadow-lg">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
            <p><span className="font-bold">Error:</span> {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem label="Default Terminal" value={terminal} />
          {osInfo && (
            <>
              <InfoItem label="Platform" value={osInfo.platform} />
              <InfoItem label="Architecture" value={osInfo.arch} />
              <InfoItem label="Hostname" value={osInfo.hostname} />
              <InfoItem label="OS Release" value={osInfo.release} />
              <InfoItem label="Total Memory" value={formatBytes(osInfo.totalmem)} />
              <InfoItem label="Free Memory" value={formatBytes(osInfo.freemem)} />
            </>
          )}
        </div>

        <div className="pt-4 flex justify-center">
          <button
            onClick={fetchSystemInfo}
            disabled={isLoading}
            className="px-8 py-3 bg-accent text-charcoal font-bold rounded-full hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
          >
            {isLoading ? 'Loading...' : 'Refresh System Info'}
          </button>
        </div>
        
        <div className="pt-6 border-t border-primary-light text-center space-y-3">
            <p className="text-sm text-gray-400">Need to reinstall or repair dependencies?</p>
            <button
                onClick={onRerunSetup}
                className="px-6 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-200"
            >
                Run Setup Wizard Manually
            </button>
        </div>
      </main>
    </div>
  );
};

export default SystemInfo;