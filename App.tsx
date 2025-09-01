import React, { useState, useEffect } from 'react';
import type { OSInfo } from './types';

// Helper component defined outside the main component to prevent re-creation on re-renders.
const InfoItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
    <span className="font-semibold text-gray-300">{label}</span>
    <span className="font-mono text-cyan-400">{value}</span>
  </div>
);

const App: React.FC = () => {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOSInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (window.electronAPI) {
        const info = await window.electronAPI.getOSInfo();
        setOsInfo(info);
      } else {
        setError("Electron API not available. Are you running in a browser?");
        // Set mock data for browser mode for UI preview
        setOsInfo({
          arch: 'x64-mock',
          hostname: 'browser-host',
          platform: 'web',
          release: 'latest-chrome',
          totalmem: 8 * 1024 * 1024 * 1024,
          freemem: 4 * 1024 * 1024 * 1024,
        });
      }
    } catch (err) {
      console.error("Error fetching OS info:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOSInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        <header className="p-6 bg-gray-900/50 border-b border-gray-700">
          <h1 className="text-3xl font-bold text-center text-cyan-400 tracking-wider">
            Electron System Info
          </h1>
          <p className="text-center text-gray-400 mt-2">
            A demo of React communicating with a Node.js backend via Electron's IPC.
          </p>
        </header>

        <main className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
              <p><span className="font-bold">Error:</span> {error}</p>
            </div>
          )}

          {osInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Platform" value={osInfo.platform} />
              <InfoItem label="Architecture" value={osInfo.arch} />
              <InfoItem label="Hostname" value={osInfo.hostname} />
              <InfoItem label="OS Release" value={osInfo.release} />
              <InfoItem label="Total Memory" value={formatBytes(osInfo.totalmem)} />
              <InfoItem label="Free Memory" value={formatBytes(osInfo.freemem)} />
            </div>
          )}

          <div className="pt-4 flex justify-center">
            <button
              onClick={fetchOSInfo}
              disabled={isLoading}
              className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-full hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
            >
              {isLoading ? 'Loading...' : 'Refresh System Info'}
            </button>
          </div>
        </main>
      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Built with Electron, React, Vite, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
