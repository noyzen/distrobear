import React, { useState, useEffect, useRef } from 'react';
import type { DependencyCheckResult, DependencyStatus } from '../types';
import { motion } from 'framer-motion';

interface SetupWizardProps {
  setupInfo: DependencyCheckResult;
  onSetupComplete: () => void;
}

const DependencyItem: React.FC<{ status: DependencyStatus }> = ({ status }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-primary-light rounded-lg">
      <span className="font-semibold text-lg capitalize">{status.name}</span>
      {status.isInstalled ? (
        <div className="flex items-center text-accent">
          <CheckCircleIcon />
          <span className="ml-2">Installed</span>
        </div>
      ) : (
        <div className="flex items-center text-yellow-400">
          <ExclamationTriangleIcon />
          <span className="ml-2">Missing</span>
        </div>
      )}
    </div>
  );
};

const SetupWizard: React.FC<SetupWizardProps> = ({ setupInfo, onSetupComplete }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationLogs, setInstallationLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Set up the listener for installation logs
    window.electronAPI.onInstallationLog((log) => {
      setInstallationLogs(prev => [...prev, log]);
    });
  }, []);

  useEffect(() => {
    // Auto-scroll the log container
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [installationLogs]);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);
    setInstallationLogs([]);
    setIsFinished(false);
    try {
      await window.electronAPI.installDependencies();
      setIsFinished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during installation.');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-charcoal p-8">
      <motion.div 
        className="w-full max-w-3xl bg-primary rounded-xl shadow-2xl p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center">
          <h1 className="text-4xl font-bold text-accent">Welcome!</h1>
          <p className="text-gray-400 mt-2">Let's get your system ready to use Distrobox GUI.</p>
        </header>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-200">Dependency Check</h2>
          {setupInfo.dependencies.map(dep => <DependencyItem key={dep.name} status={dep} />)}
          <p className="text-sm text-gray-500 pt-2">
            A container runtime (Podman or Docker) and Distrobox are required. We recommend Podman.
          </p>
        </div>

        {(isInstalling || installationLogs.length > 0) && (
            <div
                ref={logContainerRef}
                className="w-full h-48 bg-primary-dark rounded-lg p-4 font-mono text-sm text-gray-300 overflow-y-auto border border-primary-light"
            >
                <pre className="whitespace-pre-wrap break-words">
                    {installationLogs.join('') || 'Starting installation...'}
                </pre>
            </div>
        )}

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
                <strong>Error:</strong> {error}
            </div>
        )}

        <footer className="flex justify-center pt-4">
          {isFinished ? (
            <button
              onClick={onSetupComplete}
              className="px-8 py-3 bg-accent text-charcoal font-bold rounded-full hover:bg-accent-light transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
            >
              Continue to Application
            </button>
          ) : (
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-8 py-3 bg-accent text-charcoal font-bold rounded-full hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
            >
              {isInstalling ? 'Installing...' : 'Begin Installation'}
            </button>
          )}
        </footer>
      </motion.div>
    </div>
  );
};

// Icons
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationTriangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

export default SetupWizard;
