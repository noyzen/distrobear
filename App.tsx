import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MyContainers from './pages/MyContainers';
import SystemInfo from './pages/SystemInfo';
import Applications from './pages/Applications';
import TitleBar from './components/TitleBar';
import SetupWizard from './pages/SetupWizard';
import CreateContainer from './pages/CreateContainer';
import LocalImages from './pages/LocalImages';
import DownloadImages from './pages/DownloadImages';
import Logs from './pages/Logs';
import Help from './pages/Help';
import type { Page, DependencyCheckResult } from './types';
import { motion, AnimatePresence } from 'framer-motion';

type AppState = 'checking' | 'setup-required' | 'ready';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('checking');
  const [setupInfo, setSetupInfo] = useState<DependencyCheckResult | null>(null);

  const [currentPage, setCurrentPage] = useState<Page>('my-containers');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.onWindowStateChange((maximized) => {
      setIsMaximized(maximized);
    });
  }, []);

  const performDependencyCheck = async () => {
    setAppState('checking');
    const result = await window.electronAPI.checkDependencies();
    setSetupInfo(result);
    if (result.needsSetup) {
      setAppState('setup-required');
    } else {
      setAppState('ready');
    }
  };

  const handleRerunSetup = async () => {
    setAppState('checking');
    const result = await window.electronAPI.checkDependencies();
    setSetupInfo(result);
    setAppState('setup-required');
  };
  
  const handleSkipSetup = () => {
    setAppState('ready');
  };

  useEffect(() => {
    performDependencyCheck();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'my-containers':
        return <MyContainers setCurrentPage={setCurrentPage} />;
      case 'applications':
        return <Applications />;
      case 'system-info':
        return <SystemInfo onRerunSetup={handleRerunSetup} />;
      case 'create-new':
        return <CreateContainer setCurrentPage={setCurrentPage} />;
      case 'local-images':
        return <LocalImages setCurrentPage={setCurrentPage} />;
      case 'download-images':
        return <DownloadImages />;
      case 'logs':
        return <Logs />;
      case 'help':
        return <Help />;
      default:
        return <MyContainers setCurrentPage={setCurrentPage} />;
    }
  };

  const renderAppStateContent = () => {
    switch (appState) {
      case 'checking':
        return (
          <div className="flex items-center justify-center h-full">
            <h1 className="text-2xl text-gray-400 animate-pulse">Checking system setup...</h1>
          </div>
        );
      case 'setup-required':
        return <SetupWizard setupInfo={setupInfo!} onSetupComplete={performDependencyCheck} onSkip={handleSkipSetup} />;
      case 'ready':
        return (
            <div className="flex flex-1 h-full overflow-hidden">
              <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
              />
              <main className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="p-4 md:p-8">
                      {renderPage()}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-primary font-sans overflow-hidden shadow-2xl ${
      !isMaximized ? 'border border-primary-light' : ''
    }`}>
      <TitleBar isMaximized={isMaximized} />
      {renderAppStateContent()}
    </div>
  );
};

export default App;