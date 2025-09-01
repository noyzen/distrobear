import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MyContainers from './pages/MyContainers';
import SystemInfo from './pages/SystemInfo';
import type { Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('my-containers');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'my-containers':
        return <MyContainers />;
      case 'system-info':
        return <SystemInfo />;
      // Add placeholders for other pages
      case 'create-new':
      case 'local-images':
      case 'download-images':
        return <div className="p-8 text-center"><h1 className="text-3xl font-bold">Coming Soon!</h1><p className="text-gray-400 mt-2">This page is under construction.</p></div>;
      default:
        return <MyContainers />;
    }
  };

  return (
    <div className="flex h-screen bg-charcoal font-sans">
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
  );
};

export default App;
