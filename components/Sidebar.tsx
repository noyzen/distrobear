import React from 'react';
import type { Page } from '../types';
import { motion } from 'framer-motion';
import Logo from './Logo';

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
  icon: React.ReactElement;
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
    { page: 'applications' as Page, label: 'Applications', icon: <Squares2X2Icon /> },
    { page: 'local-images' as Page, label: 'Local Images', icon: <ArchiveBoxIcon /> },
    { page: 'download-images' as Page, label: 'Download Images', icon: <ArrowDownTrayIcon /> },
    { page: 'system-info' as Page, label: 'System & Info', icon: <CpuChipIcon /> },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-primary-light text-white"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <XMarkIcon /> : <Bars3Icon />}
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
        <div className="flex items-center justify-center p-6 border-b space-x-2 border-primary-light">
          <Logo className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-gray-100">DistroBear</h1>
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

// --- SVG Icon Components ---
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const Squares2X2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 018.25 20.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
const ArchiveBoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
const ArrowDownTrayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const CpuChipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H7.5A2.25 2.25 0 005.25 7.5v9a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>;
const Bars3Icon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default Sidebar;