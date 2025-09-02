import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { Container, Page, ContainerInfo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ToggleSwitch from '../components/ToggleSwitch';
import DistroIcon from '../components/DistroLogo';

// --- Animation Variants ---
const listContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const listItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

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
  
  const DetailItem: React.FC<{label: string, value: React.ReactNode, isCode?: boolean}> = ({ label, value, isCode }) => (
    <div className="py-2">
        <div className="text-sm font-medium text-gray-400">{label}</div>
        <div className={`text-sm text-gray-200 break-words ${isCode ? 'font-mono' : ''}`}>{value || 'N/A'}</div>
    </div>
);

  const BooleanPill: React.FC<{value: boolean, label: string}> = ({value, label}) => (
    <div className="flex items-center justify-between py-2">
        <div className="text-sm font-medium text-gray-400">{label}</div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${value ? 'bg-accent/20 text-accent' : 'bg-gray-600/50 text-gray-300'}`}>
            {value ? 'Enabled' : 'Disabled'}
        </span>
    </div>
  );

  const modalRoot = document.getElementById('modal-root');

  if (!isOpen || !modalRoot) return null;

  const renderContent = () => {
    if (isLoading) {
        return <p className="text-center text-gray-400 animate-pulse p-8">Loading details...</p>;
    }
    if (error) {
        return (
            <div className="p-4 m-6 bg-red-900/50 text-red-300 text-sm rounded-md border border-red-700/50">
                <p className="font-sans font-bold mb-1">Failed to load info</p>
                <pre className="whitespace-pre-wrap break-words font-mono">{error}</pre>
            </div>
        );
    }
    if (info) {
        return (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Overview</h3>
                        <DetailItem label="ID" value={info.id} isCode />
                        <DetailItem label="Status" value={info.status} />
                        <DetailItem label="Backend" value={info.backend} isCode />
                        <DetailItem label="PID" value={info.pid > 0 ? info.pid : 'N/A'} />
                        <DetailItem label="Created" value={new Date(info.created).toLocaleString()} />
                        {info.size && info.size !== 'N/A' && <DetailItem label="Size" value={info.size} />}
                    </section>
                     <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Configuration</h3>
                        <BooleanPill label="Init Process" value={info.init} />
                        <BooleanPill label="Root Mode" value={info.root} />
                        <BooleanPill label="NVIDIA Runtime" value={info.nvidia} />
                    </section>
                </div>
                {/* Right Column */}
                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Image & User</h3>
                        <DetailItem label="Image" value={info.image} isCode />
                        <DetailItem label="Entrypoint" value={info.entrypoint} isCode />
                        <DetailItem label="User" value={info.user_name} isCode />
                        <DetailItem label="Hostname" value={info.hostname} isCode />
                        <DetailItem label="Home Directory (in Container)" value={info.home_dir} isCode />
                    </section>
                    <section>
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-primary pb-2 mb-2">Mounted Volumes</h3>
                         <div className="text-xs text-gray-200 font-mono bg-primary-dark/50 rounded-lg p-3 h-48 overflow-y-auto">
                            {info.volumes && info.volumes.length > 0 ? (
                                <ul className="space-y-1">
                                    {info.volumes.map((vol, i) => <li key={i}>{vol}</li>)}
                                </ul>
                            ) : (
                                <p className="text-gray-500 normal-case">No custom volumes mounted.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        );
    }
    return null;
  }
  
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        className="bg-primary-light rounded-lg shadow-xl w-full max-w-4xl border border-primary flex flex-col"
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
        
        <main className="overflow-y-auto">
            {renderContent()}
        </main>

        <footer className="p-4 border-t border-primary flex justify-end flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </motion.button>
        </footer>
      </motion.div>
    </div>,
    modalRoot
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving || !imageName || !imageTag}
            className="px-6 py-2 bg-accent text-charcoal font-semibold rounded-lg hover:bg-accent-light transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Image'}
          </motion.button>
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
        <div className="flex items-start gap-4">
            <div className="w-8 h-8 text-red-500 flex-shrink-0 mt-1"><ExclamationTriangleIcon /></div>
            <div>
                <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
                <p className="text-gray-400 mt-4">{message}</p>
            </div>
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-2 bg-primary text-gray-200 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onConfirm(); onClose(); }}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon /> Delete
          </motion.button>
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

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; disabled: boolean; children: React.ReactNode; primary?: boolean; isStopButton?: boolean, icon?: React.ReactNode }> = ({ onClick, disabled, children, primary = false, isStopButton = false, icon }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    onClick={onClick}
    disabled={disabled}
    className={`w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
      ${primary ? 'bg-accent text-charcoal hover:bg-accent-light' : ''}
      ${isStopButton ? 'bg-red-600 text-white hover:bg-red-500' : ''}
      `}
  >
    {icon && !String(children).includes('...') && <span className="w-4 h-4">{icon}</span>}
    {children}
  </motion.button>
);

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
        variants={listItemVariants}
        className={`
            relative
            ${ isSelected
                ? 'z-10 my-1 bg-primary-light rounded-lg border-2 border-accent/70 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                : `z-0 border-b ${isLast ? 'border-transparent' : 'border-primary-light'}`
            }
        `}
    >
      <motion.div
        whileHover={!isSelected ? { y: -2, transition: { duration: 0.2 } } : {}}
        onClick={onSelect}
        className={`flex items-center p-4 cursor-pointer transition-colors duration-200
            ${ isSelected ? 'rounded-t-lg' : 'hover:bg-primary-light/50' }
        `}
      >
        <StatusIndicator status={container.status} />
        <DistroIcon identifier={container.image} className="w-10 h-10 mx-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-100 truncate">{container.name}</h3>
            {container.isIsolated && <ShieldCheckIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" title="Isolated Home Directory" />}
            {optimisticAutostartEnabled && <BoltIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" title="Autostart Enabled" />}
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate" title={container.image}>{container.image}</p>
        </div>
        <p className="flex-shrink-0 hidden md:block text-sm text-gray-400 mx-4 min-w-0 truncate" title={container.status}>{container.status}</p>
        <div className="flex-shrink-0">
          <ChevronDownIcon isSelected={isSelected} />
        </div>
      </motion.div>
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
            className="overflow-hidden bg-primary rounded-b-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-4 divide-y divide-primary-light">
                <div className="flex flex-wrap items-center justify-center pt-2 gap-4">
                    {isUp ? (
                        <ActionButton onClick={(e) => handleActionClick(e, 'stop')} disabled={isActionInProgress} isStopButton icon={<StopIcon />}>
                        {isActionInProgress ? '...' : 'Stop'}
                        </ActionButton>
                    ) : (
                        <ActionButton onClick={(e) => handleActionClick(e, 'start')} disabled={isActionInProgress} primary icon={<PlayIcon />}>
                        {isActionInProgress ? '...' : 'Start'}
                        </ActionButton>
                    )}
                     <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={(e) => handleEnterClick(e)}
                        disabled={isActionInProgress}
                        className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed bg-primary-light text-gray-200 hover:bg-gray-500"
                        title="Open a terminal in this container"
                    >
                        <CommandLineIcon className="w-4 h-4" />
                        Enter
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={() => setInfoModalOpen(true)}
                        className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-primary-light text-gray-200 hover:bg-gray-500"
                        title="Show detailed container information"
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                        Info
                    </motion.button>
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
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            onClick={() => setSaveImageModalOpen(true)}
                            disabled={isActionInProgress || !isUp}
                            title={!isUp ? "Container must be running to save it as an image." : "Save a snapshot of the running container"}
                            className="px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <ArchiveBoxArrowDownIcon /> Save as Image
                        </motion.button>
                    </div>
                     {!isUp && (
                        <p className="text-xs text-gray-400 text-right mt-1">
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
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={isActionInProgress}
                            className="px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <TrashIcon /> Delete
                        </motion.button>
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
      <motion.div 
        className="bg-primary rounded-lg shadow-md" 
        layout
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
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
        <h1 className="text-3xl font-bold text-gray-100 w-full md:w-auto">
          My Containers <span className="text-lg text-gray-400 font-normal">({containers.length})</span>
        </h1>
        
        <div className="flex-grow flex flex-col-reverse sm:flex-row justify-end items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
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
                 <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage('create-new')}
                    className="flex-1 sm:flex-none px-5 py-2 bg-primary-light text-gray-200 font-semibold rounded-lg hover:bg-accent hover:text-charcoal transition-all duration-200"
                >
                    Create
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchContainers(true)}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none px-5 py-2 bg-accent text-charcoal font-bold rounded-lg hover:bg-accent-light disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                    {isLoading ? <SpinnerIcon /> : <ArrowPathIcon />}
                    {isLoading ? '...' : 'Refresh'}
                </motion.button>
            </div>
        </div>
      </header>
      {renderContent()}
    </div>
  );
};

// --- SVG Icon Components ---
const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const ChevronDownIcon: React.FC<{ isSelected: boolean }> = ({ isSelected }) => <motion.svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400" animate={{ rotate: isSelected ? 180 : 0 }} transition={{ duration: 0.2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></motion.svg>;
const BoltIcon: React.FC<{ className?: string; title?: string; }> = ({ className, title }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>{title && <title>{title}</title>}<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const ShieldCheckIcon: React.FC<{ className?: string; title?: string; }> = ({ className, title }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>{title && <title>{title}</title>}<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;
const CommandLineIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>;
const InformationCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
const PlayIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>;
const StopIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25-2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>;
const TrashIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.036-2.134H8.716c-1.126 0-2.036.954-2.036 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const ArchiveBoxArrowDownIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const ExclamationTriangleIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;
const ArrowPathIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0 4.142-3.358 7.5-7.5 7.5S4.5 16.142 4.5 12 7.858 4.5 12 4.5c2.36 0 4.471.956 6.012 2.502m1.488-2.492v4.98h-4.98" /></svg>;
const SpinnerIcon: React.FC = () => <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

export default MyContainers;