import React from 'react';
import type { Page } from '../types';
import { motion } from 'framer-motion';
import Logo from './Logo';
import { 
    CubeIcon, 
    PlusCircleIcon, 
    Squares2X2Icon, 
    ArchiveBoxIcon, 
    ArrowDownTrayIcon, 
    CpuChipIcon,
    Bars3Icon,
    XMarkIcon
} from './Icons';

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
    <motion.button
      whileHover={{ x: isActive ? 0 : 3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
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
    </motion.button>
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
        {isOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
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

export default Sidebar;
