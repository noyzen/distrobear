import React, { useState, useEffect, useMemo } from 'react';
import type { Container, Page, ContainerInfo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// --- Local Components for MyContainers Page ---

const ContainerInfoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  containerName: string;
}> = ({ isOpen, onClose, containerName }) => {
  const [info, setInfo] = useState<ContainerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchInfo = async () => {
        setIsLoading(true);
        setError(null);
        setInfo(null);
        try {
          const result = await window.electronAPI.containerInfo(containerName);
          setInfo(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchInfo();
    }
  }, [isOpen, containerName]);
  
  const DetailItem: React.FC<{label: string, value: React.ReactNode, isCode?: boolean, fullWidth?: boolean}> = ({ label, value, isCode, fullWidth }) => (
    <div className={`py-2 ${fullWidth ? 'col-span-1 md:col-span-2' : ''}`}>
        <div className="text-sm font-medium text-gray-400">{label}</div>
        <div className={`text-sm text-gray-200 break-words ${isCode ? 'font-mono' : ''}`}>{value || 'N/A'}</div>
    </div>
);

  const BooleanPill: React.FC<{value: boolean}> = ({value}) => (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${value ? 'bg-accent/20 text-accent' : 'bg-gray-600/50 text-gray-300'}`}>
        {value ? 'Yes' : 'No'}
    </span>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl w-full max-w-3xl border border-primary flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <header className="p-4 border-b border-primary flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-100">
                Container Info: <span className="text-accent">{containerName}</span>
            </h2>
        </header>
        
        <main className="p-6 overflow-y-auto">
          {isLoading && <p className="text-center text-gray-400 animate-pulse">Loading details...</p>}
          {error && <div className="p-3 bg-red-900/50 text-red-300 text-sm rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Failed to load info</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>}
          
          {info && (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-primary pb-2">Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <DetailItem label="ID" value={info.id} isCode />
                        <DetailItem label="Backend" value={info.backend} isCode />
                        <DetailItem label="Status" value={info.status} />
                        <DetailItem label="PID" value={info.pid > 0 ? info.pid : 'N/A'} />
                        <DetailItem label="Created" value={new Date(info.created).toLocaleString()} />
                        <DetailItem label="Size" value={info.size} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-2 border-b border-primary pb-2">Image &amp; User</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <DetailItem label="Image" value={info.image} isCode fullWidth/>
                        <DetailItem label="Entrypoint" value={info.entrypoint} isCode fullWidth/>
                        <DetailItem label="User Name" value={info.user_name} isCode />
                        <DetailItem label="User Shell" value={info.user_shell} isCode />
                        <DetailItem label="Home Directory" value={info.home_dir} isCode />
                        <DetailItem label="Hostname" value={info.hostname} isCode />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-2 border-b border-primary pb-2">Configuration Flags</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 py-2">
                        <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-400 mb-1">Init Process</dt>
                            <dd><BooleanPill value={info.init} /></dd>
                        </div>
                        <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-400 mb-1">Root Mode</dt>
                            <dd><BooleanPill value={info.root} /></dd>
                        </div>
                        <div className="flex flex-col">
                            <dt className="text-sm font-medium text-gray-400 mb-1">NVIDIA Runtime</dt>
                            <dd><BooleanPill value={info.nvidia} /></dd>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-2">Mounted Volumes &amp; Binds</h3>
                    <div className="text-xs text-gray-200 font-mono bg-primary-dark/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {info.volumes && info.volumes.length > 0 ? (
                            <ul className="space-y-1">
                                {info.volumes.map((vol, i) => <li key={i}>{vol}</li>)}
                            </ul>
                        ) : (
                            <p className="text-gray-500 normal-case">No custom volumes mounted.</p>
                        )}
                    </div>
                </div>
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-primary flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

const SaveImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageName: string, imageTag: string) => Promise<void>;
  containerName: string;
}> = ({ isOpen, onClose, onSave, containerName }) => {
  const [imageName, setImageName] = useState(`${containerName}-snapshot`);
  const [imageTag, setImageTag] = useState('latest');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when modal is opened/closed
    if (isOpen) {
      setImageName(`${containerName}-snapshot`);
      setImageTag('latest');
      setIsSaving(false);
      setError(null);
    }
  }, [isOpen, containerName]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(imageName, imageTag);
      onClose(); // Close on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl p-6 w-full max-w-lg border border-primary"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-2xl font-bold text-gray-100">Save "{containerName}" as Image</h2>
        <p className="text-gray-400 mt-2 text-sm">This will create a new local image from the container's current state. This image can be used to create new containers.</p>
        
        <div className="space-y-4 mt-6">
          <div>
            <label htmlFor="imageName" className="block text-sm font-medium text-gray-300 mb-1">Image Name</label>
            <input
              type="text"
              id="imageName"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="e.g., my-custom-ubuntu"
              className="w-full px-3 py-2 bg-primary border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="imageTag" className="block text-sm font-medium text-gray-300 mb-1">Tag</label>
            <input
              type="text"
              id="imageTag"
              value={imageTag}
              onChange={(e) => setImageTag(e.target.value)}
              placeholder="e.g., latest or v1.2"
              className="w-full px-3 py-2 bg-primary border border-primary rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              disabled={isSaving}
            />
          </div>
        </div>

        {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Save Failed</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        )}

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !imageName || !imageTag}
            className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Image'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl p-6 w-full max-w-md border border-primary"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
        <p className="text-gray-400 mt-4">{message}</p>
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};


const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const isUp = status.toLowerCase().startsWith('up');
  return (
    <div className="flex-shrink-0 w-8 text-center">
      <div className={`h-3 w-3 rounded-full mx-auto ${isUp ? 'bg-accent' : 'bg-gray-500'} ${isUp ? 'animate-pulse' : ''}`} title={isUp ? 'Running' : 'Stopped'}></div>
    </div>
  );
};

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; disabled: boolean; children: React.ReactNode; primary?: boolean; isStopButton?: boolean }> = ({ onClick, disabled, children, primary = false, isStopButton = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-28 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
      ${primary ? 'bg-accent text-charcoal hover:bg-accent-light' : ''}
      ${isStopButton ? 'bg-red-600 text-white hover:bg-red-500' : ''}
      `}
  >
    {children}
  </button>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ChevronIcon: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
    <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-6 h-6 text-gray-400"
        animate={{ rotate: isSelected ? 180 : 0 }}
        transition={{ duration: 0.2 }}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </motion.svg>
);

