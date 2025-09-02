import React, { useState, useEffect, useRef } from 'react';
import type { DependencyCheckResult, DependencyStatus } from '../types';
import { motion } from 'framer-motion';

interface SetupWizardProps {
  setupInfo: DependencyCheckResult;
  onSetupComplete: () => void;
  onSkip: () => void;
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

const SetupWizard: React.FC<SetupWizardProps> = ({ setupInfo, onSetupComplete, onSkip }) => {
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
    <div className="flex flex-col items-center justify-center h-full p-8">
      <motion.div 
        className="w-full max-w-3xl bg-primary rounded-xl shadow-2xl p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center">
          <h1 className="text-4xl font-bold text-accent">Welcome to DistroBear!</h1>
          <p className="text-gray-400 mt-2">Let's get your system ready to manage containers with ease.</p>
        </header>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-200">Dependency Check</h2>
          {setupInfo.dependencies.map(dep => <DependencyItem key={dep.name} status={dep} />)}
          <p className="text-sm text-gray-500 pt-2">
            A container runtime (Podman) and Distrobox are required.
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

        <footer className="flex flex-col sm:flex-row items-center justify-center pt-4 gap-4">
          {isFinished ? (
            <button
              onClick={onSetupComplete}
              className="px-8 py-3 bg-accent text-charcoal font-bold rounded-full hover:bg-accent-light transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
            >
              Continue to Application
            </button>
          ) : (
            <>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="px-8 py-3 bg-accent text-charcoal font-bold rounded-full hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-accent/50"
              >
                {isInstalling ? 'Installing...' : 'Begin Installation'}
              </button>
              <button
                onClick={onSkip}
                disabled={isInstalling}
                className="px-8 py-3 bg-primary-light text-gray-200 font-bold rounded-full hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
              >
                Skip for now
              </button>
            </>
          )}
        </footer>
      </motion.div>
    </div>
  );
};

// --- SVG Icon Components ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationTriangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;

export default SetupWizard;