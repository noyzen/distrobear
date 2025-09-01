import React from 'react';
import type { Page } from '../types';
import { motion } from 'framer-motion';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  page: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  icon: JSX.Element;
  label: string;
  setSidebarOpen: (isOpen: boolean) => void;
}> = ({ page, currentPage, setCurrentPage, icon, label, setSidebarOpen }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => {
        setCurrentPage(page);
        setSidebarOpen(false); // Close sidebar on mobile after navigation
      }}
      className={`flex items-center w-full px-4 py-3 text-left transition-colors duration-200 rounded-lg ${
        isActive
          ? 'bg-accent/20 text-accent'
          : 'text-gray-400 hover:bg-primary-light hover:text-gray-200'
      }`}
    >
      <span className="w-6 h-6 mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isOpen, setIsOpen }) => {
  const menuItems = [
    { page: 'my-containers' as Page, label: 'My Containers', icon: <CubeIcon /> },
    { page: 'create-new' as Page, label: 'Create New', icon: <PlusCircleIcon /> },
    { page: 'local-images' as Page, label: 'Local Images', icon: <ImageIcon /> },
    { page: 'download-images' as Page, label: 'Download Images', icon: <DownloadIcon /> },
    { page: 'system-info' as Page, label: 'System & Info', icon: <ChipIcon /> },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-primary-light text-white"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <XIcon /> : <MenuIcon />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-10"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <motion.aside 
        className={`fixed md:relative z-20 flex flex-col h-full bg-primary border-r border-primary-light transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        initial={false}
        animate={{ width: 256 }}
      >
        <div className="flex items-center justify-center p-6 border-b border-primary-light">
          <h1 className="text-2xl font-bold text-accent">DistroBear</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => (
            <NavItem
              key={item.page}
              page={item.page}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              icon={item.icon}
              label={item.label}
              setSidebarOpen={setIsOpen}
            />
          ))}
        </nav>
        <footer className="p-4 text-xs text-center text-gray-500 border-t border-primary-light">
            Version 1.0.0
        </footer>
      </motion.aside>
    </>
  );
};

// SVG Icon Components (Heroicons)
const CubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
);
const PlusCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const ChipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H7.5A2.25 2.25 0 005.25 7.5v9a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>
);
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);


export default Sidebar;