const LightningBoltIcon: React.FC<{ className?: string; title?: string; }> = ({ className, title }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        {title && <title>{title}</title>}
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
);

const ShieldIcon: React.FC<{ className?: string; title?: string; }> = ({ className, title }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    {title && <title>{title}</title>}
    <path fillRule="evenodd" d="M10 1.5c.386 0 .762.043 1.128.123 1.48-.022 2.923.433 4.093 1.417.21.173.41.358.598.554A1 1 0 0117 4.82v4.434c0 1.4-.413 2.76-1.18 3.963-.923 1.45-2.3 2.53-3.955 3.162-.255.099-.516.186-.78.258a1 1 0 01-.17 0c-.264-.072-.525-.159-.78-.258-1.656-.632-3.032-1.712-3.955-3.162C4.413 11.983 4 10.654 4 9.254V4.82a1 1 0 011.18-1.222c.188-.196.388-.381.598-.554C6.95 1.956 8.392 1.5 9.872 1.523A4.89 4.89 0 0110 1.5zm.354 4.354a.5.5 0 00-.708 0L7.5 8.004l-.854-.854a.5.5 0 10-.708.708L7.146 8.36l-.853.854a.5.5 0 00.708.708L7.5 8.707l.854.853a.5.5 0 00.708-.708L8.207 8.36l.853-.853a.5.5 0 000-.707l-.353-.353z" clipRule="evenodd" />
    <path d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM8.354 5.854a.5.5 0 000 .708L9.646 8l-1.292 1.293a.5.5 0 00.708.708L10 8.707l1.293 1.293a.5.5 0 00.708-.708L10.707 8l1.293-1.293a.5.5 0 00-.708-.708L10 7.293 8.646 5.854a.5.5 0 00-.293-.147z" />
     <path d="M10 1a9 9 0 100 18 9 9 0 000-18zM5.47 5.47a.75.75 0 011.06 0L10 8.94l3.47-3.47a.75.75 0 111.06 1.06L11.06 10l3.47 3.47a.75.75 0 11-1.06 1.06L10 11.06l-3.47 3.47a.75.75 0 01-1.06-1.06L8.94 10 5.47 6.53a.75.75 0 010-1.06z" />
     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
     <path fillRule="evenodd" d="M10 1a9 9 0 100 18 9 9 0 000-18zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M10,1.5a8.5,8.5,0,1,0,8.5,8.5A8.5,8.5,0,0,0,10,1.5Zm0,15.16A6.66,6.66,0,1,1,16.66,10,6.67,6.67,0,0,1,10,16.66Z" />
    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm0 18a8.5 8.5 0 1 1 8.5-8.5A8.51 8.51 0 0 1 10 18.5Z"/>
    <path fillRule="evenodd" d="M10 1.5A8.5 8.5 0 1018.5 10 8.5 8.5 0 0010 1.5zM5.03 5.03a.75.75 0 011.06 0L10 8.94l3.91-3.91a.75.75 0 111.06 1.06L11.06 10l3.91 3.91a.75.75 0 11-1.06 1.06L10 11.06l-3.91 3.91a.75.75 0 01-1.06-1.06L8.94 10 5.03 6.09a.75.75 0 010-1.06z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4 10a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M10 1.5c-4.69 0-8.5 3.81-8.5 8.5s3.81 8.5 8.5 8.5 8.5-3.81 8.5-8.5-3.81-8.5-8.5-8.5zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
    <path d="M10,1.5A8.5,8.5,0,1,0,18.5,10,8.5,8.5,0,0,0,10,1.5Zm0,15A6.5,6.5,0,1,1,16.5,10,6.5,6.5,0,0,1,10,16.5Z"/><path d="M10,5a5,5,0,1,0,5,5,5,5,0,0,0-5-5Zm0,8a3,3,0,1,1,3-3,3,3,0,0,1-3,3Z"/>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414 0L6 11.006V10a1 1 0 10-2 0v2a1 1 0 001 1h2a1 1 0 100-2H8.414l3.293-3.293a1 1 0 000-1.414z" clipRule="evenodd" />
    <path d="M10,1.5c-4.694,0-8.5,3.806-8.5,8.5s3.806,8.5,8.5,8.5,8.5-3.806,8.5-8.5S14.694,1.5,10,1.5Zm0,15c-3.584,0-6.5-2.916-6.5-6.5S6.416,3.5,10,3.5,16.5,6.416,16.5,10,13.584,16.5,10,16.5Z"/><path d="M10,5.5a4.5,4.5,0,1,0,4.5,4.5A4.5,4.5,0,0,0,10,5.5Zm0,7A2.5,2.5,0,1,1,12.5,10,2.5,2.5,0,0,1,10,12.5Z"/>
     <path fillRule="evenodd" d="M10 1a9 9 0 100 18 9 9 0 000-18zM9 5a1 1 0 112 0v2.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 7.586V5zm1 7a1 1 0 100 2h.01a1 1 0 100-2H10z" clipRule="evenodd" />
     <path fillRule="evenodd" d="M10 1.5c.386 0 .762.043 1.128.123 1.48-.022 2.923.433 4.093 1.417.21.173.41.358.598.554A1 1 0 0117 4.82v4.434c0 1.4-.413 2.76-1.18 3.963-.923 1.45-2.3 2.53-3.955 3.162-.255.099-.516.186-.78.258a1 1 0 01-.17 0c-.264-.072-.525-.159-.78-.258-1.656-.632-3.032-1.712-3.955-3.162C4.413 11.983 4 10.654 4 9.254V4.82a1 1 0 011.18-1.222c.188-.196.388-.381.598-.554C6.95 1.956 8.392 1.5 9.872 1.523A4.89 4.89 0 0110 1.5z" clipRule="evenodd" />
  </svg>
);


const TerminalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const InformationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);

const ToggleSwitch: React.FC<{ isOn: boolean; onToggle: () => void; disabled?: boolean; }> = ({ isOn, onToggle, disabled }) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent/50 ${
        isOn ? 'bg-accent' : 'bg-primary-light'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <motion.span
        className="inline-block w-4 h-4 transform bg-white rounded-full"
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        initial={false}
        animate={{ x: isOn ? '1.5rem' : '0.25rem' }}
      />
    </button>
  );
};


const ContainerRow: React.FC<{
  container: Container;
  isSelected: boolean;
  onSelect: () => void;
  onActionComplete: () => void;
  isLast: boolean;
}> = ({ container, isSelected, onSelect, onActionComplete, isLast }) => {
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isSaveImageModalOpen, setSaveImageModalOpen] = useState(false);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);

  // Optimistic state for the autostart toggle
  const [optimisticAutostartEnabled, setOptimisticAutostartEnabled] = useState(container.isAutostartEnabled);

  // Effect to sync optimistic state with the true state from props when it changes.
  useEffect(() => {
    setOptimisticAutostartEnabled(container.isAutostartEnabled);
  }, [container.isAutostartEnabled]);
  
  const isUp = container.status.toLowerCase().startsWith('up');

  const performAction = async (action: 'start' | 'stop' | 'autostart-enable' | 'autostart-disable' | 'delete') => {
    setIsActionInProgress(true);
    setActionError(null);
    try {
      switch(action) {
        case 'start': await window.electronAPI.containerStart(container.name); break;
        case 'stop': await window.electronAPI.containerStop(container.name); break;
        case 'autostart-enable': await window.electronAPI.containerAutostartEnable(container.name); break;
        case 'autostart-disable': await window.electronAPI.containerAutostartDisable(container.name); break;
        case 'delete': await window.electronAPI.containerDelete(container.name); break;
      }
      onActionComplete();
    } catch (err) {
      console.error(`Failed to ${action} container:`, err);
      setActionError(err instanceof Error ? err.message : "An unknown error occurred.");
      // If an autostart action failed, revert the optimistic state.
      if (action.startsWith('autostart')) {
        setOptimisticAutostartEnabled(container.isAutostartEnabled);
      }
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: 'start' | 'stop') => {
      e.stopPropagation();
      performAction(action);
  }

  const handleEnterClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    try {
        await window.electronAPI.containerEnter(container.name);
        // If container was stopped, entering it starts it. Refresh the UI.
        if (!isUp) {
            // A short delay gives the backend time to update the container status.
            setTimeout(() => onActionComplete(), 500);
        }
    } catch (err) {
        console.error(`Failed to enter container:`, err);
        setActionError(err instanceof Error ? err.message : "An unknown error occurred.");
    }
  };

  const handleAutostartToggle = () => {
    if (isActionInProgress) return;

    // Optimistically update the UI state
    const newAutostartState = !optimisticAutostartEnabled;
    setOptimisticAutostartEnabled(newAutostartState);
    
    // Perform the backend action
    performAction(newAutostartState ? 'autostart-enable' : 'autostart-disable');
  };

  const handleConfirmDelete = () => {
    performAction('delete');
  };
  
  const handleSaveImage = (imageName: string, imageTag: string) => {
    // This function is passed to the modal and returns a promise
    // so the modal can manage its own loading/error state.
    return new Promise<void>(async (resolve, reject) => {
        try {
            await window.electronAPI.containerCommit(container.name, imageName, imageTag);
            // Future enhancement: show a success toast. For now, just resolve.
            resolve();
        } catch (err) {
            console.error(`Failed to save container as image:`, err);
            reject(err); // The modal will display this error.
        }
    });
  };

  return (
    <motion.div 
        layout="position"
        className={`
            relative transition-all duration-300 ease-in-out
            ${ isSelected
                ? 'z-10 scale-[1.02] my-1 rounded-lg border-[3px] border-accent shadow-[0_0_8px_theme(colors.accent.light),0_0_25px_theme(colors.accent.DEFAULT)_/_60%]'
                : `z-0 scale-100 border-b ${isLast ? 'border-transparent' : 'border-primary-light'}`
            }
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
      <div
        onClick={onSelect}
        className={`flex items-center p-4 cursor-pointer transition-colors duration-200 hover:bg-primary-light/50
            ${ isSelected ? 'bg-primary-light rounded-t-lg' : '' }
        `}
      >
        <StatusIndicator status={container.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-100 truncate">{container.name}</h3>
            {container.isIsolated && <ShieldIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" title="Isolated Home Directory" />}
            {optimisticAutostartEnabled && <LightningBoltIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" title="Autostart Enabled" />}
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate" title={container.image}>{container.image}</p>
        </div>
        <p className="flex-shrink-0 hidden md:block text-sm text-gray-400 mx-4 min-w-0 truncate" title={container.status}>{container.status}</p>
        <div className="flex-shrink-0">
          <ChevronIcon isSelected={isSelected} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.section
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden bg-primary-dark/30 rounded-b-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-4 divide-y divide-primary-light">
                <div className="flex flex-wrap items-center justify-center pt-2 gap-4">
                    {isUp ? (
                        <ActionButton onClick={(e) => handleActionClick(e, 'stop')} disabled={isActionInProgress} isStopButton>
                        {isActionInProgress ? '...' : 'Stop'}
                        </ActionButton>
                    ) : (
                        <ActionButton onClick={(e) => handleActionClick(e, 'start')} disabled={isActionInProgress} primary>
                        {isActionInProgress ? '...' : 'Start'}
                        </ActionButton>
                    )}
                     <button
                        onClick={(e) => handleEnterClick(e)}
                        disabled={isActionInProgress}
                        className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed bg-primary-light text-gray-200 hover:bg-gray-500"
                        title="Open a terminal in this container"
                    >
                        <TerminalIcon className="w-4 h-4" />
                        Enter
                    </button>
                    <button
                        onClick={() => setInfoModalOpen(true)}
                        className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-primary-light text-gray-200 hover:bg-gray-500"
                        title="Show detailed container information"
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                        Info
                    </button>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <div className="text-sm">
                        <p className="font-semibold text-gray-200">Autostart on Boot</p>
                        <p className="text-xs text-gray-400">Requires Podman & systemd</p>
                    </div>
                    <ToggleSwitch isOn={optimisticAutostartEnabled} onToggle={handleAutostartToggle} disabled={isActionInProgress} />
                </div>

                <div className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-200">Export Container</p>
                            <p className="text-xs text-gray-400">Save current state as a new local image.</p>
                        </div>
                        <button
                            onClick={() => setSaveImageModalOpen(true)}
                            disabled={isActionInProgress || !isUp}
                            title={!isUp ? "Container must be running to save it as an image." : "Save a snapshot of the running container"}
                            className="px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            Save as Image
                        </button>
                    </div>
                     {!isUp && (
                        <p className="text-xs text-yellow-500 text-right mt-1">
                            Container must be running to save as an image.
                        </p>
                    )}
                </div>
                
                <div className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-red-400">Danger Zone</p>
                            <p className="text-xs text-gray-500">This action cannot be undone.</p>
                        </div>
                        <button
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={isActionInProgress}
                            className="px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {actionError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 pb-4 pt-4"
              >
                <div className="p-3 bg-red-900/50 text-red-300 text-xs rounded-md border border-red-700/50">
                    <p className="font-sans font-bold mb-1">Action Failed</p>
                    <pre className="whitespace-pre-wrap break-words font-mono">{actionError}</pre>
                </div>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDeleteModalOpen && (
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete "${container.name}"?`}
                message="Are you sure? All data inside this container will be permanently lost."
            />
        )}
        {isSaveImageModalOpen && (
            <SaveImageModal
                isOpen={isSaveImageModalOpen}
                onClose={() => setSaveImageModalOpen(false)}
                onSave={handleSaveImage}
                containerName={container.name}
            />
        )}
        {isInfoModalOpen && (
            <ContainerInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setInfoModalOpen(false)}
                containerName={container.name}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
};


