import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MyContainers from './pages/MyContainers';
import SystemInfo from './pages/SystemInfo';
import TitleBar from './components/TitleBar';
import SetupWizard from './pages/SetupWizard';
import type { Page, DependencyCheckResult } from './types';

type AppState = 'checking' | 'setup-required' | 'ready';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('checking');
  const [setupInfo, setSetupInfo] = useState<DependencyCheckResult | null>(null);

  const [currentPage, setCurrentPage] = useState<Page>('my-containers');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    performDependencyCheck();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'my-containers':
        return <MyContainers setCurrentPage={setCurrentPage} />;
      case 'system-info':
        return <SystemInfo onRerunSetup={handleRerunSetup} />;
      case 'create-new':
      case 'local-images':
      case 'download-images':
        return <div className="p-8 text-center"><h1 className="text-3xl font-bold">Coming Soon!</h1><p className="text-gray-400 mt-2">This page is under construction.</p></div>;
      default:
        return <MyContainers setCurrentPage={setCurrentPage} />;
    }
  };

  const renderContent = () => {
    switch (appState) {
      case 'checking':
        return (
          <div className="flex items-center justify-center h-screen bg-charcoal">
            <h1 className="text-2xl text-gray-400 animate-pulse">Checking system setup...</h1>
          </div>
        );
      case 'setup-required':
        return <SetupWizard setupInfo={setupInfo!} onSetupComplete={performDependencyCheck} />;
      case 'ready':
        return (
          <div className="flex flex-col h-screen bg-charcoal font-sans rounded-lg overflow-hidden shadow-2xl">
            <TitleBar />
            <div className="flex flex-1 h-full overflow-hidden">
              <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
              />
              <main className="flex-1 overflow-y-auto transition-all duration-300">
                <div className="p-4 md:p-8">
                  {renderPage()}
                </div>
              </main>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return <>{renderContent()}</>;
};

export default App;