// --- Main Page Component ---

const MyContainers: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContainers = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.listContainers();
      setContainers(result);
    } catch (err) {
      console.error("Error fetching containers:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);
  
  const handleSelectContainer = (name: string) => {
    setSelectedContainer(prev => (prev === name ? null : name));
  };
  
  const filteredContainers = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) return containers;
    return containers.filter(c => 
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.image.toLowerCase().includes(lowerCaseQuery)
    );
  }, [containers, searchQuery]);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-gray-400 p-8">Loading containers...</p>;
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg m-4">
          <p className="font-bold">Failed to load containers:</p>
          <p className="mt-2 font-mono text-sm">{error}</p>
        </div>
      );
    }
    if (containers.length === 0) {
      return (
         <div className="text-center py-10">
            <p className="text-gray-400 text-lg">No distrobox containers found.</p>
            <p className="text-gray-500 mt-2">You can create one from the "Create New" menu.</p>
        </div>
      )
    }
    if (filteredContainers.length === 0) {
        return (
            <div className="text-center py-10">
               <p className="text-gray-400 text-lg">No containers match your search.</p>
               <p className="text-gray-500 mt-2">Try a different search term or clear the search.</p>
           </div>
         )
    }

    return (
      <motion.div className="bg-primary rounded-lg shadow-md" layout>
        <AnimatePresence initial={false}>
            {filteredContainers.map((container, index) => (
            <ContainerRow
                key={container.name}
                container={container}
                isSelected={selectedContainer === container.name}
                onSelect={() => handleSelectContainer(container.name)}
                onActionComplete={() => fetchContainers(true)}
                isLast={index === filteredContainers.length - 1}
            />
            ))}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  return (
    <div className="container mx-auto">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-100 w-full md:w-auto">My Containers</h1>
        
        <div className="flex-grow flex flex-col-reverse sm:flex-row justify-end items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                    type="search"
                    placeholder="Search containers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-primary-light border border-primary-light rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                 <button
                    onClick={() => setCurrentPage('create-new')}
                    className="flex-1 sm:flex-none px-5 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-200"
                >
                    Create
                </button>
                <button
                    onClick={() => fetchContainers(true)}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {isLoading ? '...' : 'Refresh'}
                </button>
            </div>
        </div>
      </header>
      {renderContent()}
    </div>
  );
};

export default MyContainers;